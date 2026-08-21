<div align="center">

# 🌌 AetherWidgets

**Modern, lightweight, customizable desktop widgets for Windows.**

Built with [Tauri 2](https://tauri.app) · [React 19](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Tailwind CSS 4](https://tailwindcss.com)

[![CI](https://github.com/AdemCamli0/AetherWidgets/actions/workflows/ci.yml/badge.svg)](https://github.com/AdemCamli0/AetherWidgets/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white)](https://github.com/AdemCamli0/AetherWidgets)

</div>

---

## ✨ Features

- 🪟 **Desktop-friendly windows** — widgets open as borderless, drag-anywhere windows pinned to the desktop layer (behind icons, above wallpaper), and survive Win+D / "Show desktop"
- 🪶 **Featherweight** — ~10 MB installer, minimal RAM usage thanks to Tauri (no bundled Chromium)
- 🎨 **Modern UI** — widgets are built with web tech (React + Tailwind), fully themeable
- 🧩 **Extensible widget system** — each widget is an isolated module; write your own with plain HTML/CSS/TS
- 🖱️ **Drag & drop** — move widgets freely with native Windows window dragging
- 🖥️ **System tray** — manage widgets from the notification area, including a "Bring Widgets to Front" action
- 🎛️ **Control Panel** — toggle widgets on/off, switch language, draggable window, minimize to taskbar or hide to tray
- 🎨 **Themes & per-widget styling** — dark / light / auto theme, plus per-widget accent color, corner radius, background opacity, and native acrylic blur
- 🧱 **Layout templates** — one-click Default / Compact / Minimal arrangements, custom saved layouts, and JSON export/import
- 🔔 **Native notifications** — Pomodoro session alerts, crypto price alerts, and clock alarms with configurable sound, duration, and repeat
- ⚙️ **Settings menu** — launch at startup toggle (Windows registry autostart)
- 📌 **Always on top** — pin any widget above other windows via a hover 📌 button or the right-click menu; each widget pins its own window independently and the choice is remembered. Pinned widgets stay on top even while other widgets sit in the desktop layer
- ↔️ **Resizable windows** — every widget window is resizable with a sensible minimum size
- 🌐 **Multi-language** — 7 languages: English, Türkçe, Español, Deutsch, Français, Русский, 简体中文
- 🔒 **Secure by default** — Rust backend, strict CSP, no remote code execution

## 📦 Included Widgets

| Widget            | Highlights                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| 🕐 Clock & Date   | Digital clock, localized date, world clocks (NY / London / Tokyo / Sydney), daily alarm, stopwatch  |
| 🌤️ Weather        | Open-Meteo current conditions, 7-day forecast, 24-hour hourly outlook, city search, system location |
| 📊 System Monitor | CPU / RAM / disk usage, CPU & GPU temperatures, uptime, Task Manager shortcut                       |
| 📅 Calendar       | Month grid, today highlight, month navigation, per-day events with indicators                       |
| 📝 Sticky Notes   | Color-coded notes with due dates & overdue flags, complete/pending state (localStorage)             |
| 🍅 Pomodoro Timer | Work / short / long break cycles, custom duration, auto-next, session notifications                 |
| ₿ Crypto Tracker  | CoinGecko / Binance / Coinbase, sparkline charts, portfolio P&L, one-shot price alerts              |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 20
- [Rust](https://rustup.rs) ≥ 1.82 (stable, MSVC toolchain)
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) with the **C++ workload**
- WebView2 Runtime (preinstalled on Windows 11 / most Windows 10 systems)

### Development

```bash
# Install dependencies
npm install

# Run in development mode (hot-reload)
npm run tauri:dev

# Type-check, lint, and format
npm run typecheck
npm run lint
npm run format:check
```

### Production Build

```bash
npm run tauri:build
```

Produces an MSI and NSIS installer under `src-tauri/target/release/bundle/`.

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│ Widget Windows (React + Tailwind, per-widget │
│ isolated webview: clock, weather, sysmon…)   │
├──────────────────────────────────────────────┤
│ Tauri Bridge (typed commands & events)       │
├──────────────────────────────────────────────┤
│ Rust Core                                    │
│  • windows-rs — desktop-layer pinning,       │
│    minimize guards, bring-to-front           │
│  • sysinfo    — CPU / RAM / disk / temps     │
│  • reqwest    — crypto price APIs            │
│  • tray icon, widget window lifecycle        │
└──────────────────────────────────────────────┘
```

Each widget runs in its own webview window, created on demand by the Rust
backend (`open_widget` / `close_widget`). The Control Panel window toggles
widgets and stays in sync via the `widgets-changed` event.

```
AetherWidgets/
├── src/                  # React frontend
│   ├── widgets/          # One folder per widget (self-contained modules)
│   ├── components/       # Shared UI (ControlPanel, WidgetContextMenu)
│   ├── lib/              # i18n, useWidgetDrag
│   └── styles/           # Tailwind theme & globals
├── src-tauri/            # Rust backend
│   ├── capabilities/     # Tauri v2 permission capabilities
│   └── src/
│       ├── lib.rs        # App entry, tray, widget window lifecycle
│       ├── desktop.rs    # Desktop-layer integration, system stats
│       └── crypto.rs     # Crypto price APIs (CoinGecko/Binance/Coinbase)
└── .github/workflows/    # CI: lint · typecheck · build
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue before starting large changes.

## 🗺️ Roadmap

### Done

- [x] **v0.1** — Project scaffold, Clock widget, desktop embedding, system tray
- [x] **v0.2** — Control Panel, 6 new widgets (Weather, System Monitor, Calendar, Notes, Pomodoro, Crypto), multi-language UI (7 languages), launch-at-startup, per-widget always-on-top pinning, resizable windows, tray "Bring Widgets to Front", new app icon
- [x] Remember widget positions and window sizes — widgets reopen where you left them (in the next release)
- [x] Dark / light theme — switchable from the Control Panel, synced across all widgets (in the next release)
- [x] Snap to grid — align widgets to an 8px grid while dragging (in the next release)
- [x] Widget-to-widget snapping — widgets magnetize to each other's edges/centers and dock side by side while dragging (in the next release)
- [x] Exact size input — set a widget's width × height from its right-click menu, with min/max limits and reset-to-default (in the next release)
- [x] Native notifications — Pomodoro session alerts, crypto price alerts, and clock alarms (in the next release)
- [x] Pomodoro notifications & auto-next — get notified when a session ends, optionally auto-start the next one (in the next release)
- [x] Crypto price alerts — above/below price thresholds with crossing notifications (in the next release)
- [x] Clock world clocks & alarm — world clocks for major cities plus a daily alarm (in the next release)
- [x] Weather hourly forecast — next 24 hours of temperature and conditions (in the next release)
- [x] Notes colors & due dates — color-coded notes with due dates and overdue flags (in the next release)
- [x] Calendar events — per-day events with dot indicators (in the next release)
- [x] Notification preferences — configurable alert sound, duration, and repeat-until-dismissed (in the next release)
- [x] Desktop-layer pinning re-enabled — widgets sit behind desktop icons again, safely applied on the main thread and fully compatible with per-widget always-on-top pinning (in the next release)
- [x] Win+D survival hardened — every widget now gets the full minimize-guard stack (in the next release)
- [x] Stability pass — weather fetch timeout, guaranteed weather location fallback, and no more unhandled promise rejections (in the next release)
- [x] Draggable Control Panel with minimize-to-taskbar (−) and hide-to-tray (✕) buttons
- [x] Native acrylic background blur — widget windows blur the desktop behind them (Windows 10 1809+ / 11), synced with the per-widget blur toggle
- [x] Transparent widget windows — clean rounded corners with no rectangular edge artifact
- [x] Layout sizing fixes — taller default clock & system monitor, raised minimum sizes so compact layouts fit, menus constrained to window bounds

### Ideas we're considering (no fixed schedule or version promises)

- [ ] More widgets
- [ ] Further stability improvements and bug fixes

## 📄 License

Distributed under the [MIT License](LICENSE).
