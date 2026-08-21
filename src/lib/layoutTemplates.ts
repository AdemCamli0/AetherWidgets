import { invoke } from "@tauri-apps/api/core";
import { primaryMonitor } from "@tauri-apps/api/window";

/** A single widget's position and size in logical (CSS) pixels. */
export interface WidgetLayoutEntry {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A monitor's rectangle in logical pixels. */
export interface MonitorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Default (template) size for each widget, mirroring the Rust `WIDGETS` table. */
const SIZES: Record<string, { width: number; height: number }> = {
  clock: { width: 265, height: 280 },
  weather: { width: 410, height: 340 },
  system: { width: 265, height: 300 },
  calendar: { width: 265, height: 330 },
  notes: { width: 400, height: 275 },
  pomodoro: { width: 300, height: 425 },
  crypto: { width: 350, height: 500 },
};

/** Minimum size for each widget, mirroring the Rust `widget_min_size` table. */
const MIN_SIZES: Record<string, { width: number; height: number }> = {
  clock: { width: 240, height: 180 },
  weather: { width: 320, height: 240 },
  system: { width: 260, height: 240 },
  calendar: { width: 240, height: 240 },
  notes: { width: 220, height: 200 },
  pomodoro: { width: 280, height: 300 },
  crypto: { width: 300, height: 380 },
};

/** Returns the primary monitor's rectangle in logical pixels (fallback 1080p). */
export async function getPrimaryMonitorRect(): Promise<MonitorRect> {
  const monitor = await primaryMonitor();
  if (!monitor) {
    return { x: 0, y: 0, width: 1920, height: 1080 };
  }
  const scale = monitor.scaleFactor;
  return {
    x: monitor.position.x / scale,
    y: monitor.position.y / scale,
    width: monitor.size.width / scale,
    height: monitor.size.height / scale,
  };
}

/**
 * Default layout: three right-anchored columns, matching the built-in Rust
 * template. Columns are stacked top-to-bottom with a small gap and never
 * overlap.
 */
function buildDefault(m: MonitorRect): WidgetLayoutEntry[] {
  const GAP = 8;
  const right = m.x + m.width;
  const top = m.y;

  const col1W = SIZES.clock.width; // clock / calendar / system
  const col2W = SIZES.weather.width; // weather / notes
  const col3W = SIZES.crypto.width; // crypto / pomodoro

  const col3X = right - GAP - col3W;
  const col2X = col3X - GAP - col2W;
  const col1X = col2X - GAP - col1W;

  const clockH = SIZES.clock.height;
  const calendarH = SIZES.calendar.height;
  const weatherH = SIZES.weather.height;
  const cryptoH = SIZES.crypto.height;

  return [
    { label: "clock", x: col1X, y: top + GAP, ...SIZES.clock },
    { label: "calendar", x: col1X, y: top + GAP + clockH + GAP, ...SIZES.calendar },
    {
      label: "system",
      x: col1X,
      y: top + GAP + clockH + GAP + calendarH + GAP,
      ...SIZES.system,
    },
    { label: "weather", x: col2X, y: top + GAP, ...SIZES.weather },
    { label: "notes", x: col2X, y: top + GAP + weatherH + GAP, ...SIZES.notes },
    { label: "crypto", x: col3X, y: top + GAP, ...SIZES.crypto },
    { label: "pomodoro", x: col3X, y: top + GAP + cryptoH + GAP, ...SIZES.pomodoro },
  ];
}

/**
 * Compact layout: two right-anchored columns using each widget's minimum size,
 * so everything fits in a smaller footprint.
 */
function buildCompact(m: MonitorRect): WidgetLayoutEntry[] {
  const GAP = 8;
  const right = m.x + m.width;
  const top = m.y;

  const leftLabels = ["clock", "calendar", "system", "notes"];
  const rightLabels = ["weather", "crypto", "pomodoro"];

  const colRightW = MIN_SIZES.weather.width;
  const colLeftW = MIN_SIZES.system.width;
  const colRX = right - GAP - colRightW;
  const colLX = colRX - GAP - colLeftW;

  const entries: WidgetLayoutEntry[] = [];

  let ly = top + GAP;
  for (const label of leftLabels) {
    const size = MIN_SIZES[label];
    entries.push({ label, x: colLX, y: ly, ...size });
    ly += size.height + GAP;
  }

  let ry = top + GAP;
  for (const label of rightLabels) {
    const size = MIN_SIZES[label];
    entries.push({ label, x: colRX, y: ry, ...size });
    ry += size.height + GAP;
  }

  return entries;
}

/**
 * Minimal layout: widgets float in two centered rows with generous spacing,
 * roughly centered on the monitor.
 */
function buildMinimal(m: MonitorRect): WidgetLayoutEntry[] {
  const GAP = 24;
  const cx = m.x + m.width / 2;
  const top = m.y;

  const row1 = ["clock", "weather", "crypto"];
  const row2 = ["calendar", "system", "notes", "pomodoro"];
  const entries: WidgetLayoutEntry[] = [];

  const placeRow = (labels: string[], y: number): number => {
    const totalWidth =
      labels.reduce((acc, label) => acc + SIZES[label].width, 0) + GAP * (labels.length - 1);
    let x = cx - totalWidth / 2;
    let maxHeight = 0;
    for (const label of labels) {
      const size = SIZES[label];
      entries.push({ label, x: Math.round(x), y, ...size });
      x += size.width + GAP;
      maxHeight = Math.max(maxHeight, size.height);
    }
    return maxHeight;
  };

  const y1 = top + 40;
  const row1Height = placeRow(row1, y1);
  const y2 = y1 + row1Height + GAP;
  placeRow(row2, y2);

  return entries;
}

/** A pre-made layout template that can be applied to the current monitor. */
export interface LayoutTemplate {
  id: string;
  /** i18n key for the display name. */
  nameKey: string;
  /** i18n key for the short description. */
  descriptionKey: string;
  build: (monitor: MonitorRect) => WidgetLayoutEntry[];
}

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    id: "default",
    nameKey: "layoutManager.templateDefault",
    descriptionKey: "layoutManager.templateDefaultDesc",
    build: buildDefault,
  },
  {
    id: "compact",
    nameKey: "layoutManager.templateCompact",
    descriptionKey: "layoutManager.templateCompactDesc",
    build: buildCompact,
  },
  {
    id: "minimal",
    nameKey: "layoutManager.templateMinimal",
    descriptionKey: "layoutManager.templateMinimalDesc",
    build: buildMinimal,
  },
];

