import { create } from 'zustand';

/** search = 常规搜索；create = 直接输入标题新建（N 键进入） */
export type CommandMode = 'search' | 'create';

interface CommandState {
  open: boolean;
  mode: CommandMode;
  openPalette: (mode?: CommandMode) => void;
  closePalette: () => void;
}

/**
 * 命令面板的开关。刻意不做 persist：
 * 这是一个瞬时状态，刷新后不该自己弹出来。
 */
export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  mode: 'search',
  openPalette: (mode = 'search') => set({ open: true, mode }),
  closePalette: () => set({ open: false }),
}));
