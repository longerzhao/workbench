/**
 * GitHub 同步引擎：把 backup 的快照和 GitHub Contents API 接起来。
 *
 * 分层原则：
 * - githubSync.ts 只做纯函数（编码/URL/校验），有单测
 * - 这里负责真正的 fetch 与状态流转，不碰 React
 * - UI 只调 pushNow / pullNow / testConnection，从 store 读状态
 *
 * 所有函数在同步未配置时都是**空操作**，调用方不必自己判断，
 * 这样「没配仓库就完全不参与」这条约束只在一个地方保证。
 */
import { metaSet, nowISO } from '@/db';
import {
  applySnapshot,
  buildSnapshot,
  countByTable,
  parseBackupText,
  type BackupFile,
  type ImportMode,
} from '@/lib/backup';
import {
  base64ToUtf8,
  buildContentsUrl,
  buildHeaders,
  buildPutFileBody,
  buildRepoUrl,
  checkPayloadSize,
  describeGitHubError,
  formatBytes,
  isSyncConfigured,
  parseContentsResponse,
  SyncError,
  toSyncError,
  type SyncConfig,
} from '@/lib/githubSync';
import { readSyncConfig, useSyncStore } from '@/app/store/sync';

export interface PullResult {
  snapshot: BackupFile;
  sha: string;
  counts: Record<string, number>;
}

export interface PushResult {
  sha: string;
  bytes: number;
  created: boolean;
}

/** 统一的 fetch 包装：非 2xx 一律翻译成可读的 SyncError */
async function request(url: string, config: SyncConfig, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...buildHeaders(config.token), ...(init?.headers ?? {}) },
    });
  } catch (error) {
    throw toSyncError(error);
  }

  if (!response.ok) {
    // GitHub 的错误详情在 body.message 里，尽量带出来
    let detail: string | undefined;
    try {
      const body = (await response.json()) as { message?: string };
      detail = body.message;
    } catch {
      /* body 不是 JSON 就忽略，状态码本身已经够定位问题 */
    }
    throw new SyncError(describeGitHubError(response.status, detail), response.status);
  }

  return response;
}

/**
 * 测试连通性：只读仓库元信息。
 * 不用文件接口，因为「文件还不存在」是首次使用的正常状态，不该算失败。
 */
export async function testConnection(config: SyncConfig): Promise<string> {
  if (!config.enabled) throw new SyncError('同步未启用');
  if (!config.owner.trim() || !config.repo.trim() || !config.token.trim()) {
    throw new SyncError('请先填写仓库所有者、仓库名和访问令牌');
  }

  const response = await request(buildRepoUrl(config), config);
  const repo = (await response.json()) as { full_name?: string; private?: boolean };
  const name = repo.full_name ?? `${config.owner}/${config.repo}`;
  return repo.private ? `${name}（私有仓库）连接正常` : `${name}（公开仓库）连接正常`;
}

/**
 * 拉取远端文件但不写库，供 UI 预览后再决定是否覆盖。
 * 文件不存在时返回 null——这不算错误，是首次同步的正常情况。
 */
export async function fetchRemote(config: SyncConfig): Promise<PullResult | null> {
  let response: Response;
  try {
    response = await request(buildContentsUrl(config), config);
  } catch (error) {
    if (error instanceof SyncError && error.status === 404) return null;
    throw error;
  }

  const raw = (await response.json()) as unknown;
  const parsed = parseContentsResponse(raw);

  if (parsed.text === null) {
    throw new SyncError(
      '远端文件超过 1 MB，Contents API 不再内联返回内容。请先在设置里改用更小的数据文件，或暂时用导出/导入迁移。',
    );
  }

  const snapshot = parseBackupText(parsed.text);
  return { snapshot, sha: parsed.sha, counts: countByTable(snapshot) };
}

/**
 * 下载并**立即写入本地库**。
 * 调用方（UI）负责在这之前落地一份本地快照——replace 模式不可逆。
 */
export async function pullNow(mode: ImportMode = 'replace'): Promise<PullResult> {
  const config = readSyncConfig();
  if (!isSyncConfigured(config)) throw new SyncError('同步尚未配置完成');

  const store = useSyncStore.getState();
  store.setPhase('pulling');
  try {
    const remote = await fetchRemote(config);
    if (!remote) {
      throw new SyncError('远端还没有数据文件，请先上传一次');
    }

    await applySnapshot(remote.snapshot, mode);
    await metaSet('lastBackupAt', nowISO());

    store.setRemoteSha(remote.sha);
    store.markSynced('pull');
    return remote;
  } catch (error) {
    const syncError = toSyncError(error);
    store.setError(syncError.message);
    throw syncError;
  }
}

