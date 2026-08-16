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

- 🪟 **Desktop-friendly windows** — widgets open as borderless, drag-anywhere windows; desktop-layer pinning (behind icons, above wallpaper) is implemented and being stabilized
- 🪶 **Featherweight** — ~10 MB installer, minimal RAM usage thanks to Tauri (no bundled Chromium)
- 🎨 **Modern UI** — widgets are built with web tech (React + Tailwind), fully themeable
- 🧩 **Extensible widget system** — each widget is an isolated module; write your own with plain HTML/CSS/TS
- 🖱️ **Drag & drop** — move widgets freely with native Windows window dragging
- 🖥️ **System tray** — manage widgets from the notification area, including a "Bring Widgets to Front" action
- 🎛️ **Control Panel** — toggle widgets on/off, switch language, minimize to tray
- ⚙️ **Settings menu** — launch at startup toggle (Windows registry autostart)
- � **Always on top** — pin any widget above other windows via a hover 📌 button or the right-click menu; each widget pins its own window independently and the choice is remembered. Pinned widgets also survive Win+D / "Show desktop"
- ↔️ **Resizable windows** — every widget window is resizable with a sensible minimum size
- 🌐 **Multi-language** — 7 languages: English, Türkçe, Español, Deutsch, Français, Русский, 简体中文
- 🔒 **Secure by default** — Rust backend, strict CSP, no remote code execution

## 📦 Included Widgets

| Widget            | Highlights                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| 🕐 Clock & Date   | Digital clock, localized date, built-in stopwatch                              |
| 🌤️ Weather        | Open-Meteo forecast, city search, system location, 5-day outlook               |
| 📊 System Monitor | Real CPU / RAM / disk / uptime + temperatures (sysinfo), Task Manager shortcut |
| 📅 Calendar       | Month grid, today highlight, month navigation                                  |
| 📝 Sticky Notes   | Persistent multi-line notes with complete/pending state (localStorage)         |
| 🍅 Pomodoro Timer | Work / short / long break cycles, custom duration, session count               |
| ₿ Crypto Tracker  | CoinGecko / Binance / Coinbase, sparkline charts, portfolio P&L                |

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

- [x] **v0.1** — Project scaffold, Clock widget, desktop embedding, system tray
- [x] **v0.2** — Control Panel, 6 new widgets (Weather, System Monitor, Calendar, Notes, Pomodoro, Crypto), multi-language UI (7 languages), launch-at-startup, per-widget always-on-top pinning, resizable windows, tray "Bring Widgets to Front", new app icon
- [ ] **v0.3** — Persistent widget positions/layout, stable desktop-layer embedding, full Win+D survival for unpinned widgets
- [ ] **v1.0** — Theme system, snap-to-grid, multi-monitor, signed installer

## 📄 License

Distributed under the [MIT License](LICENSE).
