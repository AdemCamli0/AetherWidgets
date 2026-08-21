import { useLanguage } from "@/lib/i18n";
import { ACCENT_PRESETS } from "@/lib/displayPrefs";
import { OPACITY_PRESETS, RADIUS_LEVELS, useWidgetStyle } from "@/lib/widgetStylePrefs";

interface WidgetStyleEditorProps {
  onClose: () => void;
}

/**
 * Inline editor for customizing the current widget's appearance: accent color,
 * corner radius, background opacity, and blur. Changes apply live and persist
 * per widget.
 */
export function WidgetStyleEditor({ onClose }: WidgetStyleEditorProps) {
  const { t } = useLanguage();
  const { style, update, reset } = useWidgetStyle();

  const radiusLabels = [
    t("widgetStyle.radiusSharp"),
    t("widgetStyle.radiusNormal"),
    t("widgetStyle.radiusRound"),
  ];

  return (
    <div
      role="dialog"
      aria-label={t("widgetStyle.title")}
      className="absolute left-1/2 top-1/2 z-50 max-h-[calc(100%-1rem)] w-64 max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-widget-border bg-widget-bg p-3 shadow-xl backdrop-blur-xl"
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-widget-text">{t("widgetStyle.title")}</span>
        <button
          onClick={onClose}
          className="rounded px-1 text-widget-muted transition-colors hover:bg-widget-surface-hover hover:text-widget-text"
          aria-label={t("widgetContextMenu.cancel")}
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Accent color */}
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
            {t("widgetStyle.accentColor")}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                update({ accentColor: null });
              }}
              className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                style.accentColor === null
                  ? "border-accent ring-1 ring-accent"
                  : "border-widget-border hover:border-widget-muted"
              }`}
              title={t("widgetStyle.accentDefault")}
              aria-label={t("widgetStyle.accentDefault")}
              aria-pressed={style.accentColor === null}
            >
              <span className="text-[9px] leading-none text-widget-muted">✕</span>
            </button>
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  update({ accentColor: preset.value });
                }}
                className={`h-5 w-5 rounded-full border transition-transform ${
                  style.accentColor === preset.value
                    ? "scale-110 border-white/80 ring-1 ring-white/60"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: preset.value }}
                title={preset.id}
                aria-label={preset.id}
                aria-pressed={style.accentColor === preset.value}
              />
            ))}
          </div>
        </div>

        {/* Corner radius */}
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
            {t("widgetStyle.cornerRadius")}
          </div>
          <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
            {RADIUS_LEVELS.map((entry, index) => (
              <button
                key={entry.level}
                type="button"
                onClick={() => {
                  update({ borderRadius: entry.level });
                }}
                className={`min-w-0 flex-1 rounded px-1.5 py-1 text-xs transition-colors ${
                  style.borderRadius === entry.level
                    ? "bg-accent/25 font-semibold text-accent"
                    : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                }`}
                aria-pressed={style.borderRadius === entry.level}
              >
                {radiusLabels[index]}
              </button>
            ))}
          </div>
        </div>

        {/* Background opacity */}
        <div>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
            {t("widgetStyle.opacity")}
          </div>
          <div className="flex gap-0.5 rounded-md bg-widget-surface p-0.5">
            {OPACITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  update({ bgOpacity: preset.value });
                }}
                className={`min-w-0 flex-1 rounded px-1 py-1 text-xs transition-colors ${
                  style.bgOpacity === preset.value
                    ? "bg-accent/25 font-semibold text-accent"
                    : "text-widget-muted hover:bg-widget-surface-hover hover:text-widget-text"
                }`}
                aria-pressed={style.bgOpacity === preset.value}
              >
                {preset.value === null
                  ? t("widgetStyle.opacityDefault")
                  : `${String(Math.round(preset.value * 100))}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Background blur */}
        <button
          type="button"
          onClick={() => {
            update({ blur: !style.blur });
          }}
          className="flex w-full items-center justify-between gap-2 text-left text-xs text-widget-text"
        >
          <span>{t("widgetStyle.blur")}</span>
          <span
            className={`h-4 w-7 shrink-0 rounded-full transition-colors ${
              style.blur ? "bg-accent" : "bg-widget-surface-active"
            }`}
          >
            <span
              className={`block h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform ${
                style.blur ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </span>
        </button>

        {/* Reset */}
        <button
          type="button"
          onClick={reset}
          className="w-full rounded bg-widget-surface px-2 py-1.5 text-sm text-widget-text transition-colors hover:bg-widget-surface-hover"
        >
          {t("widgetStyle.reset")}
        </button>
      </div>
    </div>
  );
}
