import { useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

/**
 * Drag implementation for desktop-embedded widgets.
 *
 * Primary: Tauri native `startDragging()` (WM_SYSCOMMAND/SC_MOVE).
 * Fallback: manual pointer tracking + `set_widget_position` for cases where
 * native dragging is unavailable (e.g. certain window style combinations).
 */
export function useWidgetDrag() {
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    winX: number;
    winY: number;
    active: boolean;
  } | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    // Try native dragging first.
    void getCurrentWindow()
      .startDragging()
      .then(() => {
        setIsDragging(false);
      })
      .catch(() => {
        // Native drag failed — fall back to manual tracking.
        setIsDragging(true);
        dragState.current = {
          startX: event.screenX,
          startY: event.screenY,
          winX: 0,
          winY: 0,
          active: true,
        };
        void invoke<{ x: number; y: number }>("get_widget_position").then((pos) => {
          if (dragState.current) {
            dragState.current.winX = pos.x;
            dragState.current.winY = pos.y;
          }
        });
      });
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const state = dragState.current;
    if (!state?.active) return;

    const dx = event.screenX - state.startX;
    const dy = event.screenY - state.startY;
    void invoke("set_widget_position", {
      x: state.winX + dx,
      y: state.winY + dy,
    });
  }, []);

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragState.current?.active) {
      dragState.current.active = false;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, isDragging };
}
