# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Native notifications**: The app can now send native Windows notifications (via `tauri-plugin-notification`), with permission requested on first use. Used by the Pomodoro timer, crypto price alerts, and the clock alarm.
- **Pomodoro notifications & auto-next**: The Pomodoro timer now sends a notification when a work session or break ends, and an optional "Auto next" toggle automatically starts the following session. Work-session duration is selectable (15/25/50 min) and all preferences are persisted.
- **Crypto price alerts**: The Crypto widget settings now include per-coin price alerts (above/below thresholds). Alerts are one-shot: a notification fires once when a price first enters an alert zone, then the threshold clears itself so it never rings again unless the user re-adds it.
- **Clock world clocks & alarm**: The Clock widget now shows world clocks (New York, London, Tokyo, Sydney) and supports a daily alarm (HH:MM) that fires a notification; the alarm time is persisted.
- **Weather hourly forecast**: The Weather widget now shows the next 24 hours of temperature and conditions below the 7-day forecast — one point every 2 hours (12 points) in a compact two-row grid.
- **Notification preferences**: The Control Panel settings menu now has a Notifications section with an alert sound selector (Chime / Alarm / None, with a live preview), a sound duration picker (3/5/10/30 s), and a "Repeat until dismissed" toggle that keeps the alert sound ringing until the user interacts with the window. Preferences are persisted and synced across all widget windows.
- **Notes colors & due dates**: Notes can now be color-coded (6 colors) and given a due date. Overdue notes are flagged, and both attributes are editable per note and persisted.
- **Calendar events**: Calendar days can now hold events. Clicking a day opens an event panel to add/remove events; days with events show a dot indicator. Events are persisted in localStorage.
- **Default template layout**: Widgets now open at a pre-aligned three-column template layout (with tuned default sizes) when no saved position exists, instead of stacking at the same spot. Saved positions still take precedence.
- **Widget-to-widget snapping**: While dragging, a widget now magnetizes to the edges and centers of other open widgets (within 10px), and can dock directly against them so widgets sit neatly side by side or lined up. Widget snapping takes priority over grid snapping per axis.
- **Exact widget size input**: The widget right-click menu now has a "Resize" item that opens an inline width × height editor. Values are clamped to the widget's minimum size and the size of its current monitor, with a "Reset to default" button. Applied sizes are persisted like manual resizes.
- **Snap to grid**: A new "Snap to grid" toggle in the Control Panel settings menu aligns widgets to an 8px grid while dragging, making it easy to line widgets up neatly. The preference is persisted and synced across all widget windows.
- **Display settings (Phase 7)**: The Control Panel settings menu now has a Display section with a theme selector that includes a new "Auto" option (follows the OS light/dark preference live), a font-size scale (Small / Normal / Large — scales the whole UI via the root font size), an animation level selector (None / Normal / Full — "None" disables all transitions and animations for reduced motion), and an accent color picker with 7 preset swatches plus a "Default" reset. All display preferences are persisted, applied before first paint (no flash), and synced live across all widget windows.
- **Per-widget style customization (Phase 7)**: The widget right-click menu now has a "Style" item that opens an inline style editor. Each widget can independently override its accent color (7 presets or the global default), corner radius (Sharp / Normal / Round), background opacity (Default / 40% / 60% / 80% / Solid), and background blur (on/off). Styles apply live, persist per widget across restarts, and can be reset to defaults with one click.
- **Layout templates & import/export (Phase 7)**: The Control Panel settings menu now has a "Layouts" item that opens a layout manager. It can apply three pre-made templates — Default (three right-anchored columns), Compact (two columns at minimum sizes), and Minimal (floating centered rows) — all computed against the primary monitor's actual size. The current arrangement can be saved as a named custom layout (stored in localStorage) and re-applied or deleted later. Layouts can also be exported to a JSON file and imported back, making arrangements easy to back up or move between machines. Applying a layout moves open widget windows immediately and persists the positions of closed widgets too, via a new `apply_widget_layouts` backend command.
- **Dark / light theme system**: All widgets and the Control Panel now support a dark and a light theme. The theme is selected from the Control Panel settings menu (🌙 Dark / ☀️ Light), persisted in localStorage, applied before first paint (no flash), and synced live across all widget windows. All hardcoded white/black opacity colors were replaced with theme-aware CSS variables (`--aw-*` tokens mapped through Tailwind's `@theme inline`), so every widget automatically adapts to the active theme.

### Fixed

- **Layout sizing & menu overflow**: The default template's Clock and System Monitor windows were too short for their content, and the Compact template's minimum sizes were too small for several widgets (clock, system, calendar, notes, pomodoro). Default heights were raised (Clock 240→280, System 260→300) with the first column re-stacked, and per-widget minimum sizes were raised (Clock 120→180, System 200→240, Calendar 220→240, Notes 150→200, Pomodoro 280→300) in both the Rust size table and the frontend layout templates. The Pomodoro widget now scrolls when its window is smaller than its content. The widget right-click menu, size editor, and style editor overlays are now constrained to the window (`max-w`/`max-h` + scrolling) so they never overflow small widgets, and the style editor's segmented buttons no longer overflow narrow dialogs.- **Background blur now actually blurs the desktop**: The style editor's "blur" toggle previously had no visible effect because CSS `backdrop-filter` can only blur content _inside_ a window — it can never blur the desktop behind it. Widget windows now use the native Windows acrylic backdrop (via `window-vibrancy`), which blurs the wallpaper behind the semi-transparent widget background for a true frosted-glass look. The per-widget blur preference is synced to the native effect on load and on toggle (a new `set_widget_blur` backend command), so disabling blur clears the acrylic.
- **Removed the rectangular "burr" around widget corners**: Widget windows were created opaque, so the opaque window background showed through as a visible rectangle around the rounded widget corners. Widget windows are now created transparent, so only the rounded widget chrome is visible and the corners are clean.
- **Taller clock & system monitor defaults**: The default template layout now gives the Clock (200→240) and System Monitor (220→260) widgets more height, and the first column was re-stacked so nothing overlaps. The frontend layout templates mirror these sizes.
- **Clock accent color coverage**: The Clock widget used the accent color in only two small spots, so changing the accent barely affected it. The date line under the time is now rendered in the accent color (alongside the stopwatch start button and the active alarm button), so the accent change is clearly visible without coloring the time digits themselves.
- **Default template overlap**: The built-in three-column template layout had overlapping widget positions (Calendar overlapped System, Weather overlapped Notes). The template positions were re-stacked so columns no longer overlap when widgets open at their defaults.
- **Localization completion (Phase 7)**: Filled in the missing translation keys for Spanish, German, French, Russian, and Chinese (Simplified) so all 7 languages now cover the Control Panel notifications section, weather condition descriptions, calendar events, notes due dates, and Pomodoro work-duration labels. Previously these fell back to English.
- **Visual consistency polish (Phase 6)**: Standardized button hover/active states across all widgets (accent buttons now consistently use `hover:bg-accent/90 active:bg-accent/70`; surface buttons use `hover:bg-widget-surface-active`). Added `transition-colors` to all interactive buttons for smooth feedback. Disabled state pattern established (opacity-50, cursor-not-allowed). Focus ring via CSS `focus-visible` outline for keyboard navigation. Input placeholder colors standardized to `text-widget-muted/50`. All theme variables (dark/light) consistently applied.
- **Widget layout fit/fill polish**: Reduced gaps and padding in Clock (300×280) and Pomodoro (280×320) widgets to ensure all content fits within their window sizes without overflow. World clock labels use tighter gap spacing (gap-x-2 instead of gap-x-3); Pomodoro timer, buttons, and toggles use optimized vertical spacing (gap-1/gap-1.5 instead of gap-2/gap-3, pt-0.5 instead of pt-1) so the entire preferences section and session indicators display without requiring scrolling.
- **Crypto alerts no longer re-fire when switching exchanges**: The "already notified" state for price alerts was keyed per exchange but only kept valid keys for the _active_ exchange, so switching exchanges wiped the state of other exchanges and re-fired their alerts when switching back. The state is now preserved across all exchanges, and alerts are one-shot: once a threshold fires it removes itself from the config, so it can only ring again if the user re-adds it.
- **Notifications always visible (in-app toast)**: Native Windows toasts are unreliable in development — `tauri-plugin-notification` only sets the toast's `AppUserModel.ID` for installed apps, so in dev mode the toast is attributed to Windows PowerShell and silently suppressed by Focus Assist / per-app notification settings (the alert sound still played, but nothing appeared on screen). `notify()` now also renders an in-app visual toast inside the widget window itself, so the alert is always visible regardless of the OS notification state. The native toast is still sent as best-effort (and works in production builds), and the in-app toast auto-dismisses after the configured notification duration or on click.
- **Desktop-layer pinning re-enabled**: Widgets are once again pinned to the desktop layer (behind desktop icons, above the wallpaper). This had been disabled because running window style/subclass operations from a command worker thread caused white windows and UI freezes. All such operations now run on the main thread, and the desktop-embedding subclass was consolidated into a single per-window wndproc that re-asserts the bottom z-order while fully respecting per-widget always-on-top pinning (a pinned widget is never forced to the bottom).
- **Win+D survival hardened**: The minimize-guard (block `SC_MINIMIZE`, undo programmatic minimizes via `WM_SIZE`/`SIZE_MINIMIZED`) is now part of the single desktop-embedding subclass installed on every widget, so all widgets — not just pinned ones — get the full defense-in-depth stack (subclass guard + `EVENT_SYSTEM_MINIMIZESTART` hook + background watchdog + cleared `WS_MINIMIZEBOX`).
- **Weather fetch timeout**: The main weather forecast fetch now uses a 15 s timeout and aborts any in-flight request before starting a new one, so a hung network call can no longer leave the widget stuck in its loading state. A superseded fetch no longer flashes a spurious error.
- **Unhandled promise rejections**: Several fire-and-forget calls now handle failures gracefully instead of producing unhandled rejections — Control Panel quit / minimize-to-tray, closing a widget from the right-click menu, and the drag position/rect lookups.
- **Weather location resolution**: The Weather widget could show a blank screen when the browser Geolocation API failed (WebView2 does not surface a permission prompt, so `navigator.geolocation` often fails even when Windows location access is granted). Location resolution now uses a guaranteed fallback chain: browser geolocation → IP-based geolocation (ipwho.is, no permission needed) → default city (Istanbul), so the widget always has a location to show. The geolocation timeout was also shortened so the fallback kicks in quickly.
- **Notification source identification**: Notification toasts now show which widget they came from — the title is prefixed with the widget's icon and localized name (e.g. "🍅 Pomodoro — Work session complete"), derived automatically from the sending window.
- **Audible alerts**: Notifications now also play a synthesized sound (Web Audio) so alerts are noticeable even when Windows suppresses the toast (Focus Assist, or the dev-mode PowerShell attribution). The sound kind, duration, and repeat behaviour are configurable in the Control Panel (see Notification preferences).
- **Calendar event panel visibility**: The event panel was squeezed out of the small default Calendar window; it now always renders (with a scrollable event list) and the default Calendar height was increased.
- **System Monitor uptime localization**: The uptime display ("Xh Ym") was hardcoded in English; it now uses translated hour/minute units in all 7 languages.
- **Drag accuracy on scaled displays**: Manual widget dragging now works in logical pixels end-to-end, fixing widgets drifting while dragging on displays with non-100% scaling.
- **Widget layout persistence**: Widget windows now remember their position and size across restarts. Layouts are saved (debounced) to `widget-layouts.json` in the app data directory whenever a widget is moved or resized, and restored when the widget is reopened. Saved positions are only restored if they are still on a connected monitor, so unplugged displays don't strand widgets off-screen.

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
