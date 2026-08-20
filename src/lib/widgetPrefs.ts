import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const SNAP_KEY = "aetherwidgets-snap-to-grid";

function readStoredSnapToGrid(): boolean {
  try {
    return localStorage.getItem(SNAP_KEY) === "true";
  } catch {
    return false;
  }
}

interface WidgetPrefsContextValue {
  snapToGrid: boolean;
  setSnapToGrid: (value: boolean) => void;
}

const WidgetPrefsContext = createContext<WidgetPrefsContextValue | null>(null);

/**
 * Shared widget preferences (snap-to-grid).
 *
 * Persisted in localStorage and kept in sync across all widget windows via
 * the `storage` event — the same mechanism used for language and theme.
 */
export function WidgetPrefsProvider({ children }: { children: ReactNode }) {
  const [snapToGrid, setSnapToGridState] = useState<boolean>(readStoredSnapToGrid);

  const setSnapToGrid = useCallback((value: boolean) => {
    setSnapToGridState(value);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SNAP_KEY, String(snapToGrid));
    } catch {
      // Ignore storage failures.
    }
  }, [snapToGrid]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SNAP_KEY && event.newValue !== null) {
        setSnapToGridState(event.newValue === "true");
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<WidgetPrefsContextValue>(
    () => ({ snapToGrid, setSnapToGrid }),
    [snapToGrid, setSnapToGrid],
  );

  return createElement(WidgetPrefsContext.Provider, { value }, children);
}

export function useWidgetPrefs() {
  const context = useContext(WidgetPrefsContext);
  if (!context) {
    throw new Error("useWidgetPrefs must be used within a WidgetPrefsProvider");
  }
  return context;
}
