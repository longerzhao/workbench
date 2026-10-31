/**
 * GitHub Contents API 同步的纯函数层。
 *
 * 这里只做"把数据变成请求、把响应变回数据"，不碰 db、不发请求、不读 localStorage，
 * 因此可以完整单测。真正的网络调用与调度在 syncEngine 里。
 *
 * 设计取舍：
 * - 默认上传**明文 JSON**，而不是压缩后再 Base64。这样 GitHub 上能看到 diff，
 *   导出的文件也能直接走「从备份导入」。只有超过体积阈值时才需要压缩（P3）。
 * - Base64 必须自己做 UTF-8 编码。直接 btoa(JSON) 遇到中文会抛 InvalidCharacterError。
 */

export const GITHUB_API = 'https://api.github.com';

/**
 * Contents API 单文件上限约 1 MB。超过这个值 PUT 会失败，
 * 需要改用 Git Data API 的 blob 接口（P3 再做）。
 */
export const MAX_FILE_BYTES = 1024 * 1024;
/** 超过这个值就提前警告，留出 Base64 膨胀与 JSON 包装的余量 */
export const WARN_FILE_BYTES = 900 * 1024;

/** debounce 秒数的允许范围：太短会退化成每次改动都提交，太长会让数据久留内存 */
export const DEBOUNCE_MIN_SEC = 5;
export const DEBOUNCE_MAX_SEC = 300;
export const DEBOUNCE_DEFAULT_SEC = 30;

export type ConflictPolicy = 'local' | 'remote' | 'manual';

export interface SyncConfig {
  /** 总开关；关闭时整个同步层不参与任何逻辑 */
  enabled: boolean;
  owner: string;
  repo: string;
  branch: string;
  /** 仓库内的文件路径，允许带目录，如 `data/workbench.json` */
  path: string;
  /** Fine-grained PAT，只需 Contents: Read and write */
  token: string;
  /** true = 存 localStorage；false = 只留内存，刷新即失效 */
  rememberToken: boolean;
  autoSync: boolean;
  debounceSec: number;
  /** 启动时是否先拉取远端覆盖本地 */
  pullOnStart: boolean;
  conflict: ConflictPolicy;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  owner: '',
  repo: '',
  branch: 'main',
  path: 'data.json',
  token: '',
  rememberToken: true,
  autoSync: false,
  debounceSec: DEBOUNCE_DEFAULT_SEC,
  pullOnStart: false,
  conflict: 'manual',
};

/* -------------------------------------------------------------------------- */
/* 配置校验                                                                    */
/* -------------------------------------------------------------------------- */

/** 把用户输入的 debounce 秒数夹到允许范围；非法值回落到默认 */
export function clampDebounceSec(value: number): number {
  if (!Number.isFinite(value)) return DEBOUNCE_DEFAULT_SEC;
  return Math.min(DEBOUNCE_MAX_SEC, Math.max(DEBOUNCE_MIN_SEC, Math.round(value)));
}

/** 去掉仓库名/路径两端的空白与多余的斜杠 */
export function normalizePath(path: string): string {
  return path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
}

/** 去掉仓库名末尾的 .git */
function stripGitSuffix(name: string): string {
  return name.trim().replace(/\.git$/i, '');
}

export interface RepoRef {
  owner: string;
  repo: string;
}

/**
 * 从用户输入里拆出 owner 与 repo。
 *
 * 用户看到的是仓库页面地址，顺手把整条链接粘进来是很自然的事——而且粘贴来的
 * 东西若原样拼进 API 路径，请求会变成
 * /repos/longerzhao/https%3A%2F%2Fgithub.com%2F... ，必然 404。
 *
 * 所以这里把常见的几种写法都认下来：
 *
 *   workbench-data                              → 只有仓库名
 *   longerzhao/workbench-data                   → 所有者与仓库名
 *   https://github.com/longerzhao/workbench-data
 *   https://github.com/longerzhao/workbench-data/tree/main
 *   git@github.com:longerzhao/workbench-data.git
 */
