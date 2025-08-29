import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  message: string | null;
  type: ToastType;
  visible: boolean;
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
}

const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  visible: false,
  
  showToast: (message, type) => {
    set({ message, type, visible: true });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      set((state) => {
        // Only hide if this is still the same toast
        if (state.message === message) {
          return { visible: false };
        }
        return state;
      });
    }, 5000);
  },
  
  hideToast: () => set({ visible: false }),
}));

export default useToastStore;