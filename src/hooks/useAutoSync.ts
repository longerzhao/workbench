import { useEffect } from 'react';
import { useSyncStore } from '@/app/store/sync';
import { isSyncConfigured } from '@/lib/githubSync';
import { startAutoSync, stopAutoSync } from '@/lib/syncScheduler';

/**
 * 把自动同步调度器挂到应用生命周期上。
 *
 * 只在「启用 + 自动同步 + 配置完整」同时成立时监听 Dexie 变更，
 * 任一条件不再成立就停掉，避免关了开关还在后台传数据。
 *
 * 依赖用「配置签名」字符串而不是逐字段：字段一多，逐字段列表容易漏，
 * 而签名变化即代表需要重估是否启动，粒度刚好。
 */
export function useAutoSync(): void {
  const signature = useSyncStore((state) =>
    [
      state.enabled,
      state.autoSync,
      state.owner,
      state.repo,
      state.branch,
      state.path,
      state.token,
      state.debounceSec,
    ].join('\u0000'),
  );

  useEffect(() => {
    if (isSyncConfigured(useSyncStore.getState())) {
      startAutoSync();
    } else {
      stopAutoSync();
    }
    return () => stopAutoSync();
  }, [signature]);
}