/**
 * 上传本地数据。
 * 先 GET 拿 sha（有则更新、无则新建），再 PUT。
 * 万一 GET 与 PUT 之间有别的设备提交，GitHub 会因 sha 过期返回 409，
 * 那时错误文案会提示用户先拉取。
 */
export async function pushNow(message?: string): Promise<PushResult> {
  const config = readSyncConfig();
  if (!isSyncConfigured(config)) throw new SyncError('同步尚未配置完成');

  const store = useSyncStore.getState();
  store.setPhase('pushing');
  try {
    const snapshot = await buildSnapshot();
    const json = JSON.stringify(snapshot, null, 2);

    const size = checkPayloadSize(json);
    if (size.tooLarge) {
      throw new SyncError(
        `数据有 ${formatBytes(size.bytes)}，超过 GitHub 单文件 ${formatBytes(1024 * 1024)} 的上限。` +
          '请先清理一些历史数据，或改用「导出备份」手动归档。',
      );
    }

    // 已有文件必须带 sha，否则 GitHub 会以 422 拒绝
    let sha: string | undefined;
    try {
      const head = await request(buildContentsUrl(config), config);
      sha = parseContentsResponse(await head.json()).sha;
    } catch (error) {
      if (!(error instanceof SyncError) || error.status !== 404) throw error;
      // 404 = 文件还不存在，走新建路径
    }

    const body = buildPutFileBody(config, json, sha, message);

    let response: Response;
    try {
      response = await request(buildContentsUrl(config), config, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } catch (error) {
      // 409 = GET 与 PUT 之间有别的设备提交过，按用户选的策略处理
      if (error instanceof SyncError && error.status === 409) {
        return await handleConflict(config, json, message);
      }
      throw error;
    }

    const result = (await response.json()) as { content?: { sha?: string } };
    const nextSha = result.content?.sha ?? sha ?? '';

    await metaSet('lastBackupAt', nowISO());

    store.setRemoteSha(nextSha || null);
    store.markSynced('push');
    return { sha: nextSha, bytes: size.bytes, created: !sha };
  } catch (error) {
    const syncError = toSyncError(error);
    store.setError(syncError.message);
    throw syncError;
  }
}

/** 供 UI 显示：把远端原文解出来给用户预览（不写库） */
export function decodeRemotePreview(base64: string): string {
  return base64ToUtf8(base64);
}

/** 需要用户在 UI 上决策的冲突。与普通 SyncError 区分，便于 UI 弹窗而非 toast */
export class SyncConflictError extends SyncError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'SyncConflictError';
  }
}

/**
 * 处理 409 冲突。
 *
 * - local：重新取最新 sha 再覆盖一次（本地赢）
 * - remote：放弃本地这次改动，拉取远端覆盖本地
 * - manual：抛 SyncConflictError 让 UI 让用户决策
 *
 * 不递归调用 pushNow，避免策略配错时无限循环；local 只重试一次。
 */
async function handleConflict(
  config: SyncConfig,
  jsonText: string,
  message?: string,
): Promise<PushResult> {
  const store = useSyncStore.getState();

  if (config.conflict === 'remote') {
    const remote = await fetchRemote(config);
    if (remote) {
      await applySnapshot(remote.snapshot, 'replace');
      await metaSet('lastBackupAt', nowISO());
      store.setRemoteSha(remote.sha);
      store.markSynced('pull');
      throw new SyncConflictError('远端已被修改，已用远端数据覆盖本地（冲突策略：远端优先）');
    }
  }

  if (config.conflict === 'local') {
    const head = await request(buildContentsUrl(config), config);
    const freshSha = parseContentsResponse(await head.json()).sha;
    const retryBody = buildPutFileBody(config, jsonText, freshSha, message);
    const retry = await request(buildContentsUrl(config), config, {
      method: 'PUT',
      body: JSON.stringify(retryBody),
    });
    const result = (await retry.json()) as { content?: { sha?: string } };
    const nextSha = result.content?.sha ?? freshSha;
    await metaSet('lastBackupAt', nowISO());
    store.setRemoteSha(nextSha || null);
    store.markSynced('push');
    return { sha: nextSha, bytes: checkPayloadSize(jsonText).bytes, created: false };
  }

  store.setPhase('idle');
  throw new SyncConflictError(
    '远端文件已被其他设备修改。请选择「立即上传」覆盖远端，或「立即下载」用远端覆盖本地。',
  );
}
