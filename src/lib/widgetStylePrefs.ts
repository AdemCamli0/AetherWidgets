import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

/**
 * Per-widget visual style preferences (accent color, corner radius, background
 * opacity, and blur). Each widget window stores its own entry keyed by its
 * window label, persisted in localStorage and kept in sync across windows via
 * the `storage` event.
 *
 * Values are applied as CSS custom properties on the widget's root wrapper
 * (see `WidgetContextMenu`), which the widget chrome references:
 *   --aw-accent            accent color override
 *   --aw-widget-radius     corner radius
 *   --aw-widget-bg-alpha   background opacity
 *   --aw-widget-blur       backdrop blur radius
 */

export type BorderRadiusLevel = 0 | 1 | 2;

export interface WidgetStyle {
  /** Accent color override, or null to use the global/theme accent. */
  accentColor: string | null;
  /** Corner radius level: 0 = sharp, 1 = normal (default), 2 = round. */
  borderRadius: BorderRadiusLevel;
  /** Background opacity override (0–1), or null to use the theme default. */
  bgOpacity: number | null;
  /** Whether the background is blurred (backdrop blur). Default true. */
  blur: boolean;
}

export const RADIUS_LEVELS: { level: BorderRadiusLevel; value: string }[] = [
  { level: 0, value: "0.5rem" },
  { level: 1, value: "1rem" },
  { level: 2, value: "1.5rem" },
];

export const OPACITY_PRESETS: { id: string; value: number | null }[] = [
  { id: "default", value: null },
  { id: "40", value: 0.4 },
  { id: "60", value: 0.6 },
  { id: "80", value: 0.8 },
  { id: "solid", value: 1 },
];

const STORAGE_KEY = "aetherwidgets-widget-styles";

const DEFAULT_STYLE: WidgetStyle = {
  accentColor: null,
  borderRadius: 1,
  bgOpacity: null,
  blur: true,
};

type StyleMap = Record<string, Partial<WidgetStyle>>;

/**
 * The `storage` event only fires in *other* windows, never in the window that
 * performed the write. Within a single widget window, both the context menu
 * wrapper (which applies the CSS vars) and the style editor hold their own
 * `useWidgetStyle` state, so edits would not apply live in the same window.
 * This tiny listener set keeps every hook instance in the current window in
 * sync immediately after a local write.
 */
type StyleChangeListener = () => void;
const styleChangeListeners = new Set<StyleChangeListener>();

function notifyStyleChange(): void {
  for (const listener of styleChangeListeners) {
    listener();
  }
}

function isAccentColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isRadiusLevel(value: unknown): value is BorderRadiusLevel {
  return value === 0 || value === 1 || value === 2;
}

function readStyleMap(): StyleMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as StyleMap) : {};
  } catch {
    return {};
  }
}

export function readWidgetStyle(label: string): WidgetStyle {
  const stored = readStyleMap()[label] ?? {};
  return {
    accentColor: isAccentColor(stored.accentColor) ? stored.accentColor : null,
    borderRadius: isRadiusLevel(stored.borderRadius) ? stored.borderRadius : 1,
    bgOpacity:
      typeof stored.bgOpacity === "number" && stored.bgOpacity >= 0 && stored.bgOpacity <= 1
        ? stored.bgOpacity
        : null,
    blur: typeof stored.blur === "boolean" ? stored.blur : true,
  };
}

function writeStyleMap(map: StyleMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage failures.
  }
}

export function writeWidgetStyle(label: string, patch: Partial<WidgetStyle>): WidgetStyle {
  const map = readStyleMap();
  const next = { ...readWidgetStyle(label), ...patch };
  map[label] = next;
  writeStyleMap(map);
  notifyStyleChange();
  return next;
}

export function resetWidgetStyle(label: string): WidgetStyle {
  const map = readStyleMap();
  const nextMap: StyleMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (key !== label) {
      nextMap[key] = value;
    }
  }
  writeStyleMap(nextMap);
  notifyStyleChange();
  return { ...DEFAULT_STYLE };
}

/** Builds the CSS custom-property overrides for a widget style. */
export function buildWidgetStyleCssVars(style: WidgetStyle): Record<string, string> {
  const vars: Record<string, string> = {};
  if (style.accentColor) {
    vars["--aw-accent"] = style.accentColor;
  }
  if (style.bgOpacity !== null) {
    vars["--aw-widget-bg-alpha"] = String(style.bgOpacity);
  }
  if (style.borderRadius !== 1) {
    const entry = RADIUS_LEVELS.find((r) => r.level === style.borderRadius);
    if (entry) {
      vars["--aw-widget-radius"] = entry.value;
    }
  }
  if (!style.blur) {
    vars["--aw-widget-blur"] = "0px";
  }
  return vars;
}

/**
 * React binding for the current widget window's style preferences: live state
 * kept in sync across windows via the `storage` event, plus updaters that
 * persist changes.
 */
export function useWidgetStyle() {
  const label = getCurrentWindow().label;
  const [style, setStyle] = useState<WidgetStyle>(() => readWidgetStyle(label));

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setStyle(readWidgetStyle(label));
      }
    };
    const onLocalChange = () => {
      setStyle(readWidgetStyle(label));
    };
    window.addEventListener("storage", onStorage);
    styleChangeListeners.add(onLocalChange);
    return () => {
      window.removeEventListener("storage", onStorage);
      styleChangeListeners.delete(onLocalChange);
    };
  }, [label]);

  // Keep the native Windows acrylic backdrop in sync with the stored blur
  // preference. Runs on load (to apply/clear the persisted value) and whenever
  // the user toggles blur for this widget. CSS `backdrop-filter` cannot blur
  // the desktop behind a window, so the frosted-glass look needs this native
  // effect. Failures are non-fatal (unsupported OS versions).
  useEffect(() => {
    void invoke("set_widget_blur", { label, enabled: style.blur }).catch((err: unknown) => {
      console.error("Failed to set widget blur:", err);
    });
  }, [label, style.blur]);

  const update = useCallback(
    (patch: Partial<WidgetStyle>) => {
      setStyle(writeWidgetStyle(label, patch));
    },
    [label],
  );

  const reset = useCallback(() => {
    setStyle(resetWidgetStyle(label));
  }, [label]);

  const cssVars = useMemo(() => buildWidgetStyleCssVars(style) as CSSProperties, [style]);

  return { style, update, reset, cssVars };
}
