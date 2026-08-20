import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light" | "auto";

const STORAGE_KEY = "aetherwidgets-theme";
const SUPPORTED_THEMES: Theme[] = ["dark", "light", "auto"];
const DEFAULT_THEME: Theme = "dark";

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolves "auto" to the concrete theme implied by the OS preference. */
export function resolveTheme(theme: Theme): "dark" | "light" {
  return theme === "auto" ? (systemPrefersDark() ? "dark" : "light") : theme;
}

function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && SUPPORTED_THEMES.includes(raw as Theme)) {
      return raw as Theme;
    }
  } catch {
    // Ignore storage failures and fall back to default.
  }
  return DEFAULT_THEME;
}

// Apply the stored theme as early as possible (before React renders) so
// windows that previously selected the light theme don't flash dark.
document.documentElement.dataset.theme = resolveTheme(readStoredTheme());

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applies the theme to the document and keeps every window in sync.
 *
 * Each widget runs in its own webview window with its own localStorage, so the
 * preference is propagated through the `storage` event (fired in other windows
 * on the same origin) — the same mechanism used for the language preference.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
    document.documentElement.dataset.theme = resolveTheme(theme);
  }, [theme]);

  // While in "auto" mode, follow live OS color-scheme changes.
  useEffect(() => {
    if (theme !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      document.documentElement.dataset.theme = resolveTheme("auto");
    };
    media.addEventListener("change", onChange);
    return () => {
      media.removeEventListener("change", onChange);
    };
  }, [theme]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (event.newValue && SUPPORTED_THEMES.includes(event.newValue as Theme)) {
        setTheme(event.newValue as Theme);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => {
        setTheme((current) => (current === "dark" ? "light" : "dark"));
      },
    }),
    [theme],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
