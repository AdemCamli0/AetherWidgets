import { useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { useWidgetPrefs } from "@/lib/widgetPrefs";

/** Grid cell size (logical pixels) used when snap-to-grid is enabled. */
const GRID_SIZE = 8;

/**
 * Maximum distance (logical pixels) at which a dragged widget edge/center
 * will magnetize to another widget's edge/center.
 */
const WIDGET_SNAP_THRESHOLD = 10;

interface WidgetRect {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function snapValue(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Finds the smallest adjustment (within the threshold) that aligns the dragged
 * widget's edges/center on one axis with another widget's edges/center.
 *
 * Covers both alignment (left↔left, right↔right, center↔center) and adjacency
 * (my left touching their right, my right touching their left) so widgets can
 * sit neatly side by side as well as lined up.
 *
 * Returns the delta to apply, or `null` if nothing is close enough.
 */
function nearestSnapDelta(
  selfEdges: { left: number; right: number; center: number },
  otherEdges: { left: number; right: number; center: number },
): number | null {
  const candidates = [
    otherEdges.left - selfEdges.left, // align leading edges
    otherEdges.right - selfEdges.right, // align trailing edges
    otherEdges.center - selfEdges.center, // align centers
    otherEdges.right - selfEdges.left, // adjacent: my leading edge touches their trailing
    otherEdges.left - selfEdges.right, // adjacent: my trailing edge touches their leading
  ];

  let best: number | null = null;
  for (const delta of candidates) {
    if (Math.abs(delta) > WIDGET_SNAP_THRESHOLD) continue;
    if (best === null || Math.abs(delta) < Math.abs(best)) {
      best = delta;
    }
  }
  return best;
}

/**
 * Computes widget-to-widget snap adjustments for a proposed position.
 * Returns per-axis deltas (`null` when that axis has no nearby snap target).
 */
function computeWidgetSnap(
  x: number,
  y: number,
  selfWidth: number,
  selfHeight: number,
  others: WidgetRect[],
): { dx: number | null; dy: number | null } {
  if (others.length === 0 || selfWidth <= 0 || selfHeight <= 0) {
    return { dx: null, dy: null };
  }

  const selfX = { left: x, right: x + selfWidth, center: x + selfWidth / 2 };
  const selfY = { left: y, right: y + selfHeight, center: y + selfHeight / 2 };

  let dx: number | null = null;
  let dy: number | null = null;

  for (const other of others) {
    const otherX = {
      left: other.x,
      right: other.x + other.width,
      center: other.x + other.width / 2,
    };
    const otherY = {
      left: other.y,
      right: other.y + other.height,
      center: other.y + other.height / 2,
    };

    const candidateX = nearestSnapDelta(selfX, otherX);
    if (candidateX !== null && (dx === null || Math.abs(candidateX) < Math.abs(dx))) {
      dx = candidateX;
    }

    const candidateY = nearestSnapDelta(selfY, otherY);
    if (candidateY !== null && (dy === null || Math.abs(candidateY) < Math.abs(dy))) {
      dy = candidateY;
    }
  }

  return { dx, dy };
}

interface DragState {
  startX: number;
  startY: number;
  winX: number;
  winY: number;
  active: boolean;
  /** Size of the dragged widget (logical px); 0 until rects are loaded. */
  selfWidth: number;
  selfHeight: number;
  /** Rectangles of the other open widgets, used for widget-to-widget snap. */
  others: WidgetRect[];
}

/**
 * Drag implementation for desktop widgets.
 *
 * Dragging always uses manual pointer tracking so the position can be
 * adjusted while moving. Two snap behaviours compose:
 *  - Widget-to-widget snap (always on): the dragged widget magnetizes to the
 *    edges/centers of other open widgets, and can dock against them.
 *  - Snap-to-grid (toggle in the Control Panel): aligns to an 8px grid when
 *    no widget snap is active on that axis.
 *
 * All math runs in logical (CSS) pixels end-to-end so dragging stays accurate
 * on displays with non-100% scaling.
 */
export function useWidgetDrag() {
  const { snapToGrid } = useWidgetPrefs();
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<DragState | null>(null);

  const startManualDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    setIsDragging(true);
    dragState.current = {
      startX: event.screenX,
      startY: event.screenY,
      winX: 0,
      winY: 0,
      active: true,
      selfWidth: 0,
      selfHeight: 0,
      others: [],
    };

    const selfLabel = getCurrentWindow().label;
    void Promise.all([
      invoke<{ x: number; y: number }>("get_widget_position").catch(() => ({ x: 0, y: 0 })),
      invoke<WidgetRect[]>("get_widget_rects").catch(() => [] as WidgetRect[]),
    ]).then(([pos, rects]) => {
      const state = dragState.current;
      if (!state) return;
      state.winX = pos.x;
      state.winY = pos.y;
      const self = rects.find((r) => r.label === selfLabel);
      state.selfWidth = self?.width ?? 0;
      state.selfHeight = self?.height ?? 0;
      state.others = rects.filter((r) => r.label !== selfLabel);
    });
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;

      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      // Always drag manually so widget-to-widget (and optional grid) snapping
      // can adjust the position while moving.
      startManualDrag(event);
    },
    [startManualDrag],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const state = dragState.current;
      if (!state?.active) return;

      const dx = event.screenX - state.startX;
      const dy = event.screenY - state.startY;
      let x = state.winX + dx;
      let y = state.winY + dy;

      // Widget-to-widget snap takes priority; fall back to the grid per axis.
      const snap = computeWidgetSnap(x, y, state.selfWidth, state.selfHeight, state.others);
      if (snap.dx !== null) {
        x += snap.dx;
      } else if (snapToGrid) {
        x = snapValue(x);
      }
      if (snap.dy !== null) {
        y += snap.dy;
      } else if (snapToGrid) {
        y = snapValue(y);
      }

      // Center-alignment snaps can produce half-pixel deltas (odd widget
      // sizes); the backend expects integer logical pixels.
      void invoke("set_widget_position", { x: Math.round(x), y: Math.round(y) });
    },
    [snapToGrid],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (dragState.current?.active) {
      dragState.current.active = false;
      setIsDragging(false);
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, isDragging };
}
