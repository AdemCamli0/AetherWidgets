<div align="center">

# 🌌 AetherWidgets

**Modern, lightweight, customizable desktop widgets for Windows.**

Built with [Tauri 2](https://tauri.app) · [React 19](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Tailwind CSS 4](https://tailwindcss.com)

[![CI](https://github.com/ademc/AetherWidgets/actions/workflows/ci.yml/badge.svg)](https://github.com/ademc/AetherWidgets/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-0078D6?logo=windows&logoColor=white)](https://github.com/ademc/AetherWidgets)

</div>

---

## ✨ Features

- 🪟 **True desktop integration** — widgets embed into the Windows desktop layer (behind icons, above wallpaper) and survive `Win + D`
- 🪶 **Featherweight** — ~10 MB installer, minimal RAM usage thanks to Tauri (no bundled Chromium)
- 🎨 **Modern UI** — widgets are built with web tech (React + Tailwind), fully themeable
- 🧩 **Extensible widget system** — each widget is an isolated module; write your own with plain HTML/CSS/TS
- 🖱️ **Drag & drop** — move widgets freely with native Windows window dragging
- 🖥️ **System tray** — manage widgets from the notification area
- 🔒 **Secure by default** — Rust backend, strict CSP, no remote code execution

## 📦 Included Widgets

| Widget               | Status  |
| -------------------- | ------- |
| 🕐 Clock & Date      | ✅ v0.1 |
| 📊 CPU / RAM Monitor | 🔜 v0.3 |
| 🌤️ Weather           | 🔜 v0.3 |
| 📝 Sticky Notes      | 🔜 v0.3 |
| 📅 Calendar          | 🔜 v0.3 |

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 20
- [Rust](https://rustup.rs) ≥ 1.77 (stable, MSVC toolchain)
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
│  • windows-rs — Progman/WorkerW embedding    │
│  • sysinfo    — hardware metrics (soon)      │
│  • tray icon, autostart, config store (soon) │
└──────────────────────────────────────────────┘
```

```
AetherWidgets/
├── src/                  # React frontend
│   ├── widgets/          # One folder per widget (self-contained modules)
│   ├── components/       # Shared UI primitives
│   ├── stores/           # Zustand state stores
│   └── styles/           # Tailwind theme & globals
├── src-tauri/            # Rust backend
│   └── src/
│       ├── lib.rs        # App entry & setup
│       └── desktop.rs    # Windows desktop-layer integration
└── .github/workflows/    # CI: lint · typecheck · build
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue before starting large changes.

## 🗺️ Roadmap

- [x] **v0.1** — Project scaffold, Clock widget, desktop embedding, system tray
- [ ] **v0.2** — Widget manager, persistent layout, settings UI
- [ ] **v0.3** — CPU/RAM monitor, Weather, Sticky Notes, Calendar
- [ ] **v1.0** — Theme system, snap-to-grid, multi-monitor, autostart, signed installer

## 📄 License

Distributed under the [MIT License](LICENSE).
