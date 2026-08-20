import { useEffect } from "react";
import { useToastStore } from "@/lib/toastStore";
import { readNotificationPrefs } from "@/lib/notificationPrefs";

/**
 * In-app visual toast rendered inside the widget window.
 *
 * Shown whenever `notify()` fires, so the alert is visible even when Windows
 * suppresses the native toast (Focus Assist, or the dev-mode PowerShell
 * attribution). Auto-dismisses after the configured notification duration and
 * can be dismissed early by clicking it.
 */
export function InAppToast() {
  const toast = useToastStore((state) => state.toast);
  const hide = useToastStore((state) => state.hide);

  useEffect(() => {
    if (!toast) return;
    const { durationSeconds } = readNotificationPrefs();
    const id = window.setTimeout(hide, Math.max(durationSeconds, 3) * 1000);
    return () => {
      window.clearTimeout(id);
    };
  }, [toast, hide]);

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed inset-x-2 top-2 z-100 flex justify-center">
      <button
        type="button"
        onClick={hide}
        className="pointer-events-auto max-w-full cursor-pointer rounded-lg border border-widget-border bg-widget-bg px-3 py-2 text-left shadow-xl backdrop-blur-xl transition-opacity"
      >
        <div className="text-xs font-semibold text-widget-text">{toast.title}</div>
        {toast.body && <div className="mt-0.5 text-[11px] text-widget-muted">{toast.body}</div>}
      </button>
    </div>
  );
}
