import { create } from 'zustand';
import { nanoid } from 'nanoid';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
  createdAt: Date;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message?: string, options?: Partial<Toast>) => string;
  error: (title: string, message?: string, options?: Partial<Toast>) => string;
  warning: (title: string, message?: string, options?: Partial<Toast>) => string;
  info: (title: string, message?: string, options?: Partial<Toast>) => string;
}

const DEFAULT_DURATION = 5000;

const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = nanoid();
    const newToast: Toast = {
      ...toast,
      id,
      createdAt: new Date(),
      duration: toast.duration ?? DEFAULT_DURATION
    };
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // Auto-remove toast after duration (unless persistent)
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
  
  clearAll: () => {
    set({ toasts: [] });
  },
  
  success: (title, message, options = {}) => {
    return get().addToast({
      type: 'success',
      title,
      message,
      ...options
    });
  },
  
  error: (title, message, options = {}) => {
    return get().addToast({
      type: 'error',
      title,
      message,
      duration: options.duration ?? 8000, // Longer duration for errors
      ...options
    });
  },
  
  warning: (title, message, options = {}) => {
    return get().addToast({
      type: 'warning',
      title,
      message,
      ...options
    });
  },
  
  info: (title, message, options = {}) => {
    return get().addToast({
      type: 'info',
      title,
      message,
      ...options
    });
  }
}));

export type { Toast, ToastType };
export default useToastStore;