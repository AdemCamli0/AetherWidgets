import { create } from "zustand";

/** Data for the in-app visual toast. */
export interface ToastData {
  title: string;
  body: string;
}

interface ToastState {
  toast: ToastData | null;
  show: (toast: ToastData) => void;
  hide: () => void;
}

/**
 * Per-window in-app toast store.
 *
 * Native Windows toasts are unreliable in development (they are attributed to
 * Windows PowerShell and suppressed by Focus Assist / per-app settings), so
 * `notify()` also drives this store to render a toast inside the widget
 * window itself — guaranteeing the alert is visible regardless of the OS
 * notification state. Each widget window is its own webview, so each gets its
 * own store instance and shows its own toast.
 */
export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (toast) => {
    set({ toast });
  },
  hide: () => {
    set({ toast: null });
  },
}));
