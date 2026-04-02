import { create } from 'zustand';

const DEFAULT_DURATION_MS = 3500;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useToastStore = create((set, get) => ({
  toasts: [],

  show: (toast) => {
    const id = toast.id || uid();
    const durationMs =
      typeof toast.durationMs === 'number' ? toast.durationMs : DEFAULT_DURATION_MS;

    set((s) => ({
      toasts: [
        ...s.toasts,
        {
          id,
          type: toast.type || 'info',
          title: toast.title || '',
          description: toast.description || '',
          durationMs,
          createdAt: Date.now(),
        },
      ],
    }));

    if (durationMs > 0) {
      window.setTimeout(() => {
        get().dismiss(id);
      }, durationMs);
    }

    return id;
  },

  success: (message, opts = {}) =>
    get().show({ type: 'success', description: message, ...opts }),

  error: (message, opts = {}) =>
    get().show({ type: 'error', description: message, ...opts }),

  info: (message, opts = {}) =>
    get().show({ type: 'info', description: message, ...opts }),

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

