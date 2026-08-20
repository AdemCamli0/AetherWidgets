import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { playAlert } from "@/lib/sound";
import { readNotificationPrefs } from "@/lib/notificationPrefs";
import { translatePath } from "@/lib/i18n";
import { useToastStore } from "@/lib/toastStore";

/** Icons matching the Control Panel widget list, keyed by window label. */
const WIDGET_ICONS: Record<string, string> = {
  clock: "🕐",
  weather: "🌤️",
  system: "📊",
  calendar: "🗓️",
  notes: "📝",
  pomodoro: "🍅",
  crypto: "₿",
};

/**
 * Human-readable source of the notification, derived from the current window
 * label (e.g. "🍅 Pomodoro"), or `null` when it cannot be determined.
 */
function widgetSourceTitle(): string | null {
  try {
    const label = getCurrentWindow().label;
    const path = `widgets.${label}.name`;
    const name = translatePath(path);
    // translatePath falls back to the raw path when no translation exists
    // (e.g. the "main" control panel window).
    if (name === path) return null;
    const icon = WIDGET_ICONS[label];
    return icon ? `${icon} ${name}` : name;
  } catch {
    return null;
  }
}

/**
 * Alerts the user through three independent channels so the alert always gets
 * through:
 * 1. An in-app visual toast rendered inside the widget window (always works —
 *    immune to Focus Assist and the dev-mode PowerShell attribution).
 * 2. The configured alert sound (Web Audio, synthesized in-app).
 * 3. A native Windows notification (best-effort; suppressed in development
 *    because the toast is attributed to PowerShell, and by Focus Assist).
 *
 * The toast title is prefixed with the widget it came from (e.g.
 * "🍅 Pomodoro — Work session complete") so the source is obvious.
 *
 * The sound kind, duration, and repeat behaviour come from the global
 * notification preferences (Control Panel → Settings → Notifications).
 *
 * Shared by the Pomodoro timer, Crypto price alerts, and Clock alarms.
 * Failures are swallowed so a notification problem never breaks a widget.
 */
export async function notify(title: string, body: string): Promise<void> {
  const source = widgetSourceTitle();
  const fullTitle = source ? `${source} — ${title}` : title;

  // 1. In-app visual toast — always shown.
  try {
    useToastStore.getState().show({ title: fullTitle, body });
  } catch {
    // Toast is best-effort; never block the notification on it.
  }

  // 2. Alert sound.
  try {
    const prefs = readNotificationPrefs();
    if (prefs.sound !== "none") {
      playAlert(prefs.sound, prefs.durationSeconds, prefs.repeatUntilDismissed);
    }
  } catch {
    // Sound is best-effort; never block the notification on it.
  }

  // 3. Native Windows notification (best-effort).
  try {
    let permitted = await isPermissionGranted();
    if (!permitted) {
      const permission = await requestPermission();
      permitted = permission === "granted";
    }
    if (!permitted) return;
    sendNotification({ title: fullTitle, body });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}
