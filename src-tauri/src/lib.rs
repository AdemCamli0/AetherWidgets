mod crypto;
mod desktop;

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

const WIDGETS: &[(&str, &str, u32, u32)] = &[
    ("clock", "AetherWidgets — Clock", 320, 160),
    ("weather", "AetherWidgets - Weather", 440, 305),
    ("system", "AetherWidgets — System", 300, 250),
    ("calendar", "AetherWidgets — Calendar", 280, 260),
    ("notes", "AetherWidgets — Notes", 320, 280),
    ("pomodoro", "AetherWidgets — Pomodoro", 340, 340),
    ("crypto", "AetherWidgets — Crypto", 340, 480),
];

struct AppState {
    open_widgets: Mutex<HashMap<String, bool>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(AppState {
            open_widgets: Mutex::new(HashMap::new()),
        })
        .manage(desktop::SystemMonitorState::new())
        .manage(crypto::CryptoState::new())
        .setup(|app| {
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
    let (_, title, width, height) = WIDGETS
        .iter()
        .find(|(l, _, _, _)| *l == label)
        .ok_or_else(|| format!("Unknown widget: {label}"))?;

    // Create new window
    eprintln!("[AetherWidgets] building window for {label} ({width}x{height})");
    let mut builder = WebviewWindowBuilder::new(&app, label, WebviewUrl::App("index.html".into()))
        .title(*title)
        .inner_size(*width as f64, *height as f64)
        .decorations(false)
        .transparent(false)
        .always_on_top(false)
        .skip_taskbar(true)
        .focusable(true);

    // All widget windows are resizable; give each a sensible minimum size.
    let (min_w, min_h) = match label {
        "clock" => (240.0, 120.0),
        "weather" => (320.0, 240.0),
        "system" => (260.0, 200.0),
        "calendar" => (240.0, 220.0),
        "notes" => (200.0, 150.0),
        "pomodoro" => (280.0, 280.0),
        "crypto" => (300.0, 380.0),
        _ => (200.0, 150.0),
    };
    builder = builder.resizable(true).min_inner_size(min_w, min_h);

    let window = builder.build().map_err(|e| {
        eprintln!("[AetherWidgets] FAILED to build window {label}: {e}");
        e.to_string()
    })?;
    eprintln!("[AetherWidgets] window built OK: {label}");

    // Track the HWND so the Win+D hook keeps it visible and the tray
    // "Bring Widgets to Front" action can raise it.
    if let Err(e) = desktop::register_widget_hwnd(&window) {
        eprintln!("[AetherWidgets] failed to register HWND for {label}: {e}");
    }

    // NOTE: desktop embedding temporarily disabled — it caused white windows and UI freezes.
    // Widgets now open as normal always-on-bottom-less windows; re-pinning will be reintroduced safely.

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

    if let Some(win) = app.get_webview_window(label) {
        // Stop tracking the HWND before closing it.
        desktop::unregister_widget_hwnd(&win);
        win.close().map_err(|e| e.to_string())?;
    }

    // Notify the control panel so its toggle state stays in sync.
    let _ = app.emit("widgets-changed", ());

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
