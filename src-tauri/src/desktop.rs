//! Windows desktop integration: keeps widget windows pinned to the desktop
//! layer (behind icons, above wallpaper) while remaining interactive.
//!
//! Instead of reparenting into WorkerW (which breaks WebView2 input), we:
//! 1. Mark the window as a no-activate tool window (no taskbar, no focus steal)
//! 2. Pin it to the bottom of the z-order
//! 3. Re-assert bottom position whenever the z-order changes

use serde::{Deserialize, Serialize};
use tauri::{Manager, Runtime, WebviewWindow};

#[cfg(windows)]
use windows::Win32::{
    Foundation::{HWND, LPARAM, LRESULT, WPARAM},
    UI::WindowsAndMessaging::{
        CallWindowProcW, DefWindowProcW, GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos,
        GWL_EXSTYLE, GWL_WNDPROC, HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
        SWP_SHOWWINDOW, WINDOWPOS, WM_WINDOWPOSCHANGING, WS_EX_LAYERED, WS_EX_TOOLWINDOW,
    },
};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

/// Previous window procedure, stored per-widget for the subclass chain.
/// WNDPROC is itself Option<unsafe extern "system" fn(...) -> LRESULT>.
#[cfg(windows)]
static mut PREV_WNDPROC: windows::Win32::UI::WindowsAndMessaging::WNDPROC = None;

/// Subclass procedure that keeps the widget pinned to the bottom of the
/// z-order whenever Windows tries to reorder it.
#[cfg(windows)]
unsafe extern "system" fn widget_wndproc(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    if msg == WM_WINDOWPOSCHANGING {
        let pos = &mut *(lparam.0 as *mut WINDOWPOS);
        // Force the window to stay at the bottom of the z-order.
        pos.hwndInsertAfter = HWND_BOTTOM;
    }

    #[allow(static_mut_refs)]
    match PREV_WNDPROC {
        Some(prev) => CallWindowProcW(Some(prev), hwnd, msg, wparam, lparam),
        None => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// Pins the widget window to the desktop layer: bottom of z-order,
/// no taskbar entry, no focus stealing. The window stays fully interactive.
#[cfg(windows)]
pub fn embed_into_desktop<R: Runtime>(window: &WebviewWindow<R>) -> Result<(), String> {
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let widget_hwnd = HWND(hwnd.0);

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
        #[allow(static_mut_refs)]
        if PREV_WNDPROC.is_none() {
            let prev = SetWindowLongPtrW(
                widget_hwnd,
                GWL_WNDPROC,
                widget_wndproc as *const () as isize,
            );
            if prev != 0 {
                PREV_WNDPROC = Some(std::mem::transmute::<
                    isize,
                    unsafe extern "system" fn(HWND, u32, WPARAM, LPARAM) -> LRESULT,
                >(prev));
            }
        }
    }

    Ok(())
}

#[cfg(not(windows))]
pub fn embed_into_desktop<R: Runtime>(_window: &WebviewWindow<R>) -> Result<(), String> {
    Err("desktop embedding is only supported on Windows".to_string())
}

/// Returns the widget window's current outer position.
#[tauri::command]
pub fn get_widget_position<R: Runtime>(window: WebviewWindow<R>) -> Result<WidgetPosition, String> {
    let pos = window.outer_position().map_err(|e| e.to_string())?;
    Ok(WidgetPosition { x: pos.x, y: pos.y })
}

/// Exits the application gracefully: hides the window first, then exits.
/// This prevents Windows shell (explorer.exe) from being affected by a
/// sudden window destruction.
#[tauri::command]
pub fn quit_app<R: Runtime>(app: tauri::AppHandle<R>) {
    if let Some(win) = app.get_webview_window("clock") {
        let _ = win.hide();
    }
    // Give the window a moment to hide before exiting.
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
