import { useState } from 'react';
import { Check, CloudDownload, CloudUpload, Loader2, Plug } from 'lucide-react';
import { useSyncStore } from '@/app/store/sync';
import { toast } from '@/app/store/toast';
import { pullNow, pushNow, testConnection } from '@/lib/syncEngine';
import {
  DEBOUNCE_MAX_SEC,
  DEBOUNCE_MIN_SEC,
  isSyncConfigured,
  validateSyncConfig,
  type ConflictPolicy,
} from '@/lib/githubSync';
import { buildSnapshot, downloadSnapshot } from '@/lib/backup';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';

export function GitHubSyncSection() {
  const config = useSyncStore();
  const runtime = config.runtime;
  const [testing, setTesting] = useState(false);
  const [busy, setBusy] = useState(false);

  const configured = isSyncConfigured(config);
  const validationError = config.enabled ? validateSyncConfig(config) : null;
  const running = runtime.phase === 'pushing' || runtime.phase === 'pulling';

  const onTest = async () => {
    setTesting(true);
    try {
      toast(await testConnection(config), 'success', 4);
    } catch (error) {
      toast(error instanceof Error ? error.message : '连接失败', 'danger', 5);
    } finally {
      setTesting(false);
    }
  };

  const onPush = async () => {
    if (!configured) {
      toast('请先补全仓库配置', 'danger');
      return;
    }
    setBusy(true);
    try {
      const result = await pushNow();
      toast(result.created ? '已创建远端数据文件' : '已上传到 GitHub', 'success', 3);
    } catch (error) {
      toast(error instanceof Error ? error.message : '上传失败', 'danger', 5);
    } finally {
      setBusy(false);
    }
  };

  const onPull = async () => {
    if (!configured) {
      toast('请先补全仓库配置', 'danger');
      return;
    }
    setBusy(true);
    try {
      downloadSnapshot(await buildSnapshot());
      const result = await pullNow('replace');
      const total = Object.values(result.counts).reduce((sum, n) => sum + n, 0);
      toast(`已从 GitHub 拉取 ${total} 条记录（本地旧数据已下载备份）`, 'success', 5);
    } catch (error) {
      toast(error instanceof Error ? error.message : '拉取失败', 'danger', 5);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
          GitHub 同步
        </h3>
        {runtime.lastSyncedAt ? (
          <span className="flex items-center gap-1 text-[0.6875rem] text-ink-subtle">
            <Check className="size-3" />
            {runtime.lastDirection === 'push' ? '上次上传' : '上次拉取'}{' '}
            {runtime.lastSyncedAt.slice(5, 16).replace('T', ' ')}
          </span>
        ) : null}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
        <Checkbox
          checked={config.enabled}
          onChange={(next) => config.setConfig({ enabled: next })}
          label="启用同步"
          className="mt-0.5"
        />
        <span className="min-w-0">
          <span className="block text-[0.8125rem] text-ink">启用同步</span>
          <span className="block text-xs text-ink-subtle">
            不启用时数据只存在本浏览器，行为与之前完全一致
          </span>
        </span>
      </label>

      <div
        className={`space-y-2.5 ${config.enabled ? '' : 'pointer-events-none opacity-40'}`}
        aria-disabled={!config.enabled}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[0.8125rem] text-ink-muted">所有者</span>
            <input
              className="input"
              placeholder="your-name"
              value={config.owner}
              onChange={(event) => config.setConfig({ owner: event.target.value })}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-[0.8125rem] text-ink-muted">仓库</span>
            <input
              className="input"
              placeholder="workbench-data"
              value={config.repo}
              onChange={(event) => config.setConfig({ repo: event.target.value })}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-[0.8125rem] text-ink-muted">分支</span>
            <input
              className="input"
              placeholder="main"
              value={config.branch}
              onChange={(event) => config.setConfig({ branch: event.target.value })}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-10 shrink-0 text-[0.8125rem] text-ink-muted">路径</span>
            <input
              className="input"
              placeholder="data.json"
              value={config.path}
              onChange={(event) => config.setConfig({ path: event.target.value })}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="block text-[0.8125rem] text-ink-muted">访问令牌（PAT）</span>
          <input
            className="input font-mono text-xs"
            type="password"
            autoComplete="off"
            placeholder="github_pat_…"
            value={config.token}
            onChange={(event) => config.setToken(event.target.value)}
          />
          <span className="block text-[0.6875rem] text-ink-subtle">
            需要 Fine-grained PAT，权限只需 <strong className="text-ink-muted">Contents: Read and write</strong>，
            并限定到上面这个数据仓库。请使用独立的私有仓库，不要放在 Pages 发布的分支里。
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 pl-1">
          <Checkbox
            variant="select"
            checked={config.rememberToken}
            onChange={(next) => config.setConfig({ rememberToken: next })}
            label="记住令牌"
          />
          <span className="text-[0.8125rem] text-ink-muted">
            记住令牌
            <span className="ml-1.5 text-xs text-ink-subtle">
              （取消勾选则只在本次会话有效，刷新后需重输）
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5 pl-1">
          <Checkbox
            variant="select"
            checked={config.autoSync}
            onChange={(next) => config.setConfig({ autoSync: next })}
            label="自动同步"
          />
          <span className="text-[0.8125rem] text-ink-muted">
            自动同步
            <span className="ml-1.5 text-xs text-ink-subtle">（数据变更后自动上传）</span>
          </span>
        </label>

        {config.autoSync ? (
          <label className="flex items-center gap-3 pl-1">
            <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">等待时长</span>
            <input
              type="number"
              min={DEBOUNCE_MIN_SEC}
              max={DEBOUNCE_MAX_SEC}
              className="input tabular-nums"
              value={config.debounceSec}
              onChange={(event) => config.setDebounceSec(Number(event.target.value))}
            />
            <span className="shrink-0 text-xs text-ink-subtle">
              秒（{DEBOUNCE_MIN_SEC}–{DEBOUNCE_MAX_SEC}）
            </span>
          </label>
        ) : null}

        <label className="flex cursor-pointer items-center gap-2.5 pl-1">
          <Checkbox
            variant="select"
            checked={config.pullOnStart}
            onChange={(next) => config.setConfig({ pullOnStart: next })}
            label="启动时拉取"
          />
          <span className="text-[0.8125rem] text-ink-muted">
            启动时拉取
            <span className="ml-1.5 text-xs text-ink-subtle">（打开应用时先用远端覆盖本地）</span>
          </span>
        </label>

        <label className="flex items-center gap-3 pl-1">
          <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">冲突策略</span>
          <select
            className="input"
            value={config.conflict}
            onChange={(event) => config.setConflict(event.target.value as ConflictPolicy)}
          >
            <option value="manual">手动确认（最安全）</option>
            <option value="local">本地优先</option>
            <option value="remote">远端优先</option>
          </select>
        </label>

        {validationError ? (
          <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-ink-muted">{validationError}</p>
        ) : null}

        {runtime.lastError ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger-text">
            {runtime.lastError}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pl-1 pt-1">
          <Button size="sm" variant="outline" onClick={() => void onTest()} disabled={testing || running}>
            {testing ? <Loader2 className="size-3.5 animate-spin" /> : <Plug className="size-3.5" />}
            测试连接
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onPush()}
            disabled={busy || running || !configured}
          >
            {runtime.phase === 'pushing' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CloudUpload className="size-3.5" />
            )}
            立即上传
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onPull()}
            disabled={busy || running || !configured}
          >
            {runtime.phase === 'pulling' ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <CloudDownload className="size-3.5" />
            )}
            立即下载
          </Button>
        </div>

        <p className="pl-1 text-[0.6875rem] text-ink-subtle">
          「立即下载」会用远端数据覆盖本地，执行前会自动下载一份本地快照。
        </p>
      </div>
    </section>
  );
}
