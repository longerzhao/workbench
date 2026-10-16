import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface CardPrefs {
  /** 卡片显示顺序；未在列表中的卡片按默认顺序追加在后面 */
  order: string[];
  hidden: string[];
}

interface UIState {
  theme: ThemeMode;
  /** 顶栏问候语里的称呼，可在设置里改 */
  displayName: string;
  /** 侧栏头像：压缩后的 data URL；空则用默认图标 */
  avatarDataUrl: string | null;
  sidebarCollapsed: boolean;
  cards: CardPrefs;
  setTheme: (theme: ThemeMode) => void;
  setDisplayName: (name: string) => void;
  setAvatarDataUrl: (url: string | null) => void;
  cycleTheme: () => void;
  toggleSidebar: () => void;
  setCardOrder: (order: string[]) => void;
  toggleCard: (id: string) => void;
  resetCards: () => void;
}

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      displayName: 'zlong',
      avatarDataUrl: null,
      sidebarCollapsed: false,
      cards: { order: [], hidden: [] },

      setTheme: (theme) => set({ theme }),

      setDisplayName: (displayName) => set({ displayName: displayName.trim() || 'zlong' }),

      setAvatarDataUrl: (avatarDataUrl) => set({ avatarDataUrl }),

      cycleTheme: () => {
        const current = get().theme;
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
        set({ theme: next ?? 'system' });
      },

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCardOrder: (order) => set((state) => ({ cards: { ...state.cards, order } })),

      toggleCard: (id) =>
        set((state) => {
          const hidden = state.cards.hidden.includes(id)
            ? state.cards.hidden.filter((x) => x !== id)
            : [...state.cards.hidden, id];
          return { cards: { ...state.cards, hidden } };
        }),

      resetCards: () => set({ cards: { order: [], hidden: [] } }),
    }),
    {
      // 必须与 index.html 内联脚本读取的 key 一致，否则首屏会闪一下浅色
      name: 'workbench:ui',
      version: 1,
    },
  ),
);

/** 把主题模式解析成真正要应用的明暗值 */
export function resolveDark(theme: ThemeMode, prefersDark: boolean): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return prefersDark;
}
