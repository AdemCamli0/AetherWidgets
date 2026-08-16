# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-08-16

### Added

- **Control Panel**: New main window to toggle widgets on/off, switch UI language, minimize to tray, and exit. Stays in sync with the backend via the `widgets-changed` event.
- **Settings menu**: Gear icon in the Control Panel top bar (between the language selector and minimize button) with a "Launch at startup" toggle, powered by `tauri-plugin-autostart` (Windows registry Run key).
- **Win+D / "Show desktop" survival (best-effort, still limited)**: Multiple mechanisms were tried to keep widgets visible through Win+D / "Show desktop" — blocking `SC_MINIMIZE`, catching programmatic minimizes (`WM_SIZE` + `SIZE_MINIMIZED`), an `EVENT_SYSTEM_MINIMIZESTART` hook, a background watchdog, and removing the `WS_MINIMIZEBOX` style bit. In practice, only always-on-top (pinned) widgets reliably survive; unpinned widgets still get minimized by the shell. These guards remain in place as defense-in-depth and do not interfere with per-widget pinning, but full Win+D survival for unpinned widgets is an unresolved limitation.
- **Always-on-top pinning for all widgets**: Every widget can now be pinned above other windows via a 📌 button (shown on hover, always visible while pinned) and an "Always on top" item in the right-click context menu. Each widget pins its own window independently, and the preference is persisted per widget across restarts.
- **Context menu "Cancel" item**: The widget right-click menu now includes a Cancel option to dismiss the menu without taking an action.
- **Tray "Bring Widgets to Front"**: New system-tray menu item that raises all widget windows above normal windows (`HWND_TOP`) so they can be brought back to the foreground on demand.
- **Widget window lifecycle**: Widgets now open/close on demand as separate webview windows (`open_widget` / `close_widget` / `get_open_widgets` commands) instead of a single always-present clock window.
- **Weather widget**: Open-Meteo current conditions + 5-day forecast, city search with fuzzy matching, system location support, Istanbul fallback.
- **System Monitor widget**: Real CPU / RAM / disk usage, uptime, and CPU/GPU temperatures via `sysinfo`, with a Task Manager shortcut.
- **Calendar widget**: Month grid with today highlight and month navigation.
- **Notes widget**: Persistent sticky notes with complete/pending state, stored in localStorage. Now supports multi-line notes (Enter to add, Shift+Enter for a new line) and an always-on-top pin toggle (header button, shared with the context menu pin state).
- **Pomodoro widget**: Work / short break / long break cycles with custom duration and session counter.
- **Crypto widget**: Prices for 16 coins from CoinGecko, Binance, or Coinbase; 7-day sparkline charts; per-exchange coin selection and portfolio P&L tracking. Rust backend caches responses for 45 s and falls back to stale data on network errors.
- **Multi-language UI**: 7 languages (English, Türkçe, Español, Deutsch, Français, Русский, 简体中文) via a typed i18n module; preference persisted in localStorage.
- **System tray**: "Control Panel" menu item in addition to "Exit".
- **Clock widget**: Built-in stopwatch mode.
- **Tauri v2 capabilities**: Explicit permission capability file (`src-tauri/capabilities/default.json`) for all windows.
- **New Rust dependencies**: `sysinfo` (hardware metrics), `reqwest` with rustls (crypto APIs).
- **New app icon**: Full icon set regenerated from a new design (all Windows sizes, `.ico`, `.icns`, Windows Store logos, Android and iOS assets).

### Changed

- **Desktop embedding**: Replaced Progman/WorkerW reparenting with z-order pinning (HWND_BOTTOM + window subclassing). Widgets now stay fully interactive while remaining behind desktop icons.
- **Desktop embedding temporarily disabled**: Pinning caused white windows and UI freezes when invoked from a command worker thread; widgets currently open as normal borderless windows until it is re-enabled on the main thread.
- **Drag**: Switched from manual pointer tracking to Tauri native `startDragging()` with manual fallback.
- **Resizable widgets**: All widget windows are now resizable (previously only Notes and Crypto), each with a sensible minimum size.
- **Context menu**: Centered within widget bounds to prevent overflow.
- **Close behavior**: Graceful shutdown — windows hide before app exit to prevent Windows shell issues.
- **Main window**: Now a decorations-less, transparent, always-on-top Control Panel instead of the clock widget.

### Removed

- **Click-through toggle**: Removed due to sync complexity and low utility. May be reintroduced with proper state management.
- **Global shortcut**: Removed `Ctrl+Shift+W` escape hatch (no longer needed without click-through).

### Fixed

- **Explorer.exe freeze**: Closing the widget no longer requires restarting Windows Explorer.
- **Widget drag**: Now works reliably with `WS_EX_TOOLWINDOW` style.
- **Context menu overflow**: Menu no longer renders outside widget bounds.
- **WebView2 deadlock**: Widget windows are created from async commands, avoiding a WebView2 runtime deadlock on Windows.

## [0.1.0] - 2026-08-10

### Added

- Initial project scaffold: Tauri 2 + React 19 + TypeScript + Tailwind CSS 4
- Clock & Date widget with Turkish locale formatting
- Windows desktop-layer embedding (Progman/WorkerW technique) — widgets sit behind icons and survive Win+D
- Tauri commands: `set_click_through`, `get_widget_position`, `set_widget_position`
- Drag-to-move support via `data-tauri-drag-region`
- Quality tooling: ESLint (strictTypeChecked), Prettier, EditorConfig, rustfmt, clippy
- GitHub Actions CI: frontend lint/typecheck/build + Rust fmt/clippy/check
- MIT License, CONTRIBUTING guide, issue & PR templates
