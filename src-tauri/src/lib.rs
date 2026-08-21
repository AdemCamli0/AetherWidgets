mod crypto;
mod desktop;
mod persist;

use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{
    Emitter, Manager, PhysicalPosition, State, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};

/// (label, title, default_x, default_y, default_width, default_height).
///
/// The default positions form a pre-aligned template layout (three columns,
/// right-anchored on a 1920x1080 screen), used when a widget has no saved
/// position yet. Columns are stacked top-to-bottom with small gaps and never
/// overlap.
const WIDGETS: &[(&str, &str, i32, i32, u32, u32)] = &[
    ("clock", "AetherWidgets — Clock", 871, 4, 265, 280),
    ("weather", "AetherWidgets - Weather", 1144, 4, 410, 340),
    ("system", "AetherWidgets — System", 871, 630, 265, 300),
    ("calendar", "AetherWidgets — Calendar", 871, 292, 265, 330),
    ("notes", "AetherWidgets — Notes", 1144, 352, 400, 275),
    ("pomodoro", "AetherWidgets — Pomodoro", 1562, 512, 300, 425),
    ("crypto", "AetherWidgets — Crypto", 1562, 4, 350, 500),
];

/// Minimum inner size (logical pixels) for each widget window. Shared by the
/// window builder and the `get_widget_size_bounds` command so the resize UI
/// enforces the same limits.
fn widget_min_size(label: &str) -> (f64, f64) {
    match label {
        "clock" => (240.0, 180.0),
        "weather" => (320.0, 240.0),
        "system" => (260.0, 240.0),
        "calendar" => (240.0, 240.0),
        "notes" => (220.0, 200.0),
        "pomodoro" => (280.0, 300.0),
        "crypto" => (300.0, 380.0),
        _ => (200.0, 150.0),
    }
}