export function parseRepoRef(input: string): RepoRef {
  const text = input.trim();
  if (!text) return { owner: '', repo: '' };

  // SSH：git@github.com:owner/repo.git —— 注意 owner 在前、repo 在后
  const ssh = text.match(/^(?:ssh:\/\/)?git@([^:/]+)[:/](.+)$/i);
  if (ssh) {
    const parts = (ssh[2] ?? '').split('/').filter(Boolean);
    const repo = stripGitSuffix(parts[parts.length - 1] ?? '');
    const owner = parts.length > 1 ? (parts[0] ?? '') : '';
    return { owner: owner.trim(), repo };
  }

  // 网页地址：https://github.com/owner/repo
  const url = text.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)/i);
  if (url) {
    return { owner: (url[1] ?? '').trim(), repo: stripGitSuffix(url[2] ?? '') };
  }

  // owner/repo
  const pair = text.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (pair) {
    return { owner: (pair[1] ?? '').trim(), repo: stripGitSuffix(pair[2] ?? '') };
  }

  // 只填了仓库名
  return { owner: '', repo: stripGitSuffix(text) };
}

/**
 * 把配置里的 owner/repo 解析成 API 需要的两段。
 * 所有者字段有值时以它为准（用户显式填的优先），否则用仓库字段里解析出来的。
 */
export function resolveRepoRef(config: Pick<SyncConfig, 'owner' | 'repo'>): RepoRef {
  const parsed = parseRepoRef(config.repo);
  return {
    owner: (config.owner.trim() || parsed.owner).trim(),
    repo: (parsed.repo || config.repo.trim()).trim(),
  };
}

/**
 * 校验配置是否可用。返回 null 表示通过，否则返回给用户看的错误文案。
 * 只在 `enabled` 为 true 时校验——未启用时字段留空是正常的。
 */
export function validateSyncConfig(config: SyncConfig): string | null {
  if (!config.enabled) return null;
  if (!config.owner.trim()) return '请填写仓库所有者（GitHub 用户名或组织名）';
  if (!config.repo.trim()) return '请填写仓库名';
  if (!config.token.trim()) return '请填写访问令牌（PAT）';
  if (!normalizePath(config.path)) return '请填写文件路径，例如 data.json';
  if (!config.branch.trim()) return '请填写分支名，例如 main';
  return null;
}

/** 配置是否完整到可以发起同步 */
export function isSyncConfigured(config: SyncConfig): boolean {
  return validateSyncConfig(config) === null && config.enabled;
}

/* -------------------------------------------------------------------------- */
/* Base64（UTF-8 安全）                                                        */
/* -------------------------------------------------------------------------- */

/**
 * 字符串 → Base64。必须按 UTF-8 取字节再编码，
 * 否则 `btoa('中文')` 会直接抛 InvalidCharacterError。
 * 分块是为了避免 `String.fromCharCode(...bytes)` 参数过多导致栈溢出。
 */
export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/** Base64 → 字符串。GitHub 返回的内容每 60 字符带换行，先清掉再解码 */
export function base64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/* -------------------------------------------------------------------------- */
/* 体积检查                                                                    */
/* -------------------------------------------------------------------------- */

export interface SizeCheck {
  bytes: number;
  /** 超过硬上限，不能上传 */
  tooLarge: boolean;
  /** 接近上限，值得提醒 */
  nearLimit: boolean;
}

export function checkPayloadSize(text: string): SizeCheck {
  const bytes = new TextEncoder().encode(text).length;
  return {
    bytes,
    tooLarge: bytes > MAX_FILE_BYTES,
    nearLimit: bytes > WARN_FILE_BYTES && bytes <= MAX_FILE_BYTES,
  };
}

/** 把字节数转成给用户看的文案 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/* -------------------------------------------------------------------------- */
/* URL 与请求体                                                                */
/* -------------------------------------------------------------------------- */

