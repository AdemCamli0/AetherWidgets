//! Widget layout persistence.
//!
//! Widget positions and sizes are saved to `widget-layouts.json` in the app
//! data directory and restored the next time a widget opens. Disk writes are
//! debounced: move/resize events only mark the store dirty, and a background
//! watchdog flushes it to disk at most twice per second.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};

/// Saved position (physical pixels) and size of a widget window.
#[derive(Debug, Default, Clone, Copy, Serialize, Deserialize)]
pub struct WidgetLayout {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// In-memory layout map plus a dirty flag for debounced disk writes.
pub struct LayoutStore {
    path: PathBuf,
    layouts: Mutex<HashMap<String, WidgetLayout>>,
    dirty: AtomicBool,
}

impl LayoutStore {
    /// Loads previously saved layouts from `path` (missing/corrupt file = empty).
    pub fn load(path: PathBuf) -> Self {
        let layouts = fs::read_to_string(&path)
            .ok()
            .and_then(|json| serde_json::from_str(&json).ok())
            .unwrap_or_default();
        Self {
            path,
            layouts: Mutex::new(layouts),
            dirty: AtomicBool::new(false),
        }
    }

    /// Returns the saved layout for a widget, if any.
    pub fn get(&self, label: &str) -> Option<WidgetLayout> {
        self.layouts.lock().ok()?.get(label).copied()
    }

    /// Updates the stored layout for a widget, inserting an entry if needed.
    pub fn update<F: FnOnce(&mut WidgetLayout)>(&self, label: &str, f: F) {
        if let Ok(mut map) = self.layouts.lock() {
            let layout = map.entry(label.to_string()).or_default();
            f(layout);
            self.dirty.store(true, Ordering::Relaxed);
        }
    }

    /// Writes pending changes to disk.
    pub fn flush(&self) {
        if !self.dirty.swap(false, Ordering::Relaxed) {
            return;
        }
        let Ok(map) = self.layouts.lock() else {
            return;
        };
        if let Some(parent) = self.path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(&*map) {
            if let Err(e) = fs::write(&self.path, json) {
                eprintln!("[AetherWidgets] failed to save widget layouts: {e}");
            }
        }
    }

    /// Spawns a background thread that flushes pending changes twice per second.
    pub fn start_watchdog(self: Arc<Self>) {
        std::thread::Builder::new()
            .name("layout-watchdog".into())
            .spawn(move || loop {
                std::thread::sleep(Duration::from_millis(500));
                self.flush();
            })
            .ok();
    }
}
