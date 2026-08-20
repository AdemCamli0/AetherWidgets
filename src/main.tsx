import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { WidgetPrefsProvider } from "./lib/widgetPrefs";
import { DisplayPrefsProvider } from "./lib/displayPrefs";
import "./styles/globals.css";

// Surface runtime errors visibly instead of a blank white window.
function showFatalError(message: string) {
  const el = document.createElement("pre");
  el.style.cssText =
    "position:fixed;inset:0;background:#1a1a24;color:#ff6b6b;padding:12px;font:12px monospace;white-space:pre-wrap;z-index:99999;overflow:auto;";
  el.textContent = `AetherWidgets error:\n${message}`;
  document.body.appendChild(el);
}

window.addEventListener("error", (event) => {
  showFatalError(`${event.message}\n${event.filename}:${String(event.lineno)}`);
});

window.addEventListener("unhandledrejection", (event) => {
  showFatalError(`Unhandled promise rejection:\n${String(event.reason)}`);
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element not found. Ensure index.html contains <div id="root"></div>.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <WidgetPrefsProvider>
        <DisplayPrefsProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </DisplayPrefsProvider>
      </WidgetPrefsProvider>
    </ThemeProvider>
  </StrictMode>,
);
