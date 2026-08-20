import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import {
  LAYOUT_TEMPLATES,
  applyLayout,
  buildLayoutExport,
  captureCurrentLayouts,
  deleteCustomLayout,
  getPrimaryMonitorRect,
  parseLayoutExport,
  readCustomLayouts,
  saveCustomLayout,
  type CustomLayout,
  type WidgetLayoutEntry,
} from "@/lib/layoutTemplates";

interface LayoutManagerProps {
  onClose: () => void;
}

/**
 * Layout manager dialog for the control panel: apply pre-made layout
 * templates, save the current arrangement as a custom layout, and import or
 * export layouts as JSON.
 */
export function LayoutManager({ onClose }: LayoutManagerProps) {
  const { t } = useLanguage();
  const [customLayouts, setCustomLayouts] = useState<CustomLayout[]>(() => readCustomLayouts());
  const [saveName, setSaveName] = useState("");
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
    };
  }, [onClose]);

  const run = useCallback(
    async (action: () => Promise<void>, okMessage: string) => {
      setBusy(true);
      setStatus(null);
      try {
        await action();
        setStatus({ kind: "ok", text: okMessage });
      } catch (err) {
        console.error("Layout action failed:", err);
        setStatus({ kind: "error", text: t("layoutManager.error") });
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      void run(async () => {
        const template = LAYOUT_TEMPLATES.find((entry) => entry.id === templateId);
        if (!template) return;
        const monitor = await getPrimaryMonitorRect();
        await applyLayout(template.build(monitor));
      }, t("layoutManager.applied"));
    },
    [run, t],
  );

  const applyCustom = useCallback(
    (layout: CustomLayout) => {
      void run(async () => {
        await applyLayout(layout.entries);
      }, t("layoutManager.applied"));
    },
    [run, t],
  );

  const saveCurrent = useCallback(() => {
    const name = saveName.trim();
    if (!name) {
      setStatus({ kind: "error", text: t("layoutManager.nameRequired") });
      return;
    }
    void run(async () => {
      const entries = await captureCurrentLayouts();
      if (entries.length === 0) {
        throw new Error("No open widgets to save.");
      }
      setCustomLayouts(saveCustomLayout(name, entries));
      setSaveName("");
    }, t("layoutManager.saved"));
  }, [run, saveName, t]);

  const removeCustom = useCallback((id: string) => {
    setCustomLayouts(deleteCustomLayout(id));
  }, []);

  const exportCurrent = useCallback(() => {
    void run(async () => {
      const entries = await captureCurrentLayouts();
      if (entries.length === 0) {
        throw new Error("No open widgets to export.");
      }
      const json = buildLayoutExport(entries);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "aetherwidgets-layout.json";
      anchor.click();
      URL.revokeObjectURL(url);
    }, t("layoutManager.exported"));
  }, [run, t]);

  const onImportFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      void run(async () => {
        const text = await file.text();
        const entries: WidgetLayoutEntry[] = parseLayoutExport(text);
        await applyLayout(entries);
      }, t("layoutManager.imported"));
    },
    [run, t],
  );

  return (
    <div
      role="dialog"
      aria-label={t("layoutManager.title")}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-full w-80 overflow-y-auto rounded-lg border border-widget-border bg-widget-bg p-3 shadow-xl backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-widget-text">{t("layoutManager.title")}</span>
          <button
            onClick={onClose}
            className="rounded px-1 text-widget-muted transition-colors hover:bg-widget-surface-hover hover:text-widget-text"
            aria-label={t("widgetContextMenu.cancel")}
          >
            ✕
          </button>
        </div>

        {/* Pre-made templates */}
        <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
          {t("layoutManager.templates")}
        </div>
        <div className="mb-3 flex flex-col gap-1">
          {LAYOUT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              disabled={busy}
              onClick={() => {
                applyTemplate(template.id);
              }}
              className="flex items-center justify-between gap-2 rounded-md border border-widget-border px-2.5 py-2 text-left transition-colors hover:bg-widget-surface-hover disabled:opacity-50"
            >
              <span>
                <span className="block text-xs font-medium text-widget-text">
                  {t(template.nameKey)}
                </span>
                <span className="block text-[10px] text-widget-muted">
                  {t(template.descriptionKey)}
                </span>
              </span>
              <span className="text-[10px] font-semibold text-accent">
                {t("layoutManager.apply")}
              </span>
            </button>
          ))}
        </div>

        {/* Save current arrangement */}
        <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
          {t("layoutManager.saveCurrent")}
        </div>
        <div className="mb-3 flex gap-1">
          <input
            value={saveName}
            onChange={(e) => {
              setSaveName(e.target.value);
            }}
            placeholder={t("layoutManager.namePlaceholder")}
            className="min-w-0 flex-1 rounded-md border border-widget-border bg-widget-surface px-2 py-1.5 text-xs text-widget-text placeholder:text-widget-muted focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={saveCurrent}
            className="rounded-md bg-accent/20 px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/30 disabled:opacity-50"
          >
            {t("layoutManager.save")}
          </button>
        </div>

        {/* Custom layouts */}
        {customLayouts.length > 0 && (
          <>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
              {t("layoutManager.customLayouts")}
            </div>
            <div className="mb-3 flex flex-col gap-1">
              {customLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-widget-border px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-widget-text">
                    {layout.name}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      applyCustom(layout);
                    }}
                    className="text-[10px] font-semibold text-accent transition-colors hover:text-widget-text disabled:opacity-50"
                  >
                    {t("layoutManager.apply")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeCustom(layout.id);
                    }}
                    className="text-[10px] text-widget-muted transition-colors hover:text-red-400"
                    aria-label={t("layoutManager.delete")}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Import / export */}
        <div className="mb-1 text-[10px] uppercase tracking-wide text-widget-muted">
          {t("layoutManager.importExport")}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={exportCurrent}
            className="flex-1 rounded-md border border-widget-border px-2 py-1.5 text-xs text-widget-text transition-colors hover:bg-widget-surface-hover disabled:opacity-50"
          >
            {t("layoutManager.export")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="flex-1 rounded-md border border-widget-border px-2 py-1.5 text-xs text-widget-text transition-colors hover:bg-widget-surface-hover disabled:opacity-50"
          >
            {t("layoutManager.import")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onImportFile}
          />
        </div>

        {status && (
          <div
            className={`mt-2 rounded-md px-2 py-1.5 text-[11px] ${
              status.kind === "ok" ? "bg-accent/15 text-accent" : "bg-red-500/15 text-red-400"
            }`}
            role="status"
          >
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
