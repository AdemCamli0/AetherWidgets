import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useLanguage } from "@/lib/i18n";
import { useAlwaysOnTop } from "@/lib/useAlwaysOnTop";
import { useWidgetStyle } from "@/lib/widgetStylePrefs";
import { WidgetSizeEditor } from "@/components/WidgetSizeEditor";
import { WidgetStyleEditor } from "@/components/WidgetStyleEditor";

interface WidgetContextMenuProps {
  children: ReactNode;
}

interface MenuState {
  x: number;
  y: number;
}

/**
 * Right-click context menu for widgets: close widget.
 * Rendered inline (inside the widget window) since native menus are not
 * available for undecorated desktop-embedded windows.
 */
export function WidgetContextMenu({ children }: WidgetContextMenuProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [showSizeEditor, setShowSizeEditor] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const { pinned, togglePinned } = useAlwaysOnTop();
  const { cssVars } = useWidgetStyle();

  const closeMenu = useCallback(() => {
    setMenu(null);
  }, []);

  useEffect(() => {
    if (!menu) return;

    const onGlobalPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("pointerdown", onGlobalPointerDown, true);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointerdown", onGlobalPointerDown, true);
      window.removeEventListener("keydown", onEscape);
    };
  }, [menu, closeMenu]);

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    // Center the menu within the widget window instead of using cursor position.
    // This prevents the menu from overflowing outside the widget bounds.
    setMenu({ x: 0, y: 0 });
  }, []);

  const closeWidget = useCallback(() => {
    const label = getCurrentWindow().label;
    void invoke("close_widget", { label }).catch((err: unknown) => {
      console.error("Failed to close widget:", err);
    });
  }, []);

  return (
    <div
      className="group/widget relative h-full w-full"
      style={cssVars}
      onContextMenu={onContextMenu}
    >
      {children}
      <button
        onClick={togglePinned}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        className={`absolute right-1.5 top-1.5 z-40 rounded-md px-1 py-0.5 text-xs backdrop-blur-sm transition-all ${
          pinned
            ? "bg-accent/25 text-accent opacity-100"
            : "bg-widget-chip text-widget-muted opacity-0 hover:bg-widget-surface-hover hover:text-widget-text group-hover/widget:opacity-100"
        }`}
        title={pinned ? t("widgetContextMenu.unpin") : t("widgetContextMenu.pin")}
        aria-label={pinned ? t("widgetContextMenu.unpin") : t("widgetContextMenu.pin")}
      >
        📌
      </button>
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute left-1/2 top-1/2 z-50 min-w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-widget-border bg-widget-bg shadow-xl backdrop-blur-xl"
        >
          <button
            role="menuitem"
            onClick={() => {
              togglePinned();
              closeMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-widget-text transition-colors hover:bg-widget-surface-hover"
          >
            <span aria-hidden>📌</span>
            {pinned ? t("widgetContextMenu.unpin") : t("widgetContextMenu.pin")}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setShowSizeEditor(true);
              closeMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-widget-text transition-colors hover:bg-widget-surface-hover"
          >
            <span aria-hidden>↔</span>
            {t("widgetContextMenu.resize")}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              setShowStyleEditor(true);
              closeMenu();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-widget-text transition-colors hover:bg-widget-surface-hover"
          >
            <span aria-hidden>🎨</span>
            {t("widgetContextMenu.style")}
          </button>
          <button
            role="menuitem"
            onClick={closeWidget}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-widget-text transition-colors hover:bg-widget-surface-hover"
          >
            <span aria-hidden>✕</span>
            {t("widgetContextMenu.closeWidget")}
          </button>
          <button
            role="menuitem"
            onClick={closeMenu}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-widget-muted transition-colors hover:bg-widget-surface-hover"
          >
            <span aria-hidden>↩</span>
            {t("widgetContextMenu.cancel")}
          </button>
        </div>
      )}
      {showSizeEditor && (
        <WidgetSizeEditor
          onClose={() => {
            setShowSizeEditor(false);
          }}
        />
      )}
      {showStyleEditor && (
        <WidgetStyleEditor
          onClose={() => {
            setShowStyleEditor(false);
          }}
        />
      )}
    </div>
  );
}
