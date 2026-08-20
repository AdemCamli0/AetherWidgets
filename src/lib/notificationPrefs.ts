import { useCallback, useEffect, useState } from "react";

/**
 * Global notification preferences shared by all windows.
 *
 * Persisted in localStorage and kept in sync across widget windows via the
 * `storage` event — the same mechanism used for language, theme, and
 * snap-to-grid. `notify()` reads them directly from localStorage so the
 * latest values always apply, even outside React.
 */

export type NotificationSound = "chime" | "alarm" | "none";

export interface NotificationPrefs {
  /** Which synthesized sound plays alongside each notification. */
  sound: NotificationSound;
  /** How long the sound plays, in seconds (ignored while repeating). */
  durationSeconds: number;
  /** Keep repeating the sound until the user interacts with the window. */
  repeatUntilDismissed: boolean;
}

export const NOTIFICATION_PREFS_KEY = "aetherwidgets-notification-prefs";

/** Duration choices (seconds) offered in the Control Panel. */
export const NOTIFICATION_DURATION_OPTIONS = [3, 5, 10, 30];

const DEFAULT_PREFS: NotificationPrefs = {
  sound: "chime",
  durationSeconds: 5,
  repeatUntilDismissed: false,
};

function isSound(value: unknown): value is NotificationSound {
  return value === "chime" || value === "alarm" || value === "none";
}

export function readNotificationPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return {
      sound: isSound(parsed.sound) ? parsed.sound : DEFAULT_PREFS.sound,
      durationSeconds:
        typeof parsed.durationSeconds === "number" &&
        NOTIFICATION_DURATION_OPTIONS.includes(parsed.durationSeconds)
          ? parsed.durationSeconds
          : DEFAULT_PREFS.durationSeconds,
      repeatUntilDismissed:
        typeof parsed.repeatUntilDismissed === "boolean"
          ? parsed.repeatUntilDismissed
          : DEFAULT_PREFS.repeatUntilDismissed,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeNotificationPrefs(patch: Partial<NotificationPrefs>): NotificationPrefs {
  const next = { ...readNotificationPrefs(), ...patch };
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
  return next;
}

/**
 * React binding for the notification preferences: live state kept in sync
 * across windows via the `storage` event, plus an updater that persists
 * changes.
 */
export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(readNotificationPrefs);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === NOTIFICATION_PREFS_KEY) {
        setPrefs(readNotificationPrefs());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const update = useCallback((patch: Partial<NotificationPrefs>) => {
    setPrefs(writeNotificationPrefs(patch));
  }, []);

  return { prefs, update };
}