struct AppState {
    open_widgets: Mutex<HashMap<String, bool>>,
    layouts: Arc<persist::LayoutStore>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_notification::init())
        .manage(desktop::SystemMonitorState::new())
        .manage(crypto::CryptoState::new())
        .setup(|app| {
            // Load persisted widget layouts and start the debounced save watchdog.
            let layouts_path = app
                .path()
                .app_data_dir()
                .map(|dir| dir.join("widget-layouts.json"))
                .unwrap_or_else(|_| std::path::PathBuf::from("widget-layouts.json"));
            let layouts = Arc::new(persist::LayoutStore::load(layouts_path));
            layouts.clone().start_watchdog();
            app.manage(AppState {
                open_widgets: Mutex::new(HashMap::new()),
                layouts,
            });

            // Install the Win+D / "Show desktop" survival hook so widget
            // windows stay visible when the desktop is shown. Must run on the
            // main thread; `setup` already does.
            desktop::install_desktop_hooks();

            // System tray: right-click menu for widget management.
            let control_panel_item =
                MenuItem::with_id(app, "control_panel", "Control Panel", true, None::<&str>)?;
            let bring_to_front_item = MenuItem::with_id(
                app,
                "bring_to_front",
                "Bring Widgets to Front",
                true,
                None::<&str>,
            )?;
            let quit_item = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(
                app,
                &[&control_panel_item, &bring_to_front_item, &quit_item],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("no default icon").clone())
                .menu(&tray_menu)
                .tooltip("AetherWidgets")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "control_panel" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                    "bring_to_front" => {
                        desktop::raise_widgets_to_front();
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop::get_widget_position,
            desktop::set_widget_position,
            desktop::quit_app,
            desktop::get_system_stats,
            desktop::open_task_manager,
            crypto::get_crypto_prices,
            crypto::get_crypto_catalog,
            open_widget,
            close_widget,
            get_open_widgets,
            get_widget_rects,
            get_widget_size_bounds,
            apply_widget_layouts,
            set_widget_blur,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AetherWidgets");
}

/// Opens a widget window by label.
///
/// NOTE: must be `async` — on Windows, creating a window from a synchronous
/// command deadlocks the WebView2 runtime (documented Tauri limitation).
#[tauri::command]
async fn open_widget<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, AppState>,
    label: &str,
) -> Result<(), String> {
    eprintln!("[AetherWidgets] open_widget called: {label}");
    // Check if already open
    {
        let widgets = state.open_widgets.lock().map_err(|e| e.to_string())?;
        if widgets.get(label).copied().unwrap_or(false) {
            // Already open, just show and focus
            if let Some(win) = app.get_webview_window(label) {
                win.show().map_err(|e| e.to_string())?;
                win.set_focus().map_err(|e| e.to_string())?;
            }
            return Ok(());
        }
    }

    // Find widget config
    let (_, title, default_x, default_y, width, height) = WIDGETS
        .iter()
        .find(|(l, _, _, _, _, _)| *l == label)
        .ok_or_else(|| format!("Unknown widget: {label}"))?;

    // Restore the saved layout (size now, position after the window exists).
    let saved_layout = state.layouts.get(label);
    let (init_w, init_h) = saved_layout
        .map(|l| (l.width, l.height))
        .unwrap_or((*width, *height));

    // Create new window
    eprintln!("[AetherWidgets] building window for {label} ({init_w}x{init_h})");
    let mut builder = WebviewWindowBuilder::new(&app, label, WebviewUrl::App("index.html".into()))
        .title(*title)
        .inner_size(init_w as f64, init_h as f64)
        .decorations(false)
        .transparent(true)
        .always_on_top(false)
        .skip_taskbar(true)
        .focusable(true);

    // All widget windows are resizable; give each a sensible minimum size.
    let (min_w, min_h) = widget_min_size(label);
    builder = builder.resizable(true).min_inner_size(min_w, min_h);

    let window = builder.build().map_err(|e| {
        eprintln!("[AetherWidgets] FAILED to build window {label}: {e}");
        e.to_string()
    })?;
    eprintln!("[AetherWidgets] window built OK: {label}");

    // Open at the saved position if there is one, otherwise at the template
    // default position. Either is only applied if it is still on a connected
    // monitor (the saved monitor may have been unplugged).
    let (target_x, target_y) = saved_layout
        .map(|l| (l.x, l.y))
        .unwrap_or((*default_x, *default_y));
    let on_screen = app
        .available_monitors()
        .map(|monitors| {
            monitors.iter().any(|m| {
                let pos = m.position();
                let size = m.size();
                target_x >= pos.x
                    && target_y >= pos.y
                    && target_x < pos.x + size.width as i32
                    && target_y < pos.y + size.height as i32
            })
        })
        .unwrap_or(true);
    if on_screen {
        let _ = window.set_position(PhysicalPosition::new(target_x, target_y));
    }

    // Persist position/size changes; the watchdog flushes them to disk.
    let layouts = state.layouts.clone();
    let widget_label = label.to_string();
    window.on_window_event(move |event| match event {
        WindowEvent::Moved(pos) => {
            layouts.update(&widget_label, |l| {
                l.x = pos.x;
                l.y = pos.y;
            });
        }
        WindowEvent::Resized(size) if size.width > 0 && size.height > 0 => {
            layouts.update(&widget_label, |l| {
                l.width = size.width;
                l.height = size.height;
            });
        }
        _ => {}
    });

    // Embed the widget into the desktop layer (tool-window style, Win+D
    // immunity, bottom z-order) and track its HWND so the Win+D hook keeps
    // it visible and the tray "Bring Widgets to Front" action can raise it.
    // All window-style/subclass operations run on the main thread inside.
    if let Err(e) = desktop::register_widget_hwnd(&window) {
        eprintln!("[AetherWidgets] failed to register HWND for {label}: {e}");
    }

    // Apply the native acrylic backdrop (blur defaults to on). The frontend
    // re-syncs the stored per-widget blur preference on load and clears it if
    // the user disabled blur for this widget.
    desktop::apply_widget_blur(&window, true);

    // Mark as open
    {
        let mut widgets = state.open_widgets.lock().map_err(|e| e.to_string())?;
        widgets.insert(label.to_string(), true);
    }

    // Notify the control panel so its toggle state stays in sync.
    let _ = app.emit("widgets-changed", ());

    Ok(())
}

/// Closes a widget window by label.
#[tauri::command]
async fn close_widget<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, AppState>,
    label: &str,
) -> Result<(), String> {
    eprintln!("[AetherWidgets] close_widget called: {label}");
    // Mark as closed
    {
        let mut widgets = state.open_widgets.lock().map_err(|e| e.to_string())?;
        widgets.insert(label.to_string(), false);
    }

    // Flush any pending layout changes before the window goes away.
    state.layouts.flush();

    if let Some(win) = app.get_webview_window(label) {
        // Stop tracking the HWND before closing it.
        desktop::unregister_widget_hwnd(&win);
        win.close().map_err(|e| e.to_string())?;
    }

    // Notify the control panel so its toggle state stays in sync.
    let _ = app.emit("widgets-changed", ());

    Ok(())
}

/// Enables or disables the native Windows acrylic blur backdrop for a widget
/// window. Widget windows are transparent (see `open_widget`), so the acrylic
/// backdrop shows through the semi-transparent widget background, blurring the
/// desktop behind it. No-op on unsupported platforms/Windows versions.
#[tauri::command]
async fn set_widget_blur<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    label: &str,
    enabled: bool,
) -> Result<(), String> {
    let win = app
        .get_webview_window(label)
        .ok_or_else(|| format!("Window not found: {label}"))?;
    desktop::apply_widget_blur(&win, enabled);
    Ok(())
}

