/**
 * トースト通知ストア
 * アプリ全体で使用する通知システム
 */
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number; // ミリ秒、undefinedで自動消去しない
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    const newToast: Toast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // 自動消去
    const duration = toast.duration ?? (toast.type === 'error' ? 8000 : 4000);
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => {
    set({ toasts: [] });
  },
}));

// ヘルパー関数
export const toast = {
  success: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'success', message, description }),
  error: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'error', message, description }),
  warning: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'warning', message, description }),
  info: (message: string, description?: string) =>
    useToastStore.getState().addToast({ type: 'info', message, description }),
};
