import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { LANGUAGE_OPTIONS, useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useWidgetPrefs } from "@/lib/widgetPrefs";
import {
  NOTIFICATION_DURATION_OPTIONS,
  useNotificationPrefs,
  type NotificationSound,
} from "@/lib/notificationPrefs";
import {
  ACCENT_PRESETS,
  useDisplayPrefs,
  type AnimationLevel,
  type FontScale,
} from "@/lib/displayPrefs";
import { playAlert, unlockAudio } from "@/lib/sound";
import { LayoutManager } from "@/components/LayoutManager";

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
  const { theme, setTheme } = useTheme();
  const { snapToGrid, setSnapToGrid } = useWidgetPrefs();
  const { prefs: notificationPrefs, update: updateNotificationPrefs } = useNotificationPrefs();
  const { prefs: displayPrefs, update: updateDisplayPrefs } = useDisplayPrefs();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
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
    try {
      await invoke("quit_app");
    } catch (err) {
      console.error("Quit failed:", err);
    }
  };

  const minimizeToTray = async () => {
    try {
      await getCurrentWindow().hide();
    } catch (err) {
      console.error("Minimize to tray failed:", err);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col rounded-2xl border border-widget-border bg-widget-bg shadow-2xl backdrop-blur-xl">
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
              className="flex items-center gap-2 rounded-lg border border-widget-border bg-widget-surface px-2.5 py-1.5 text-xs font-semibold text-widget-text transition-colors hover:bg-widget-surface-hover"
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
                        : "text-widget-text hover:bg-widget-surface-hover"
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
              className="rounded-lg p-1.5 text-widget-muted transition-colors hover:bg-widget-surface-hover hover:text-widget-text"
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
              <div className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-64 overflow-y-auto overflow-x-hidden rounded-lg border border-widget-border bg-widget-bg shadow-xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => void toggleAutostart()}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-widget-surface-hover"
                >
                  <span>{t("controlPanel.launchAtStartup")}</span>
                  <span
                    className={`h-4 w-7 shrink-0 rounded-full transition-colors ${
                      autostartEnabled ? "bg-accent" : "bg-widget-surface-active"
                    }`}
                  >
                    <span
                      className={`block h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform ${
                        autostartEnabled ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>
                <div className="border-t border-widget-border px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-widget-muted">
                  {t("controlPanel.display")}
                </div>
                <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text">
                  <span>{t("controlPanel.theme")}</span>
                  <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("dark");
                      }}
                      className={`rounded px-1.5 py-1 transition-colors ${
                        theme === "dark"
                          ? "bg-accent/25 font-semibold text-accent"
                          : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                      }`}
                      aria-pressed={theme === "dark"}
                    >
                      🌙 {t("controlPanel.themeDark")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("light");
                      }}
                      className={`rounded px-1.5 py-1 transition-colors ${
                        theme === "light"
                          ? "bg-accent/25 font-semibold text-accent"
                          : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                      }`}
                      aria-pressed={theme === "light"}
                    >
                      ☀️ {t("controlPanel.themeLight")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTheme("auto");
                      }}
                      className={`rounded px-1.5 py-1 transition-colors ${
                        theme === "auto"
                          ? "bg-accent/25 font-semibold text-accent"
                          : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                      }`}
                      aria-pressed={theme === "auto"}
                    >
                      🖥️ {t("controlPanel.themeAuto")}
                    </button>
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text">
                  <span>{t("controlPanel.fontSize")}</span>
                  <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
                    {(
                      [
                        [0.8, t("controlPanel.fontSizeSmall")],
                        [1, t("controlPanel.fontSizeNormal")],
                        [1.2, t("controlPanel.fontSizeLarge")],
                      ] as [FontScale, string][]
                    ).map(([scale, label]) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => {
                          updateDisplayPrefs({ fontScale: scale });
                        }}
                        className={`rounded px-1.5 py-1 transition-colors ${
                          displayPrefs.fontScale === scale
                            ? "bg-accent/25 font-semibold text-accent"
                            : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                        }`}
                        aria-pressed={displayPrefs.fontScale === scale}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text">
                  <span>{t("controlPanel.animations")}</span>
                  <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
                    {(
                      [
                        ["none", t("controlPanel.animationsNone")],
                        ["normal", t("controlPanel.animationsNormal")],
                        ["full", t("controlPanel.animationsFull")],
                      ] as [AnimationLevel, string][]
                    ).map(([level, label]) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          updateDisplayPrefs({ animationLevel: level });
                        }}
                        className={`rounded px-1.5 py-1 transition-colors ${
                          displayPrefs.animationLevel === level
                            ? "bg-accent/25 font-semibold text-accent"
                            : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                        }`}
                        aria-pressed={displayPrefs.animationLevel === level}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text">
                  <span>{t("controlPanel.accentColor")}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        updateDisplayPrefs({ accentColor: null });
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                        displayPrefs.accentColor === null
                          ? "border-accent ring-1 ring-accent"
                          : "border-widget-border hover:border-widget-muted"
                      }`}
                      title={t("controlPanel.accentDefault")}
                      aria-label={t("controlPanel.accentDefault")}
                      aria-pressed={displayPrefs.accentColor === null}
                    >
                      <span className="text-[9px] leading-none text-widget-muted">✕</span>
                    </button>
                    {ACCENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          updateDisplayPrefs({ accentColor: preset.value });
                        }}
                        className={`h-5 w-5 rounded-full border transition-transform ${
                          displayPrefs.accentColor === preset.value
                            ? "scale-110 border-white/80 ring-1 ring-white/60"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: preset.value }}
                        title={preset.id}
                        aria-label={preset.id}
                        aria-pressed={displayPrefs.accentColor === preset.value}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSnapToGrid(!snapToGrid);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-widget-surface-hover"
                >
                  <span>{t("controlPanel.snapToGrid")}</span>
                  <span
                    className={`h-4 w-7 shrink-0 rounded-full transition-colors ${
                      snapToGrid ? "bg-accent" : "bg-widget-surface-active"
                    }`}
                  >
                    <span
                      className={`block h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform ${
                        snapToGrid ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsMenu(false);
                    setShowLayoutManager(true);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-widget-surface-hover"
                >
                  <span>{t("controlPanel.layouts")}</span>
                  <span aria-hidden className="text-[10px] text-widget-muted">
                    ▸
                  </span>
                </button>
                <div className="border-t border-widget-border px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-widget-muted">
                  {t("controlPanel.notifications")}
                </div>
                <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text">
                  <span>{t("controlPanel.notificationSound")}</span>
                  <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
                    {(
                      [
                        ["chime", t("controlPanel.notificationSoundChime")],
                        ["alarm", t("controlPanel.notificationSoundAlarm")],
                        ["none", t("controlPanel.notificationSoundNone")],
                      ] as [NotificationSound, string][]
                    ).map(([sound, label]) => (
                      <button
                        key={sound}
                        type="button"
                        onClick={() => {
                          unlockAudio();
                          updateNotificationPrefs({ sound });
                          if (sound !== "none") {
                            playAlert(sound, 1, false);
                          }
                        }}
                        className={`rounded px-1.5 py-1 transition-colors ${
                          notificationPrefs.sound === sound
                            ? "bg-accent/25 font-semibold text-accent"
                            : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                        }`}
                        aria-pressed={notificationPrefs.sound === sound}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text">
                  <span>{t("controlPanel.notificationDuration")}</span>
                  <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
                    {NOTIFICATION_DURATION_OPTIONS.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        onClick={() => {
                          updateNotificationPrefs({ durationSeconds: seconds });
                        }}
                        className={`rounded px-1.5 py-1 tabular-nums transition-colors ${
                          notificationPrefs.durationSeconds === seconds
                            ? "bg-accent/25 font-semibold text-accent"
                            : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                        }`}
                        aria-pressed={notificationPrefs.durationSeconds === seconds}
                      >
                        {t("controlPanel.notificationDurationSeconds").replace(
                          "{seconds}",
                          String(seconds),
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateNotificationPrefs({
                      repeatUntilDismissed: !notificationPrefs.repeatUntilDismissed,
                    });
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-widget-text transition-colors hover:bg-widget-surface-hover"
                >
                  <span>{t("controlPanel.notificationRepeat")}</span>
                  <span
                    className={`h-4 w-7 shrink-0 rounded-full transition-colors ${
                      notificationPrefs.repeatUntilDismissed
                        ? "bg-accent"
                        : "bg-widget-surface-active"
                    }`}
                  >
                    <span
                      className={`block h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform ${
                        notificationPrefs.repeatUntilDismissed
                          ? "translate-x-3.5"
                          : "translate-x-0.5"
                      }`}
                    />
                  </span>
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => void minimizeToTray()}
            className="rounded-lg p-1.5 text-widget-muted transition-colors hover:bg-widget-surface-hover hover:text-widget-text"
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
                : "text-widget-muted hover:bg-widget-surface"
            }`}
          >
            <span className="text-xl">{widget.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{widget.name}</div>
              <div className="text-xs opacity-70">{widget.description}</div>
            </div>
            <div
              className={`h-5 w-9 rounded-full transition-colors ${
                widget.enabled ? "bg-accent" : "bg-widget-surface-active"
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

      {showLayoutManager && (
        <LayoutManager
          onClose={() => {
            setShowLayoutManager(false);
          }}
        />
      )}
    </div>
  );
}
