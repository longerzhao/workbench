import { create } from 'zustand';
import { newId } from '@/lib/id';

export type ToastTone = 'default' | 'success' | 'danger';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  /** 秒；0 表示不自动消失 */
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  push: (message: string, tone?: ToastTone, duration?: number) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],

  push: (message, tone = 'default', duration = 3) => {
    const id = newId('toast');
    set((state) => ({ items: [...state.items, { id, message, tone, duration }] }));

    if (duration > 0) {
      window.setTimeout(() => get().dismiss(id), duration * 1000);
    }
    return id;
  },

  dismiss: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  clear: () => set({ items: [] }),
}));

/** 组件外也能调用：toast('已导出') */
export function toast(message: string, tone: ToastTone = 'default', duration = 3): string {
  return useToastStore.getState().push(message, tone, duration);
}
