import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * 消息已读状态。消息本身是派生的（见 lib/messageCenter.ts），
 * 只有"读过没有"需要记住——它不是数据，是界面偏好，
 * 所以放 localStorage 而不是 IndexedDB，导出备份时也不带走。
 */

const KEY = 'workbench:messages';
/** 超过这个天数的已读记录清掉，防止 map 无限增长 */
const RETENTION_DAYS = 30;
const DAY_MS = 86_400_000;

interface MessageState {
  /** id → 读取时刻的 ISO 串 */
  readAt: Record<string, string>;
  markRead: (id: string) => void;
  markAllRead: (ids: string[]) => void;
}

export const useMessageStore = create<MessageState>()(
  persist(
    (set) => ({
      readAt: {},

      markRead: (id) =>
        set((state) => {
          if (state.readAt[id]) return state;
          return { readAt: { ...state.readAt, [id]: new Date().toISOString() } };
        }),

      markAllRead: (ids) =>
        set((state) => {
          const now = new Date().toISOString();
          const next = { ...state.readAt };
          for (const id of ids) next[id] = now;
          return { readAt: next };
        }),
    }),
    {
      name: KEY,
      version: 1,
      /** 读取时顺手清理过期记录，顺手做掉，不用单独跑维护任务 */
      merge: (persisted, current) => {
        const saved = (persisted as { readAt?: Record<string, string> } | undefined)?.readAt ?? {};
        const cutoff = Date.now() - RETENTION_DAYS * DAY_MS;
        const fresh: Record<string, string> = {};
        for (const [id, at] of Object.entries(saved)) {
          const time = new Date(at).getTime();
          if (!Number.isNaN(time) && time >= cutoff) fresh[id] = at;
        }
        return { ...current, readAt: fresh };
      },
    },
  ),
);