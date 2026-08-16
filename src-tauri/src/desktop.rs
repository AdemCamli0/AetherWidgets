//! Windows desktop integration: keeps widget windows pinned to the desktop
//! layer (behind icons, above wallpaper) while remaining interactive.
//!
//! Instead of reparenting into WorkerW (which breaks WebView2 input), we:
//! 1. Mark the window as a no-activate tool window (no taskbar, no focus steal)
//! 2. Pin it to the bottom of the z-order
//! 3. Re-assert bottom position whenever the z-order changes

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Manager, Runtime, WebviewWindow};

#[cfg(windows)]
use windows::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, WPARAM},
    System::Threading::GetCurrentProcessId,
    UI::Accessibility::{SetWinEventHook, HWINEVENTHOOK},
    UI::WindowsAndMessaging::{
        CallWindowProcW, DefWindowProcW, GetForegroundWindow, GetWindowLongPtrW, IsIconic,
        IsWindow, SetWindowLongPtrW, SetWindowPos, ShowWindow, EVENT_SYSTEM_MINIMIZESTART,
        GWL_EXSTYLE, GWL_STYLE, GWL_WNDPROC, HWND_BOTTOM, HWND_TOP, SC_MINIMIZE, SWP_NOACTIVATE,
        SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SW_SHOWNOACTIVATE, WA_INACTIVE, WINDOWPOS,
        WINEVENT_OUTOFCONTEXT, WM_ACTIVATE, WM_SIZE, WM_SYSCOMMAND, WM_WINDOWPOSCHANGING,
        WS_EX_LAYERED, WS_EX_TOOLWINDOW, WS_MINIMIZEBOX,
    },
};

/// Labels of all widget windows (kept in sync with `WIDGETS` in `lib.rs`).
pub const WIDGET_LABELS: &[&str] = &[
    "clock", "weather", "system", "calendar", "notes", "pomodoro", "crypto",
];

/// When true, widgets are raised above normal windows (topmost) instead of
/// being pinned to the bottom of the z-order.
static WIDGETS_RAISED: AtomicBool = AtomicBool::new(false);

/// HWNDs of widget windows embedded into the desktop layer. The Win+D restore
/// hook uses this to know which windows to keep visible.
#[cfg(windows)]
static EMBEDDED_HWNDS: Mutex<Vec<isize>> = Mutex::new(Vec::new());

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

/// Previous window procedures, stored per-widget for the subclass chain.
/// Keyed by window handle (HWND as isize) to support multiple widgets.
#[cfg(windows)]
#[allow(dead_code)]
static PREV_WNDPROCS: Mutex<
    Option<HashMap<isize, windows::Win32::UI::WindowsAndMessaging::WNDPROC>>,
> = Mutex::new(None);

