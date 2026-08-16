import { useCallback, useEffect } from "react";
import { create } from "zustand";
import { getCurrentWindow } from "@tauri-apps/api/window";

const STORAGE_PREFIX = "aetherwidgets-pinned-";

// Each widget window runs its own webview, so this module (and the store
// below) is instantiated once per widget. `getCurrentWindow().label` and
// `localStorage` are both available synchronously at module scope in a Tauri
// webview, so we can hydrate the initial pin state without a flash.
const windowLabel = getCurrentWindow().label;
const storageKey = STORAGE_PREFIX + windowLabel;

interface PinState {
  pinned: boolean;
  setPinned: (value: boolean) => void;
}

/**
 * Per-window pin store. Within a single widget window, every consumer (e.g.
 * the Notes header button and the right-click context menu) shares this store,
 * keeping them in sync.
 */
const usePinStore = create<PinState>((set) => ({
  pinned: localStorage.getItem(storageKey) === "true",
  setPinned: (value) => {
    set({ pinned: value });
  },
}));

/**
 * Per-widget "always on top" pinning.
 *
 * Each widget window pins itself independently via `getCurrentWindow()`, so
 * toggling the pin in one widget only affects that widget's own window. The
 * preference is persisted in localStorage (shared across windows of the same
 * origin) keyed by the window label, so it survives widget restarts.
 */
export function useAlwaysOnTop() {
  const pinned = usePinStore((state) => state.pinned);
  const setPinned = usePinStore((state) => state.setPinned);

  // Apply the always-on-top state to the window and persist the preference.
  useEffect(() => {
    localStorage.setItem(storageKey, String(pinned));
    void getCurrentWindow().setAlwaysOnTop(pinned);
  }, [pinned]);

  const togglePinned = useCallback(() => {
    setPinned(!usePinStore.getState().pinned);
  }, [setPinned]);

  return { pinned, togglePinned };
}