/** Returns the current rectangles of all open widget windows. */
export async function captureCurrentLayouts(): Promise<WidgetLayoutEntry[]> {
  return invoke<WidgetLayoutEntry[]>("get_widget_rects");
}

/** Applies a batch of layouts via the backend (moves open windows, persists all). */
export async function applyLayout(entries: WidgetLayoutEntry[]): Promise<void> {
  await invoke("apply_widget_layouts", { layouts: entries });
}

// --- Custom (user-saved) layouts, stored in localStorage -------------------

const CUSTOM_LAYOUTS_KEY = "aetherwidgets-custom-layouts";

/** A layout the user saved from the current widget arrangement. */
export interface CustomLayout {
  id: string;
  name: string;
  entries: WidgetLayoutEntry[];
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Reads saved custom layouts (corrupt/missing storage returns an empty list). */
export function readCustomLayouts(): CustomLayout[] {
  try {
    const raw = localStorage.getItem(CUSTOM_LAYOUTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const layouts: CustomLayout[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      if (typeof obj.id !== "string" || typeof obj.name !== "string") continue;
      if (!Array.isArray(obj.entries)) continue;
      const entries: WidgetLayoutEntry[] = [];
      for (const entry of obj.entries) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;
        if (typeof e.label !== "string") continue;
        const x = Number(e.x);
        const y = Number(e.y);
        const width = Number(e.width);
        const height = Number(e.height);
        if (![x, y, width, height].every(Number.isFinite)) continue;
        entries.push({
          label: e.label,
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        });
      }
      layouts.push({ id: obj.id, name: obj.name, entries });
    }
    return layouts;
  } catch {
    return [];
  }
}

function writeCustomLayouts(layouts: CustomLayout[]): void {
  localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify(layouts));
}

/** Saves the current arrangement as a named custom layout; returns the list. */
export function saveCustomLayout(name: string, entries: WidgetLayoutEntry[]): CustomLayout[] {
  const layouts = readCustomLayouts();
  layouts.push({ id: makeId(), name, entries });
  writeCustomLayouts(layouts);
  return layouts;
}

/** Deletes a custom layout by id; returns the remaining list. */
export function deleteCustomLayout(id: string): CustomLayout[] {
  const layouts = readCustomLayouts().filter((layout) => layout.id !== id);
  writeCustomLayouts(layouts);
  return layouts;
}

// --- JSON import / export --------------------------------------------------

/** Envelope used when exporting a layout to JSON. */
export interface LayoutExport {
  app: "aetherwidgets";
  version: 1;
  exportedAt: string;
  layouts: WidgetLayoutEntry[];
}

/** Serializes a layout to a pretty-printed JSON string. */
export function buildLayoutExport(entries: WidgetLayoutEntry[]): string {
  const envelope: LayoutExport = {
    app: "aetherwidgets",
    version: 1,
    exportedAt: new Date().toISOString(),
    layouts: entries,
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Parses a layout JSON string. Accepts either the full export envelope or a
 * bare array of layout entries. Throws if nothing valid is found.
 */
export function parseLayoutExport(text: string): WidgetLayoutEntry[] {
  const parsed: unknown = JSON.parse(text);

  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as LayoutExport).layouts)
  ) {
    arr = (parsed as LayoutExport).layouts;
  } else {
    throw new Error("Not a valid AetherWidgets layout file.");
  }

  const entries: WidgetLayoutEntry[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.label !== "string") continue;
    const x = Number(obj.x);
    const y = Number(obj.y);
    const width = Number(obj.width);
    const height = Number(obj.height);
    if (![x, y, width, height].every(Number.isFinite)) continue;
    if (width <= 0 || height <= 0) continue;
    entries.push({
      label: obj.label,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    });
  }

  if (entries.length === 0) {
    throw new Error("The layout file contains no valid widget entries.");
  }
  return entries;
}