/// Subclass procedure that keeps the widget pinned to the bottom of the
/// z-order whenever Windows tries to reorder it, and blocks minimization so
/// the widget survives Win+D / "Show desktop".
///
/// NOTE: only installed by `embed_into_desktop`, which is currently disabled
/// (white-window bug). Kept for the future safe re-enable on the main thread.
#[cfg(windows)]
#[allow(dead_code)]
unsafe extern "system" fn widget_wndproc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    // Block minimization (Win+D / "Show desktop") so widgets stay visible.
    if msg == WM_SYSCOMMAND && (wparam.0 & 0xFFF0) == SC_MINIMIZE as usize {
        return LRESULT(0);
    }

    // Auto-lower: when a raised widget loses activation to a non-widget
    // window, send all widgets back to the desktop layer.
    if msg == WM_ACTIVATE
        && WIDGETS_RAISED.load(Ordering::SeqCst)
        && (wparam.0 & 0xFFFF) as u32 == WA_INACTIVE
    {
        let foreground = GetForegroundWindow();
        let over_widget = {
            let list = EMBEDDED_HWNDS.lock().unwrap();
            list.contains(&(foreground.0 as isize))
        };
        if !over_widget {
            lower_widgets_to_desktop();
        }
    }

    if msg == WM_WINDOWPOSCHANGING {
        let pos = &mut *(lparam.0 as *mut WINDOWPOS);
        // Keep the pinned z-order: top while raised, bottom otherwise.
        pos.hwndInsertAfter = if WIDGETS_RAISED.load(Ordering::SeqCst) {
            HWND_TOP
        } else {
            HWND_BOTTOM
        };
    }

    let hwnd_key = hwnd.0 as isize;
    let prev = {
        let map = PREV_WNDPROCS.lock().unwrap();
        map.as_ref().and_then(|m| m.get(&hwnd_key).copied())
    };

    match prev {
        Some(Some(prev_fn)) => CallWindowProcW(Some(prev_fn), hwnd, msg, wparam, lparam),
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// Pins the widget window to the desktop layer: bottom of z-order,
/// no taskbar entry, no focus stealing. The window stays fully interactive.
///
/// WARNING: currently unused — calling this from a command worker thread
/// caused white windows and UI freezes. Must be re-run on the main thread.
#[cfg(windows)]
#[allow(dead_code)]
pub fn embed_into_desktop<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let widget_hwnd = HWND(hwnd.0);
    let hwnd_key = hwnd.0 as isize;

    unsafe {
        // 1. Extended styles: tool window (no taskbar) + layered (transparency).
        //    NOTE: WS_EX_NOACTIVATE is intentionally NOT set — it breaks
        //    WebView2 input handling (drag, click) for desktop widgets.
        let ex_style = GetWindowLongPtrW(widget_hwnd, GWL_EXSTYLE) as u32;
        SetWindowLongPtrW(
            widget_hwnd,
            GWL_EXSTYLE,
            (ex_style | WS_EX_TOOLWINDOW.0 | WS_EX_LAYERED.0) as isize,
        );

        // 2. Pin to the bottom of the z-order (above wallpaper, below icons).
        SetWindowPos(
            widget_hwnd,
            Some(HWND_BOTTOM),
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
        )
        .map_err(|e| format!("SetWindowPos failed: {e}"))?;

        // 3. Subclass the window to re-assert bottom z-order on changes.
        //    Store the previous WNDPROC per-window to support multiple widgets.
        let prev = SetWindowLongPtrW(
            widget_hwnd,
            GWL_WNDPROC,
            widget_wndproc as *const () as isize,
        );
        if prev != 0 {
            let mut map = PREV_WNDPROCS.lock().unwrap();
            let map = map.get_or_insert_with(HashMap::new);
            map.insert(
                hwnd_key,
                Some(std::mem::transmute::<
                    isize,
                    unsafe extern "system" fn(HWND, u32, WPARAM, LPARAM) -> LRESULT,
                >(prev)),
            );
        }
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn embed_into_desktop<R: Runtime>(_window: &WebviewWindow<R>) -> Result<(), String> {
    Err("desktop embedding is only supported on Windows".to_string())
}

/// Registers a widget window's HWND so the Win+D restore hook knows to keep
/// it visible, and installs the minimize-guard subclass on the main thread so
/// the widget survives Win+D / "Show desktop". Call after the window is created.
#[cfg(windows)]
pub fn register_widget_hwnd<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let key = hwnd.0 as isize;
    {
        let mut list = EMBEDDED_HWNDS.lock().unwrap();
        if !list.contains(&key) {
            list.push(key);
        }
    }

    // Make the window immune to Win+D (remove WS_MINIMIZEBOX) and install the
    // minimize-guard subclass. Both must run on the main thread — doing them
    // from a command worker thread caused white windows / UI freezes.
    let app = window.app_handle().clone();
    let _ = app.run_on_main_thread(move || {
        remove_minimize_box_raw(key);
        install_minimize_guard_raw(key);
    });

    Ok(())
}

/// Removes a widget window's HWND from the restore-hook tracking list and
/// restores the original window procedure so no stale subclass pointer remains.
#[cfg(windows)]
pub fn unregister_widget_hwnd<R: Runtime>(window: &WebviewWindow<R>) {
    if let Ok(hwnd) = window.hwnd() {
        let key = hwnd.0 as isize;
        {
            let mut list = EMBEDDED_HWNDS.lock().unwrap();
            list.retain(|&h| h != key);
        }

        // Restore the previous wndproc on the main thread and drop the entry.
        let app = window.app_handle().clone();
        let _ = app.run_on_main_thread(move || {
            let prev = {
                let mut map = PREV_WNDPROCS.lock().unwrap();
                map.as_mut().and_then(|m| m.remove(&key))
            };
            if let Some(Some(prev_fn)) = prev {
                let widget_hwnd = HWND(key as *mut _);
                unsafe {
                    if IsWindow(Some(widget_hwnd)).as_bool() {
                        SetWindowLongPtrW(widget_hwnd, GWL_WNDPROC, prev_fn as usize as isize);
                    }
                }
            }
        });
    }
}

#[cfg(not(windows))]
pub fn register_widget_hwnd<R: Runtime>(_window: &WebviewWindow<R>) -> Result<(), String> {
    Ok(())
}

#[cfg(not(windows))]
pub fn unregister_widget_hwnd<R: Runtime>(_window: &WebviewWindow<R>) {}

/// Minimal subclass that ONLY blocks minimization so widgets survive Win+D /
/// "Show desktop". Unlike `widget_wndproc`, it does not touch the z-order, so
/// it coexists with the per-widget always-on-top pinning.
#[cfg(windows)]
unsafe extern "system" fn minimize_guard_proc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    // Swallow minimize requests so the widget stays visible.
    if msg == WM_SYSCOMMAND && (wparam.0 & 0xFFF0) == SC_MINIMIZE as usize {
        return LRESULT(0);
    }

    // Catch-all: Win+D / "Show desktop" (and any programmatic minimize)
    // bypasses WM_SYSCOMMAND and instead delivers WM_SIZE with
    // SIZE_MINIMIZED. Restore immediately so the widget survives regardless
    // of how the minimize was triggered. SW_SHOWNOACTIVATE restores without
    // stealing focus, and does not force a z-order so per-widget pinning is
    // respected.
    const SIZE_MINIMIZED: usize = 1;
    if msg == WM_SIZE && wparam.0 == SIZE_MINIMIZED {
        let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
        return LRESULT(0);
    }

    let hwnd_key = hwnd.0 as isize;
    let prev = {
        let map = PREV_WNDPROCS.lock().unwrap();
        map.as_ref().and_then(|m| m.get(&hwnd_key).copied())
    };

    match prev {
        Some(Some(prev_fn)) => CallWindowProcW(Some(prev_fn), hwnd, msg, wparam, lparam),
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// Installs the minimize-guard subclass on a widget window. Takes the raw HWND
/// (as `isize`) so it can be sent to the main thread. Must run on the main
/// thread to avoid WebView2 issues.
#[cfg(windows)]
pub fn install_minimize_guard_raw(hwnd_key: isize) {
    let widget_hwnd = HWND(hwnd_key as *mut _);
    unsafe {
        if !IsWindow(Some(widget_hwnd)).as_bool() {
            return;
        }
        let prev = SetWindowLongPtrW(
            widget_hwnd,
            GWL_WNDPROC,
            minimize_guard_proc as *const () as isize,
        );
        if prev != 0 {
            let mut map = PREV_WNDPROCS.lock().unwrap();
            let map = map.get_or_insert_with(HashMap::new);
            map.insert(
                hwnd_key,
                Some(std::mem::transmute::<
                    isize,
                    unsafe extern "system" fn(HWND, u32, WPARAM, LPARAM) -> LRESULT,
                >(prev)),
            );
        }
    }
}

#[cfg(not(windows))]
pub fn install_minimize_guard_raw(_hwnd_key: isize) {}

/// Removes the `WS_MINIMIZEBOX` style from a widget window so Windows treats
/// it as "not minimizable". Per Microsoft docs (Raymond Chen, The Old New
/// Thing), Win+D / "Show desktop" only minimizes windows that can be minimized
/// (i.e. that carry `WS_MINIMIZEBOX`); clearing the bit makes the widget
/// immune to Win+D while leaving resizing (`WS_THICKFRAME`) and always-on-top
/// (`WS_EX_TOPMOST`) untouched. Must run on the main thread.
#[cfg(windows)]
pub fn remove_minimize_box_raw(hwnd_key: isize) {
    let widget_hwnd = HWND(hwnd_key as *mut _);
    unsafe {
        if !IsWindow(Some(widget_hwnd)).as_bool() {
            return;
        }
        let style = GetWindowLongPtrW(widget_hwnd, GWL_STYLE) as u32;
        if style & WS_MINIMIZEBOX.0 != 0 {
            SetWindowLongPtrW(widget_hwnd, GWL_STYLE, (style & !WS_MINIMIZEBOX.0) as isize);
        }
    }
}

#[cfg(not(windows))]
pub fn remove_minimize_box_raw(_hwnd_key: isize) {}

/// WinEvent hook callback. When the user triggers "Show desktop" (Win+D or
/// the taskbar button), Windows minimizes all windows including ours. This
/// hook fires on EVENT_SYSTEM_MINIMIZESTART. Because the minimize completes
/// AFTER this event, restoring immediately gets overridden — so we restore on
/// a short delay from a background thread.
#[cfg(windows)]
unsafe extern "system" fn minimize_hook(
    _hook: HWINEVENTHOOK,
    event: u32,
    _hwnd: HWND,
    _id_object: i32,
    _id_child: i32,
    _event_thread: u32,
    _event_time: u32,
) {
    if event != EVENT_SYSTEM_MINIMIZESTART {
        return;
    }

    let hwnds: Vec<isize> = {
        let list = EMBEDDED_HWNDS.lock().unwrap();
        list.clone()
    };
    if hwnds.is_empty() {
        return;
    }

    // Restore after the desktop-show minimize settles. Poll for up to ~1.5 s:
    // whenever a tracked window is still minimized (IsIconic), re-show it.
    // This covers slow systems where the minimize animation lags behind the
    // event. No z-order forcing here so a widget's always-on-top pin (if set)
    // is respected.
    std::thread::spawn(move || {
        let deadline = std::time::Instant::now() + std::time::Duration::from_millis(1500);
        while std::time::Instant::now() < deadline {
            std::thread::sleep(std::time::Duration::from_millis(75));
            for &key in &hwnds {
                let hwnd = HWND(key as *mut _);
                unsafe {
                    if !IsWindow(Some(hwnd)).as_bool() {
                        continue;
                    }
                    if IsIconic(hwnd).as_bool() {
                        let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
                    }
                }
            }
        }
    });
}

/// Installs the Win+D / "Show desktop" survival hook. Must be called once
/// from the main thread during app setup.
#[cfg(windows)]
pub fn install_desktop_hooks() {
    unsafe {
        let pid = GetCurrentProcessId();
        SetWinEventHook(
            EVENT_SYSTEM_MINIMIZESTART,
            EVENT_SYSTEM_MINIMIZESTART,
            None,
            Some(minimize_hook),
            pid,
            0,
            WINEVENT_OUTOFCONTEXT,
        );
    }

    // Belt-and-braces: some shell paths (notably Win+D) minimize windows
    // without firing the event hook or `WM_SYSCOMMAND`, so also run a light
    // watchdog that restores any tracked widget that ends up minimized.
    start_minimize_watchdog();
}

/// Background watchdog that keeps widget windows visible. Polls the tracked
/// widget HWNDs every ~150 ms and restores any that got minimized (e.g. by
/// Win+D / "Show desktop"). A handful of `IsIconic` calls per tick is
/// negligible; runs for the lifetime of the app.
#[cfg(windows)]
fn start_minimize_watchdog() {
    std::thread::spawn(|| loop {
        std::thread::sleep(std::time::Duration::from_millis(150));
        let hwnds: Vec<isize> = {
            let list = EMBEDDED_HWNDS.lock().unwrap();
            list.clone()
        };
        for key in hwnds {
            let hwnd = HWND(key as *mut _);
            unsafe {
                if !IsWindow(Some(hwnd)).as_bool() {
                    continue;
                }
                if IsIconic(hwnd).as_bool() {
                    let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
                }
            }
        }
    });
}

#[cfg(not(windows))]
pub fn install_desktop_hooks() {}

/// Raises all widget windows above normal windows (bring-to-front).
/// While raised, the subclassed wndproc keeps them at the top of the z-order
/// instead of the bottom.
#[cfg(windows)]
pub fn raise_widgets_to_front() {
    WIDGETS_RAISED.store(true, Ordering::SeqCst);

    let hwnds: Vec<isize> = {
        let list = EMBEDDED_HWNDS.lock().unwrap();
        list.clone()
    };

    for key in hwnds {
        let hwnd = HWND(key as *mut _);
        unsafe {
            if !IsWindow(Some(hwnd)).as_bool() {
                continue;
            }
            let _ = ShowWindow(hwnd, SW_SHOWNOACTIVATE);
            let _ = SetWindowPos(
                hwnd,
                Some(HWND_TOP),
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
            );
        }
    }
}

#[cfg(not(windows))]
pub fn raise_widgets_to_front() {}

/// Returns widgets to their normal desktop-layer position (bottom of z-order).
///
/// NOTE: only invoked from `widget_wndproc` (auto-lower), which is dormant
/// while desktop embedding is disabled. Kept for future re-enable.
#[cfg(windows)]
#[allow(dead_code)]
pub fn lower_widgets_to_desktop() {
    WIDGETS_RAISED.store(false, Ordering::SeqCst);

    let hwnds: Vec<isize> = {
        let list = EMBEDDED_HWNDS.lock().unwrap();
        list.clone()
    };

    for key in hwnds {
        let hwnd = HWND(key as *mut _);
        unsafe {
            if !IsWindow(Some(hwnd)).as_bool() {
                continue;
            }
            let _ = SetWindowPos(
                hwnd,
                Some(HWND_BOTTOM),
                0,
                0,
                0,
                0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE | SWP_SHOWWINDOW,
            );
        }
    }
}

#[cfg(not(windows))]
pub fn lower_widgets_to_desktop() {}

/// Returns the widget window's current outer position.
#[tauri::command]
pub fn get_widget_position<R: Runtime>(window: WebviewWindow<R>) -> Result<WidgetPosition, String> {
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    Ok(WidgetPosition { x: pos.x, y: pos.y })
}

/// Exits the application gracefully: hides all windows first, then exits.
/// This prevents Windows shell (explorer.exe) from being affected by a
/// sudden window destruction.
#[tauri::command]
pub async fn quit_app<R: Runtime>(app: tauri::AppHandle<R>) {
    eprintln!("[AetherWidgets] quit_app called");
    // Hide all widget windows
    for label in WIDGET_LABELS {
        if let Some(win) = app.get_webview_window(label) {
            let _ = win.hide();
        }
    }
    // Hide main window
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
    // Give windows a moment to hide before exiting.
    std::thread::sleep(std::time::Duration::from_millis(100));
    app.exit(0);
}

/// Moves the widget window to the given logical position.
#[tauri::command]
pub fn set_widget_position<R: Runtime>(
    window: WebviewWindow<R>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    window
        .set_position(tauri::LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())
}

/// Real system statistics using sysinfo crate.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub memory_used: u64,
    pub memory_total: u64,
    pub disk_used: u64,
    pub disk_total: u64,
    pub uptime: u64,
    pub cpu_temp: Option<f32>,
    pub gpu_temp: Option<f32>,
}

/// Shared system info instance — sysinfo requires the same `System` to be
/// refreshed repeatedly for accurate CPU usage deltas.
pub struct SystemMonitorState {
    pub sys: Mutex<sysinfo::System>,
}

impl SystemMonitorState {
    pub fn new() -> Self {
        let mut sys = sysinfo::System::new_all();
        // Prime the CPU counters: first refresh gives meaningless values,
        // so refresh twice with the minimum interval in between.
        sys.refresh_cpu_all();
        std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
        sys.refresh_cpu_all();
        Self {
            sys: Mutex::new(sys),
        }
    }
}

/// Returns real system statistics (CPU, RAM, disk, uptime, temperatures).
#[tauri::command]
pub async fn get_system_stats(
    state: tauri::State<'_, SystemMonitorState>,
) -> Result<SystemStats, String> {
    use sysinfo::{Components, Disks, System};

    let (cpu_usage, memory_used, memory_total) = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_cpu_all();
        sys.refresh_memory();
        (
            sys.global_cpu_usage(),
            sys.used_memory(),
            sys.total_memory(),
        )
    };

    // Disk (first disk, usually C:)
    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = if let Some(disk) = disks.list().first() {
        let total = disk.total_space();
        let available = disk.available_space();
        (total - available, total)
    } else {
        (0, 0)
    };

    // Uptime in seconds
    let uptime = System::uptime();

    // Temperature sensors (may be empty on Windows without admin rights)
    let components = Components::new_with_refreshed_list();
    let mut cpu_temp: Option<f32> = None;
    let mut gpu_temp: Option<f32> = None;
    for component in components.list() {
        let label = component.label().to_lowercase();
        let Some(temp) = component.temperature() else {
            continue;
        };
        if (label.contains("cpu") || label.contains("package") || label.contains("tctl"))
            && cpu_temp.is_none_or(|current| temp > current)
        {
            cpu_temp = Some(temp);
        } else if (label.contains("gpu") || label.contains("nvidia") || label.contains("radeon"))
            && gpu_temp.is_none_or(|current| temp > current)
        {
            gpu_temp = Some(temp);
        }
    }

    Ok(SystemStats {
        cpu_usage,
        memory_used,
        memory_total,
        disk_used,
        disk_total,
        uptime,
        cpu_temp,
        gpu_temp,
    })
}

/// Opens Windows Task Manager.
#[tauri::command]
pub async fn open_task_manager() -> Result<(), String> {
    std::process::Command::new("taskmgr")
        .spawn()
        .map_err(|e| format!("Task Manager could not be opened: {e}"))?;
    Ok(())
}
