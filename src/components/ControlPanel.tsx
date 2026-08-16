import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";

interface WidgetInfo {
  id: string;
  icon: string;
  enabled: boolean;
}

const AVAILABLE_WIDGETS: WidgetInfo[] = [
  { id: "clock", icon: "🕐", enabled: false },
  { id: "weather", icon: "🌤️", enabled: false },
  { id: "system", icon: "📊", enabled: false },
  { id: "calendar", icon: "🗓️", enabled: false },
  { id: "notes", icon: "📝", enabled: false },
  { id: "pomodoro", icon: "🍅", enabled: false },
  { id: "crypto", icon: "₿", enabled: false },
];

export function ControlPanel() {
  const [widgets, setWidgets] = useState(AVAILABLE_WIDGETS);
  const { t, language, setLanguage } = useLanguage();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const widgetMetadata = useMemo(
    () =>
      widgets.map((widget) => ({
        ...widget,
        name: t(`widgets.${widget.id}.name`),
        description: t(`widgets.${widget.id}.description`),
      })),
    [t, widgets],
  );

  const languageShortLabel = useMemo(() => {
    switch (language) {
      case "tr":
        return "TR";
      case "es":
        return "ES";
      case "de":
        return "DE";
      case "fr":
        return "FR";
      case "ru":
        return "RU";
      case "zh-CN":
        return "ZH";
      case "en":
      default:
        return "EN";
    }
  }, [language]);

  // Sync with backend on mount and whenever a widget is opened/closed
  // from anywhere (context menu, control panel, etc.).
  useEffect(() => {
    const syncWidgets = () => {
      invoke<string[]>("get_open_widgets")
        .then((openWidgets) => {
          setWidgets((prev) => prev.map((w) => ({ ...w, enabled: openWidgets.includes(w.id) })));
        })
        .catch((err: unknown) => {
          console.error("Failed to sync widgets:", err);
        });
    };

    syncWidgets();

    const unlisten = listen("widgets-changed", () => {
      syncWidgets();
    });

    return () => {
      unlisten
        .then((fn) => {
          fn();
        })
        .catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!showLanguageMenu && !showSettingsMenu) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (languageMenuRef.current && !languageMenuRef.current.contains(target)) {
        setShowLanguageMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(target)) {
        setShowSettingsMenu(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowLanguageMenu(false);
        setShowSettingsMenu(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onEscape);
    };
  }, [showLanguageMenu, showSettingsMenu]);

  // Read the current autostart registration state on mount.
  useEffect(() => {
    isEnabled()
      .then(setAutostartEnabled)
      .catch((err: unknown) => {
        console.error("Failed to read autostart state:", err);
      });
  }, []);

  const toggleAutostart = async () => {
    try {
      if (autostartEnabled) {
        await disable();
        setAutostartEnabled(false);
      } else {
        await enable();
        setAutostartEnabled(true);
      }
    } catch (err) {
      console.error("Autostart toggle failed:", err);
    }
  };

  const toggleWidget = async (id: string) => {
    const widget = widgets.find((w) => w.id === id);
    if (!widget) return;

    try {
      if (widget.enabled) {
        await invoke("close_widget", { label: id });
      } else {
        await invoke("open_widget", { label: id });
      }
      setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w)));
    } catch (err) {
      console.error("Widget toggle failed:", err);
    }
  };

  const quitApp = async () => {
    await invoke("quit_app");
  };

  const minimizeToTray = async () => {
    await getCurrentWindow().hide();
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-widget-border bg-widget-bg shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-widget-border px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold text-widget-text">{t("controlPanel.title")}</h1>
          <p className="text-xs text-widget-muted">{t("controlPanel.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={languageMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowLanguageMenu((open) => !open);
              }}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-widget-text transition-colors hover:bg-white/10"
              title={t("controlPanel.language")}
              aria-label={t("controlPanel.language")}
              aria-expanded={showLanguageMenu}
            >
              <span aria-hidden>🌐</span>
              <span className="min-w-8 text-center tabular-nums">{languageShortLabel}</span>
              <span aria-hidden className="text-[10px] text-widget-muted">
                ▾
              </span>
            </button>
            {showLanguageMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-widget-border bg-widget-bg shadow-xl backdrop-blur-xl">
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => {
                      setLanguage(option.code);
                      setShowLanguageMenu(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                      language === option.code
                        ? "bg-accent/20 text-accent"
                        : "text-widget-text hover:bg-white/10"
                    }`}
                  >
                    <span>{option.label}</span>
                    <span className="text-[10px] font-semibold text-widget-muted">
                      {option.code === "zh-CN" ? "ZH" : option.code.slice(0, 2).toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative" ref={settingsMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowSettingsMenu((open) => !open);
              }}
              className="rounded-lg p-1.5 text-widget-muted transition-colors hover:bg-white/10 hover:text-widget-text"
              title={t("controlPanel.settings")}
              aria-label={t("controlPanel.settings")}
              aria-expanded={showSettingsMenu}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-widget-border bg-widget-bg shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => void toggleAutostart()}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-white/10"
                >
                  <span>{t("controlPanel.launchAtStartup")}</span>
                  <span
                    className={`h-4 w-7 shrink-0 rounded-full transition-colors ${
                      autostartEnabled ? "bg-accent" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`block h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform ${
                        autostartEnabled ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => void minimizeToTray()}
            className="rounded-lg p-1.5 text-widget-muted transition-colors hover:bg-white/10 hover:text-widget-text"
            title={t("controlPanel.minimizeToTray")}
            aria-label={t("controlPanel.minimizeToTray")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {widgetMetadata.map((widget) => (
          <button
            key={widget.id}
            onClick={() => void toggleWidget(widget.id)}
            className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
              widget.enabled
                ? "bg-accent/20 text-widget-text"
                : "text-widget-muted hover:bg-white/5"
            }`}
          >
            <span className="text-xl">{widget.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{widget.name}</div>
              <div className="text-xs opacity-70">{widget.description}</div>
            </div>
            <div
              className={`h-5 w-9 rounded-full transition-colors ${
                widget.enabled ? "bg-accent" : "bg-white/20"
              }`}
            >
              <div
                className={`h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${
                  widget.enabled ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-widget-border p-2">
        <button
          onClick={() => void quitApp()}
          className="w-full rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
        >
          {t("controlPanel.exit")}
        </button>
      </div>
    </div>
  );
}