/// Returns the list of currently open widgets.
#[tauri::command]
async fn get_open_widgets(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    eprintln!("[AetherWidgets] get_open_widgets called");
    let widgets = state.open_widgets.lock().map_err(|e| e.to_string())?;
    Ok(widgets
        .iter()
        .filter(|(_, &open)| open)
        .map(|(label, _)| label.clone())
        .collect())
}

/// Rectangle of an open widget window in logical pixels.
#[derive(serde::Serialize)]
struct WidgetRect {
    label: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

/// Returns the logical-pixel rectangles of all open widget windows.
///
/// Used by the frontend for widget-to-widget snapping while dragging: the
/// dragged widget aligns its edges/centers against these rectangles.
#[tauri::command]
async fn get_widget_rects<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, AppState>,
) -> Result<Vec<WidgetRect>, String> {
    let labels: Vec<String> = {
        let widgets = state.open_widgets.lock().map_err(|e| e.to_string())?;
        widgets
            .iter()
            .filter(|(_, &open)| open)
            .map(|(label, _)| label.clone())
            .collect()
    };

    let mut rects = Vec::new();
    for label in labels {
        let Some(win) = app.get_webview_window(&label) else {
            continue;
        };
        let Ok(scale) = win.scale_factor() else {
            continue;
        };
        let Ok(pos) = win.outer_position() else {
            continue;
        };
        let Ok(size) = win.inner_size() else {
            continue;
        };
        let pos = pos.to_logical::<i32>(scale);
        let size = size.to_logical::<u32>(scale);
        rects.push(WidgetRect {
            label,
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
        });
    }
    Ok(rects)
}

/// Size limits and default size for a widget window (logical pixels).
#[derive(serde::Serialize)]
struct WidgetSizeBounds {
    min_width: u32,
    min_height: u32,
    max_width: u32,
    max_height: u32,
    default_width: u32,
    default_height: u32,
}

/// Returns the min/max/default size for a widget window.
///
/// The maximum is the size of the monitor the widget is currently on (or the
/// primary monitor), so a widget can never be resized beyond its screen.
#[tauri::command]
async fn get_widget_size_bounds<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    label: &str,
) -> Result<WidgetSizeBounds, String> {
    let (_, _, _, _, default_width, default_height) = WIDGETS
        .iter()
        .find(|(l, _, _, _, _, _)| *l == label)
        .ok_or_else(|| format!("Unknown widget: {label}"))?;
    let (min_w, min_h) = widget_min_size(label);

    let window = app.get_webview_window(label);
    let monitor = window
        .as_ref()
        .and_then(|w| w.current_monitor().ok().flatten())
        .or_else(|| app.primary_monitor().ok().flatten());
    let (max_width, max_height) = monitor
        .map(|m| {
            let size = m.size().to_logical::<u32>(m.scale_factor());
            (size.width, size.height)
        })
        .unwrap_or((1920, 1080));

    Ok(WidgetSizeBounds {
        min_width: min_w as u32,
        min_height: min_h as u32,
        max_width,
        max_height,
        default_width: *default_width,
        default_height: *default_height,
    })
}

/// A single widget layout in logical pixels, as sent by the frontend.
#[derive(serde::Deserialize)]
struct LayoutEntry {
    label: String,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

/// Applies a batch of widget layouts (logical pixels) at once, e.g. a layout
/// template chosen in the control panel.
///
/// Open widget windows are moved/resized directly; the resulting
/// `WindowEvent::Moved`/`Resized` events are persisted by the handlers
/// installed in `open_widget`. Layouts for widgets that are not currently
/// open are written straight to the layout store (converting to physical
/// pixels) so they are restored the next time the widget opens.
#[tauri::command]
async fn apply_widget_layouts<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: State<'_, AppState>,
    layouts: Vec<LayoutEntry>,
) -> Result<(), String> {
    // Scale factor used when persisting layouts for closed widgets (the store
    // keeps physical pixels). Fall back to 1.0 if no monitor is available.
    let scale = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| m.scale_factor())
        .unwrap_or(1.0);

    for entry in layouts {
        if let Some(win) = app.get_webview_window(&entry.label) {
            win.set_position(tauri::LogicalPosition::new(entry.x, entry.y))
                .map_err(|e| e.to_string())?;
            win.set_size(tauri::LogicalSize::new(entry.width, entry.height))
                .map_err(|e| e.to_string())?;
        } else {
            let phys_x = (f64::from(entry.x) * scale).round() as i32;
            let phys_y = (f64::from(entry.y) * scale).round() as i32;
            let phys_w = (f64::from(entry.width) * scale).round() as u32;
            let phys_h = (f64::from(entry.height) * scale).round() as u32;
            state.layouts.update(&entry.label, |l| {
                l.x = phys_x;
                l.y = phys_y;
                l.width = phys_w;
                l.height = phys_h;
            });
        }
    }

    // Make sure closed-widget layout changes reach disk promptly.
    state.layouts.flush();

    Ok(())
}
