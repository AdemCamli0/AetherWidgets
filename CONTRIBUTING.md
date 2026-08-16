# Contributing to AetherWidgets

Thanks for your interest in contributing! 🎉

## Getting Started

1. Fork the repository and clone your fork.
2. Install the prerequisites listed in [README.md](README.md#prerequisites).
3. Run `npm install` and verify everything works with `npm run tauri:dev`.

## Development Workflow

1. Create a branch from `main`: `git checkout -b feat/my-feature`
2. Make your changes.
3. Ensure all checks pass:
   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   cd src-tauri && cargo clippy -- -D warnings && cargo fmt --check
   ```
4. Commit using [Conventional Commits](https://www.conventionalcommits.org):
   - `feat: add weather widget`
   - `fix: clock widget flickers on DPI change`
   - `docs: update widget development guide`
5. Open a Pull Request against `main`.

## Adding a New Widget

1. Create a folder under `src/widgets/<your-widget>/`.
2. Export a self-contained React component (see `src/widgets/clock/ClockWidget.tsx` for reference). Wrap it in `WidgetContextMenu` and use `useWidgetDrag` for dragging.
3. Render it in `src/App.tsx` for your window label.
4. Register the widget in the `WIDGETS` list in `src-tauri/src/lib.rs` (label, title, default size) so `open_widget` can create its window.
5. Add it to `AVAILABLE_WIDGETS` in `src/components/ControlPanel.tsx` and add its translations in `src/lib/i18n.ts` (all 7 languages).
6. Document any new Tauri commands your widget requires.

## Code Style

- **TypeScript**: strict mode, ESLint `strictTypeChecked`, Prettier formatting.
- **Rust**: `cargo fmt` + `clippy` with warnings denied.
- Keep widgets self-contained; shared logic goes into `src/lib/` or `src/components/`.

## Reporting Bugs

Open an issue using the bug report template and include:

- Windows version and build
- AetherWidgets version
- Steps to reproduce
- Expected vs. actual behavior
