# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Desktop embedding**: Replaced Progman/WorkerW reparenting with z-order pinning (HWND_BOTTOM + window subclassing). Widgets now stay fully interactive while remaining behind desktop icons.
- **Drag**: Switched from manual pointer tracking to Tauri native `startDragging()` with manual fallback.
- **Context menu**: Centered within widget bounds to prevent overflow.
- **Close behavior**: Graceful shutdown — window hides before app exit to prevent Windows shell issues.

### Removed

- **Click-through toggle**: Removed due to sync complexity and low utility. May be reintroduced in v0.2 with proper state management.
- **Global shortcut**: Removed `Ctrl+Shift+W` escape hatch (no longer needed without click-through).

### Fixed

- **Explorer.exe freeze**: Closing the widget no longer requires restarting Windows Explorer.
- **Widget drag**: Now works reliably with `WS_EX_TOOLWINDOW` style.
- **Context menu overflow**: Menu no longer renders outside widget bounds.

## [0.1.0] - 2026-09-08

### Added

- Initial project scaffold: Tauri 2 + React 19 + TypeScript + Tailwind CSS 4
- Clock & Date widget with Turkish locale formatting
- Windows desktop-layer embedding (Progman/WorkerW technique) — widgets sit behind icons and survive Win+D
- Tauri commands: `set_click_through`, `get_widget_position`, `set_widget_position`
- Drag-to-move support via `data-tauri-drag-region`
- Quality tooling: ESLint (strictTypeChecked), Prettier, EditorConfig, rustfmt, clippy
- GitHub Actions CI: frontend lint/typecheck/build + Rust fmt/clippy/check
- MIT License, CONTRIBUTING guide, issue & PR templates