/** 路径可能包含多级目录，必须逐段编码，不能把斜杠也编掉 */
function encodeRepoPath(path: string): string {
  return normalizePath(path)
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

/** GET / PUT 共用的文件地址 */
export function buildContentsUrl(config: SyncConfig, ref?: string): string {
  const { owner, repo } = resolveRepoRef(config);
  const path = encodeRepoPath(config.path);
  const branch = (ref ?? config.branch).trim() || 'main';
  return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path}?ref=${encodeURIComponent(branch)}`;
}

/**
 * 列仓库时的地址，用于「连接测试」：
 * 能在私有仓库上拿到 200，说明 token 至少对该仓库有读权限。
 */
export function buildRepoUrl(config: SyncConfig): string {
  const { owner, repo } = resolveRepoRef(config);
  return `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

export interface PutFileBody {
  message: string;
  content: string;
  branch: string;
  /** 更新已有文件时必须带上；创建新文件时省略 */
  sha?: string;
}

/** 构造 PUT /contents 的请求体。sha 有值代表更新，无值代表新建 */
export function buildPutFileBody(
  config: SyncConfig,
  jsonText: string,
  sha?: string,
  message?: string,
): PutFileBody {
  const body: PutFileBody = {
    message: message ?? `sync: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
    content: utf8ToBase64(jsonText),
    branch: config.branch.trim() || 'main',
  };
  if (sha) body.sha = sha;
  return body;
}

/** 请求头。Accept 用 vnd.github+json，固定 API 版本避免未来行为漂移 */
export function buildHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token.trim()}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

/* -------------------------------------------------------------------------- */
/* 响应解析                                                                    */
/* -------------------------------------------------------------------------- */

/** GET /contents 返回的最小结构 */
export interface ContentsResponse {
  sha: string;
  size?: number;
  /** 文件超过 1 MB 时 GitHub 返回空字符串，并把 encoding 置为 'none' */
  content?: string;
  encoding?: string;
  download_url?: string | null;
}

export interface ParsedRemoteFile {
  sha: string;
  /** 解析出的 JSON 文本；文件过大或内容为空时为 null */
  text: string | null;
}

/**
 * 解析 GET /contents 的响应体。
 * 注意 `encoding: 'none'` 的情况：文件超过 1 MB 时 content 为空，
 * 必须改走 download_url 拿原文，这里只如实反映"拿不到内联内容"。
 */
export function parseContentsResponse(raw: unknown): ParsedRemoteFile {
  const data = raw as ContentsResponse | null;
  if (!data || typeof data.sha !== 'string') {
    throw new SyncError('GitHub 返回的文件信息不完整，无法确定版本（sha）');
  }
  const isBase64 = data.encoding === 'base64' && typeof data.content === 'string';
  if (!isBase64) return { sha: data.sha, text: null };
  return { sha: data.sha, text: base64ToUtf8(data.content as string) };
}

/* -------------------------------------------------------------------------- */
/* 错误处理                                                                    */
/* -------------------------------------------------------------------------- */

export class SyncError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SyncError';
    this.status = status;
  }
}

/**
 * 把 GitHub 的 HTTP 状态码翻译成用户能看懂、且能据此行动的话。
 * 404 那条特意点了"私有仓库"，因为这是配置私有仓库时最常见的坑。
 */
export function describeGitHubError(status: number, detail?: string): string {
  switch (status) {
    case 401:
      return '令牌无效或已过期，请重新生成 PAT 后再试';
    case 403:
      return '权限不足或触发速率限制。请确认 PAT 勾选了 Contents: Read and write';
    case 404:
      return '找不到仓库。私有仓库请确认 PAT 已授权该仓库、分支名正确；仓库栏只填仓库名即可（粘贴链接会自动拆开）';
    case 409:
      return '文件已被其他设备修改（sha 不一致），请先拉取再上传';
    case 422:
      return detail
        ? `GitHub 拒绝了这次提交：${detail}`
        : 'GitHub 拒绝了这次提交，通常是缺少 sha 或内容格式不对';
    default:
      return detail ? `同步失败（${status}）：${detail}` : `同步失败，GitHub 返回 ${status}`;
  }
}

/** 网络层异常（断网、CORS、超时）统一成 SyncError，方便上层统一处理 */
export function toSyncError(error: unknown): SyncError {
  if (error instanceof SyncError) return error;
  if (error instanceof TypeError) {
    return new SyncError('网络请求失败，请检查网络连接或浏览器是否拦截了跨域请求');
  }
  return new SyncError(error instanceof Error ? error.message : '未知同步错误');
}
