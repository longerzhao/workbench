import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  clampDebounceSec,
  DEFAULT_SYNC_CONFIG,
  isSyncConfigured,
  normalizePath,
  type ConflictPolicy,
  type SyncConfig,
} from '@/lib/githubSync';

/**
 * GitHub 同步的配置与运行时状态。
 *
 * 配置分两类：
 * - 用户配置（owner/repo/token/…）持久化，让用户配一次就能长期用
 * - 运行时状态（同步中、上次结果、远端 sha）只留内存，刷新即清空
 *
 * Token 的存储策略由 `rememberToken` 决定：为 false 时 partialize 不写 token 字段，
 * 但内存里仍然保留（本次会话可用），刷新后自然消失。
 */

const KEY = 'workbench:sync';

/** 最近一次同步的结果，只用于 UI 展示 */
export type SyncPhase = 'idle' | 'pushing' | 'pulling' | 'testing';

export interface SyncRuntime {
  phase: SyncPhase;
  /** 上次成功同步的时刻（ISO） */
  lastSyncedAt: string | null;
  /** 远端文件当前的 sha，push 时用作乐观锁 */
  remoteSha: string | null;
  lastError: string | null;
  /** 上次成功同步的方向，用于「已同步」这类文案 */
  lastDirection: 'push' | 'pull' | null;
}

interface SyncState extends SyncConfig {
  runtime: SyncRuntime;

  setConfig: (patch: Partial<SyncConfig>) => void;
  setToken: (token: string) => void;
  setDebounceSec: (seconds: number) => void;
  setConflict: (policy: ConflictPolicy) => void;
  resetConfig: () => void;

  setPhase: (phase: SyncPhase) => void;
  setRemoteSha: (sha: string | null) => void;
  markSynced: (direction: 'push' | 'pull') => void;
  setError: (message: string | null) => void;
}

const INITIAL_RUNTIME: SyncRuntime = {
  phase: 'idle',
  lastSyncedAt: null,
  remoteSha: null,
  lastError: null,
  lastDirection: null,
};

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      ...DEFAULT_SYNC_CONFIG,
      runtime: INITIAL_RUNTIME,

      setConfig: (patch) =>
        set((state) => {
          const next: Partial<SyncState> = { ...patch };
          // 路径统一去掉首尾斜杠，避免拼出双斜杠的 URL
          if (typeof patch.path === 'string') next.path = normalizePath(patch.path);
          if (typeof patch.debounceSec === 'number') {
            next.debounceSec = clampDebounceSec(patch.debounceSec);
          }
          // 关掉「记住令牌」时立刻把已落盘的令牌擦掉，不等下次刷新
          if (patch.rememberToken === false && !state.rememberToken) {
            next.rememberToken = false;
          }
          return next;
        }),

      setToken: (token) => set({ token }),

      setDebounceSec: (seconds) => set({ debounceSec: clampDebounceSec(seconds) }),

      setConflict: (conflict) => set({ conflict }),

      resetConfig: () =>
        set((state) => ({
          ...DEFAULT_SYNC_CONFIG,
          // 保留 token：用户多半只是想把仓库改回默认值，而不是重新粘贴令牌
          token: state.token,
          rememberToken: state.rememberToken,
          runtime: { ...INITIAL_RUNTIME },
        })),

      setPhase: (phase) => set((state) => ({ runtime: { ...state.runtime, phase } })),

      setRemoteSha: (remoteSha) => set((state) => ({ runtime: { ...state.runtime, remoteSha } })),

      markSynced: (direction) =>
        set((state) => ({
          runtime: {
            ...state.runtime,
            phase: 'idle',
            lastError: null,
            lastDirection: direction,
            lastSyncedAt: new Date().toISOString(),
          },
        })),

      setError: (lastError) =>
        set((state) => ({ runtime: { ...state.runtime, phase: 'idle', lastError } })),
    }),
    {
      name: KEY,
      version: 1,
      /**
       * 只持久化配置，不持久化 runtime。
       * token 是否写入由 rememberToken 决定——这是「仅本次会话」的实现点。
       */
      partialize: (state) => {
        const base = {
          enabled: state.enabled,
          owner: state.owner,
          repo: state.repo,
          branch: state.branch,
          path: state.path,
          rememberToken: state.rememberToken,
          autoSync: state.autoSync,
          debounceSec: state.debounceSec,
          pullOnStart: state.pullOnStart,
          conflict: state.conflict,
        };
        return state.rememberToken ? { ...base, token: state.token } : base;
      },
      /**
       * 恢复时兜底：老数据或手改 localStorage 可能缺字段，
       * 一律以 DEFAULT_SYNC_CONFIG 为底，再用存档覆盖。
       */
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SyncConfig>;
        return {
          ...current,
          ...saved,
          debounceSec: clampDebounceSec(saved.debounceSec ?? DEFAULT_SYNC_CONFIG.debounceSec),
          path: normalizePath(saved.path ?? DEFAULT_SYNC_CONFIG.path) || DEFAULT_SYNC_CONFIG.path,
          // 存档里没有 token 就保持空串，绝不用旧值兜底
          token: typeof saved.token === 'string' ? saved.token : '',
          runtime: INITIAL_RUNTIME,
        };
      },
    },
  ),
);

/** 从状态里摘出纯配置对象；引擎和 hook 共用，避免两处字段清单不同步 */
function pickConfig(s: SyncConfig): SyncConfig {
  return {
    enabled: s.enabled,
    owner: s.owner,
    repo: s.repo,
    branch: s.branch,
    path: s.path,
    token: s.token,
    rememberToken: s.rememberToken,
    autoSync: s.autoSync,
    debounceSec: s.debounceSec,
    pullOnStart: s.pullOnStart,
    conflict: s.conflict,
  };
}

/** 组件外读取当前配置（引擎用），避免每次手写 getState().xxx */
export function readSyncConfig(): SyncConfig {
  return pickConfig(useSyncStore.getState());
}

/** 同步是否已就绪：启用 + 配置完整。组件里用这个订阅，避免手写一堆 selector */
export function useSyncReady(): boolean {
  return useSyncStore((state) => isSyncConfigured(pickConfig(state)));
}
