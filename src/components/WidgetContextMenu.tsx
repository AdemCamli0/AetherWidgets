import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  const menuRef = useRef<HTMLDivElement>(null);

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
    void invoke("quit_app");
  }, []);

  return (
    <div className="relative h-full w-full" onContextMenu={onContextMenu}>
      {children}
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute left-1/2 top-1/2 z-50 min-w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-widget-border bg-widget-bg shadow-xl backdrop-blur-xl"
        >
          <button
            role="menuitem"
            onClick={closeWidget}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-widget-text transition-colors hover:bg-white/10"
          >
            <span aria-hidden>✕</span>
            Widget'ı kapat
          </button>
        </div>
      )}
    </div>
  );
}
