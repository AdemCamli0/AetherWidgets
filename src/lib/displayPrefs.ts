import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Global display preferences shared by all windows.
 *
 * Persisted in localStorage and kept in sync across widget windows via the
 * `storage` event — the same mechanism used for language, theme, snap-to-grid,
 * and notification preferences. Values are applied to the document root so
 * they affect every widget, and are applied before first paint to avoid a
 * flash of the default sizing/motion/color.
 */

export type FontScale = 0.8 | 1 | 1.2;
export type AnimationLevel = "none" | "normal" | "full";

export interface DisplayPrefs {
  /** Root font-size multiplier. Tailwind is rem-based, so this scales the UI. */
  fontScale: FontScale;
  /** How much motion/transitions are used across the UI. */
  animationLevel: AnimationLevel;
  /** Custom accent color override, or null to use the theme's default. */
  accentColor: string | null;
}

export const DISPLAY_PREFS_KEY = "aetherwidgets-display-prefs";

export const FONT_SCALE_OPTIONS: FontScale[] = [0.8, 1, 1.2];
export const ANIMATION_LEVEL_OPTIONS: AnimationLevel[] = ["none", "normal", "full"];

/** Preset accent swatches offered in the Control Panel. */
export const ACCENT_PRESETS: { id: string; value: string }[] = [
  { id: "violet", value: "#7c6cf5" },
  { id: "blue", value: "#4f8ef7" },
  { id: "teal", value: "#2ec4b6" },
  { id: "green", value: "#34c77b" },
  { id: "orange", value: "#f7973e" },
  { id: "pink", value: "#f75fa0" },
  { id: "red", value: "#f75f5f" },
];

const DEFAULT_PREFS: DisplayPrefs = {
  fontScale: 1,
  animationLevel: "normal",
  accentColor: null,
};

function isFontScale(value: unknown): value is FontScale {
  return FONT_SCALE_OPTIONS.includes(value as FontScale);
}

function isAnimationLevel(value: unknown): value is AnimationLevel {
  return ANIMATION_LEVEL_OPTIONS.includes(value as AnimationLevel);
}

function isAccentColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function readDisplayPrefs(): DisplayPrefs {
  try {
    const raw = localStorage.getItem(DISPLAY_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    return {
      fontScale: isFontScale(parsed.fontScale) ? parsed.fontScale : DEFAULT_PREFS.fontScale,
      animationLevel: isAnimationLevel(parsed.animationLevel)
        ? parsed.animationLevel
        : DEFAULT_PREFS.animationLevel,
      accentColor: isAccentColor(parsed.accentColor) ? parsed.accentColor : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeDisplayPrefs(patch: Partial<DisplayPrefs>): DisplayPrefs {
  const next = { ...readDisplayPrefs(), ...patch };
  try {
    localStorage.setItem(DISPLAY_PREFS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
  return next;
}

/** Applies the display preferences to the document root. */
export function applyDisplayPrefs(prefs: DisplayPrefs): void {
  const root = document.documentElement;

  if (prefs.fontScale === 1) {
    root.style.removeProperty("font-size");
  } else {
    root.style.fontSize = `${String(Math.round(prefs.fontScale * 100))}%`;
  }

  root.dataset.animation = prefs.animationLevel;

  if (prefs.accentColor) {
    root.style.setProperty("--aw-accent", prefs.accentColor);
  } else {
    root.style.removeProperty("--aw-accent");
  }
}

// Apply the stored preferences as early as possible (before React renders) so
// windows don't flash with default sizing, motion, or accent color.
applyDisplayPrefs(readDisplayPrefs());

interface DisplayPrefsContextValue {
  prefs: DisplayPrefs;
  update: (patch: Partial<DisplayPrefs>) => void;
}

const DisplayPrefsContext = createContext<DisplayPrefsContextValue | null>(null);

/**
 * React binding for the display preferences: live state kept in sync across
 * windows via the `storage` event, plus an updater that persists changes.
 * Mounted in `main.tsx` so every window (control panel and widgets) applies
 * and reacts to the preferences.
 */
export function DisplayPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<DisplayPrefs>(readDisplayPrefs);

  useEffect(() => {
    applyDisplayPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === DISPLAY_PREFS_KEY) {
        setPrefs(readDisplayPrefs());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<DisplayPrefs>) => {
    setPrefs(writeDisplayPrefs(patch));
  }, []);

  const value = useMemo<DisplayPrefsContextValue>(() => ({ prefs, update }), [prefs, update]);

  return createElement(DisplayPrefsContext.Provider, { value }, children);
}

export function useDisplayPrefs() {
  const context = useContext(DisplayPrefsContext);
  if (!context) {
    throw new Error("useDisplayPrefs must be used within a DisplayPrefsProvider");
  }
  return context;
}
