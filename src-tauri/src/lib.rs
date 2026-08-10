mod desktop;

use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let window = app
                .get_webview_window("clock")
                .expect("clock window not found");

            // Embed the widget window into the Windows desktop layer
            // (behind icons, above wallpaper) so it behaves like a native widget.
            #[cfg(windows)]
            if let Err(err) = desktop::embed_into_desktop(&window) {
                eprintln!("[aetherwidgets] failed to embed into desktop: {err}");
            }

            // System tray: right-click menu for widget management.
            let quit_item = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().expect("no default icon").clone())
                .menu(&tray_menu)
                .tooltip("AetherWidgets")
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop::get_widget_position,
            desktop::set_widget_position,
            desktop::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AetherWidgets");
}
