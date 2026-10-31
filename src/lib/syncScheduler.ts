/**
 * 自动同步调度器。
 *
 * 触发源只有一个：Dexie 的 `storagemutated` 事件。任何表的写入都会冒泡到这里，
 * 不需要给每个功能单独插桩，也不会漏掉新增的表。
 *
 * 三条规则：
 * 1. 连续写入按 debounceSec 合并成一次上传（避免 commit 噪音）
 * 2. 页面隐藏时跳过等待立即上传（切标签页/关窗口不丢数据）
 * 3. 正在同步时不重入；期间来的变更排到下一轮
 *
 * 只在 autoSync 打开且配置完整时才启动，其余情况完全不挂监听。
 */
import Dexie from 'dexie';
import { isSyncConfigured } from '@/lib/githubSync';
import { pushNow } from '@/lib/syncEngine';
import { readSyncConfig, useSyncStore } from '@/app/store/sync';
import { toast } from '@/app/store/toast';

let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let stopped = true;
/** 上传进行中又来了新变更，结束后立刻补一次 */
let pendingAfterRun = false;

/** 跨标签页广播频道名 */
const CHANNEL = 'workbench:sync';
/** 收到别的标签页「正在上传」后，抑制自己的自动上传这么久 */
const SUPPRESS_MS = 15_000;

let channel: BroadcastChannel | null = null;
let suppressedUntil = 0;

function ensureChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (channel) return channel;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
    if (event.data?.type === 'push-start') {
      // 别的标签页正在传，本地取消待传并静默一段时间，避免两边各写一次
      clearTimer();
      suppressedUntil = Date.now() + SUPPRESS_MS;
    }
  };
  return channel;
}

function isSuppressed(): boolean {
  return Date.now() < suppressedUntil;
}

/**
 * Dexie 的写入可观测事件。
 *
 * 注意两点：
 * 1. Dexie 4 没有 'changes' 事件——用 `Dexie.on('changes', …)` 会拿到
 *    undefined（`Dexie.on` 是按事件名取实现的），调用时抛
 *    "Cannot read properties of undefined (reading 'subscribe')"。
 * 2. 'storagemutated' 只挂在**全局** Dexie 上，实例上的 db.on('storagemutated')
 *    同样是 undefined。
 *
 * 所以监听要挂在 Dexie 类上，写事务提交后触发，覆盖所有表。
 */
const STORAGE_MUTATED = 'storagemutated';

function clearTimer(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

async function runPush(): Promise<void> {
  clearTimer();

  const config = readSyncConfig();
  if (!isSyncConfigured(config) || !config.autoSync) return;

  const store = useSyncStore.getState();
  // 手动同步正在进行时不要插一脚，等它结束由 pendingAfterRun 接力
  if (store.runtime.phase !== 'idle') {
    pendingAfterRun = true;
    return;
  }

  try {
    // 先广播再上传：别的标签页收到后会让路，避免并发 PUT 撞 409
    ensureChannel()?.postMessage({ type: 'push-start' });
    await pushNow('sync: 自动同步');
  } catch {
    // syncEngine 已经把错误写进 store.runtime.lastError，这里只提示一次
    const message = useSyncStore.getState().runtime.lastError;
    if (message) toast(`自动同步失败：${message}`, 'danger', 5);
  } finally {
    if (pendingAfterRun) {
      pendingAfterRun = false;
      schedule();
    }
  }
}

/** 排一次延迟上传；重复调用会重置计时（这就是 debounce） */
export function schedule(): void {
  const config = readSyncConfig();
  if (stopped || !config.autoSync || !isSyncConfigured(config)) return;
  // 别的标签页刚传过，这段时间内不再排队，等它的广播窗口过去
  if (isSuppressed()) return;

  clearTimer();
  timer = setTimeout(() => void runPush(), config.debounceSec * 1000);
}

/** 页面即将隐藏：不等 debounce，立刻传。不 await，卸载路径上不能阻塞 */
export function flush(): void {
  if (stopped) return;
  if (timer === null) return; // 没有待传的变更就不折腾
  void runPush();
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'hidden') flush();
}

/** 启动监听。重复调用是幂等的 */
export function startAutoSync(): void {
  if (!stopped) return;
  const config = readSyncConfig();
  if (!config.autoSync || !isSyncConfigured(config)) return;

  stopped = false;
  // storagemutated 在写事务提交后触发，只关心"有写入"，不关心写了什么。
  const handler = () => schedule();
  Dexie.on(STORAGE_MUTATED, handler);
  unsubscribe = () => Dexie.on(STORAGE_MUTATED).unsubscribe(handler);

  document.addEventListener('visibilitychange', onVisibilityChange);
  ensureChannel();
}

/** 停止监听并取消待传（切配置/关同步时调用） */
export function stopAutoSync(): void {
  stopped = true;
  clearTimer();
  pendingAfterRun = false;
  unsubscribe?.();
  unsubscribe = null;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  channel?.close();
  channel = null;
  suppressedUntil = 0;
}

/** 仅供测试：重置全部内部状态 */
export function resetAutoSyncState(): void {
  stopAutoSync();
}

/** 测试用：看当前是否有待传任务 */
export function hasPending(): boolean {
  return timer !== null;
}
