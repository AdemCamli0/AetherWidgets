import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { invoke } from "@tauri-apps/api/core";
import { useLanguage } from "@/lib/i18n";

interface SizeBounds {
  min_width: number;
  min_height: number;
  max_width: number;
  max_height: number;
  default_width: number;
  default_height: number;
}

interface WidgetSizeEditorProps {
  onClose: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Inline editor for entering an exact widget window size (width × height).
 *
 * Limits come from the backend (`get_widget_size_bounds`): the per-widget
 * minimum size and the size of the monitor the widget is on as the maximum.
 * Includes a "Reset to default" action. Applying the size goes through
 * `setSize`, and the resulting resize is persisted by the Rust window-event
 * handler like any manual resize.
 */
export function WidgetSizeEditor({ onClose }: WidgetSizeEditorProps) {
  const { t } = useLanguage();
  const [bounds, setBounds] = useState<SizeBounds | null>(null);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const label = getCurrentWindow().label;
    const effect = { cancelled: false };

    void (async () => {
      try {
        const [sizeBounds, size, scale] = await Promise.all([
          invoke<SizeBounds>("get_widget_size_bounds", { label }),
          getCurrentWindow().innerSize(),
          getCurrentWindow().scaleFactor(),
        ]);
        if (effect.cancelled) return;
        const logical = size.toLogical(scale);
        setBounds(sizeBounds);
        setWidth(String(Math.round(logical.width)));
        setHeight(String(Math.round(logical.height)));
      } catch {
        if (!effect.cancelled) {
          setError(t("widgetSizeEditor.loadError"));
        }
      }
    })();

    return () => {
      effect.cancelled = true;
    };
  }, [t]);

  const applySize = useCallback(
    (targetWidth: number, targetHeight: number) => {
      if (!bounds) return;

      const w = clamp(Math.round(targetWidth), bounds.min_width, bounds.max_width);
      const h = clamp(Math.round(targetHeight), bounds.min_height, bounds.max_height);
      setWidth(String(w));
      setHeight(String(h));
      setError(null);

      void getCurrentWindow()
        .setSize(new LogicalSize(w, h))
        .catch(() => {
          setError(t("widgetSizeEditor.applyError"));
        });
    },
    [bounds, t],
  );

  const onSubmit = useCallback(
    (event: React.SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();
      const w = Number(width);
      const h = Number(height);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
        setError(t("widgetSizeEditor.invalidError"));
        return;
      }
      applySize(w, h);
    },
    [width, height, applySize, t],
  );

  const onReset = useCallback(() => {
    if (!bounds) return;
    applySize(bounds.default_width, bounds.default_height);
  }, [bounds, applySize]);

  return (
    <div
      role="dialog"
      aria-label={t("widgetSizeEditor.title")}
      className="absolute left-1/2 top-1/2 z-50 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-widget-border bg-widget-bg p-3 shadow-xl backdrop-blur-xl"
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-widget-text">{t("widgetSizeEditor.title")}</span>
        <button
          onClick={onClose}
          className="rounded px-1 text-widget-muted transition-colors hover:bg-widget-surface-hover hover:text-widget-text"
          aria-label={t("widgetContextMenu.cancel")}
        >
          ✕
        </button>
      </div>

      {bounds ? (
        <form onSubmit={onSubmit}>
          <div className="flex items-center gap-2">
            <label className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wide text-widget-muted">
                {t("widgetSizeEditor.width")}
              </span>
              <input
                type="number"
                value={width}
                min={bounds.min_width}
                max={bounds.max_width}
                onChange={(e) => {
                  setWidth(e.target.value);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="w-full rounded bg-widget-surface px-2 py-1 text-sm text-widget-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
            <span className="mt-4 text-widget-muted">×</span>
            <label className="flex flex-1 flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wide text-widget-muted">
                {t("widgetSizeEditor.height")}
              </span>
              <input
                type="number"
                value={height}
                min={bounds.min_height}
                max={bounds.max_height}
                onChange={(e) => {
                  setHeight(e.target.value);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                className="w-full rounded bg-widget-surface px-2 py-1 text-sm text-widget-text focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </label>
          </div>

          <p className="mt-1.5 text-[10px] text-widget-muted">
            {t("widgetSizeEditor.limits")
              .replace("{minW}", String(bounds.min_width))
              .replace("{minH}", String(bounds.min_height))
              .replace("{maxW}", String(bounds.max_width))
              .replace("{maxH}", String(bounds.max_height))}
          </p>

          {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded bg-accent px-2 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {t("widgetSizeEditor.apply")}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex-1 rounded bg-widget-surface px-2 py-1.5 text-sm text-widget-text transition-colors hover:bg-widget-surface-hover"
            >
              {t("widgetSizeEditor.resetDefault")}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-widget-muted">{error ?? "…"}</p>
      )}
    </div>
  );
}
