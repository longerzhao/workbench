import { describe, expect, it } from 'vitest';
import {
  base64ToUtf8,
  buildContentsUrl,
  buildHeaders,
  buildPutFileBody,
  buildRepoUrl,
  checkPayloadSize,
  clampDebounceSec,
  DEBOUNCE_DEFAULT_SEC,
  DEBOUNCE_MAX_SEC,
  DEBOUNCE_MIN_SEC,
  DEFAULT_SYNC_CONFIG,
  describeGitHubError,
  formatBytes,
  isSyncConfigured,
  MAX_FILE_BYTES,
  normalizePath,
  parseContentsResponse,
  SyncError,
  toSyncError,
  utf8ToBase64,
  validateSyncConfig,
  type SyncConfig,
} from './githubSync';

function makeConfig(patch: Partial<SyncConfig> = {}): SyncConfig {
  return { ...DEFAULT_SYNC_CONFIG, enabled: true, owner: 'zlong', repo: 'workbench-data', token: 'ghp_x', ...patch };
}

describe('clampDebounceSec', () => {
  it('在范围内原样返回', () => {
    expect(clampDebounceSec(30)).toBe(30);
    expect(clampDebounceSec(5)).toBe(DEBOUNCE_MIN_SEC);
    expect(clampDebounceSec(300)).toBe(DEBOUNCE_MAX_SEC);
  });

  it('越界夹到边界', () => {
    expect(clampDebounceSec(0)).toBe(DEBOUNCE_MIN_SEC);
    expect(clampDebounceSec(-100)).toBe(DEBOUNCE_MIN_SEC);
    expect(clampDebounceSec(99999)).toBe(DEBOUNCE_MAX_SEC);
  });

  it('非法值回落默认', () => {
    expect(clampDebounceSec(Number.NaN)).toBe(DEBOUNCE_DEFAULT_SEC);
    expect(clampDebounceSec(Number.POSITIVE_INFINITY)).toBe(DEBOUNCE_DEFAULT_SEC);
  });

  it('小数四舍五入', () => {
    expect(clampDebounceSec(30.4)).toBe(30);
    expect(clampDebounceSec(30.6)).toBe(31);
  });
});

describe('normalizePath', () => {
  it('去掉两端空白与斜杠', () => {
    expect(normalizePath('  /data/workbench.json/  ')).toBe('data/workbench.json');
    expect(normalizePath('data.json')).toBe('data.json');
    expect(normalizePath('///')).toBe('');
  });
});

describe('validateSyncConfig', () => {
  it('未启用时一律通过，字段留空也正常', () => {
    expect(validateSyncConfig({ ...DEFAULT_SYNC_CONFIG, enabled: false })).toBeNull();
  });

  it('启用后缺字段逐个报错', () => {
    expect(validateSyncConfig(makeConfig({ owner: ' ' }))).toContain('所有者');
    expect(validateSyncConfig(makeConfig({ repo: '' }))).toContain('仓库名');
    expect(validateSyncConfig(makeConfig({ token: '' }))).toContain('令牌');
    expect(validateSyncConfig(makeConfig({ path: '  ' }))).toContain('文件路径');
    expect(validateSyncConfig(makeConfig({ branch: '' }))).toContain('分支');
  });

  it('完整配置返回 null', () => {
    expect(validateSyncConfig(makeConfig())).toBeNull();
    expect(isSyncConfigured(makeConfig())).toBe(true);
  });

  it('未启用时 isSyncConfigured 为 false', () => {
    expect(isSyncConfigured({ ...makeConfig(), enabled: false })).toBe(false);
  });
});

describe('Base64 UTF-8 往返', () => {
  it('ASCII 往返', () => {
    const text = '{"todos":[]}';
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });

  it('中文往返（直接 btoa 会抛错，这里必须能过）', () => {
    const text = '{"title":"买牛奶","note":"记得选低脂的"}';
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });

  it('emoji 往返（代理对）', () => {
    const text = '打卡 ✅ 🎉 连续 7 天';
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });

  it('能解掉 GitHub 返回的换行', () => {
    const text = 'hello 世界';
    const base64 = utf8ToBase64(text);
    const withBreaks = base64.replace(/(.{4})/g, '$1\n');
    expect(base64ToUtf8(withBreaks)).toBe(text);
  });

  it('超长文本不会因参数过多崩栈', () => {
    const text = '中'.repeat(200_000);
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });
});

describe('checkPayloadSize / formatBytes', () => {
  it('小文件不报警', () => {
    const result = checkPayloadSize('{"a":1}');
    expect(result.tooLarge).toBe(false);
    expect(result.nearLimit).toBe(false);
  });

  it('超过上限标记 tooLarge', () => {
    const result = checkPayloadSize('a'.repeat(MAX_FILE_BYTES + 1));
    expect(result.tooLarge).toBe(true);
  });

  it('按 UTF-8 字节算，而不是字符数', () => {
    // 400000 个中文字符 = 1.2 MB 字节，字符数远小于上限但字节超了
    const result = checkPayloadSize('中'.repeat(400_000));
    expect(result.bytes).toBe(1_200_000);
    expect(result.tooLarge).toBe(true);
  });

  it('格式化', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
  });
});

describe('URL 构造', () => {
  it('基础路径', () => {
    expect(buildContentsUrl(makeConfig())).toBe(
      'https://api.github.com/repos/zlong/workbench-data/contents/data.json?ref=main',
    );
  });

  it('多级目录逐段编码，斜杠保留', () => {
    const url = buildContentsUrl(makeConfig({ path: '/data/2026/workbench.json' }));
    expect(url).toBe(
      'https://api.github.com/repos/zlong/workbench-data/contents/data/2026/workbench.json?ref=main',
    );
  });

  it('路径里的空格被编码', () => {
    const url = buildContentsUrl(makeConfig({ path: 'my data/data.json' }));
    expect(url).toContain('my%20data/data.json');
  });

  it('ref 可覆盖分支', () => {
    const url = buildContentsUrl(makeConfig({ branch: 'main' }), 'dev');
    expect(url).toContain('ref=dev');
  });

  it('分支为空时回落 main', () => {
    expect(buildContentsUrl(makeConfig({ branch: '' }))).toContain('ref=main');
  });

  it('仓库地址不含 contents', () => {
    expect(buildRepoUrl(makeConfig())).toBe('https://api.github.com/repos/zlong/workbench-data');
  });
});

describe('buildPutFileBody', () => {
  it('新建文件时不带 sha', () => {
    const body = buildPutFileBody(makeConfig(), '{"a":1}');
    expect(body.sha).toBeUndefined();
    expect(body.branch).toBe('main');
    expect(base64ToUtf8(body.content)).toBe('{"a":1}');
  });

  it('更新文件时带上 sha', () => {
    const body = buildPutFileBody(makeConfig(), '{}', 'abc123');
    expect(body.sha).toBe('abc123');
  });

  it('自定义提交信息', () => {
    const body = buildPutFileBody(makeConfig(), '{}', undefined, 'chore: manual sync');
    expect(body.message).toBe('chore: manual sync');
  });
});

describe('buildHeaders', () => {
  it('带 Bearer 与 API 版本', () => {
    const headers = buildHeaders('  ghp_abc  ');
    expect(headers.Authorization).toBe('Bearer ghp_abc');
    expect(headers['X-GitHub-Api-Version']).toBe('2022-11-28');
    expect(headers.Accept).toBe('application/vnd.github+json');
  });
});

describe('parseContentsResponse', () => {
  it('解析 base64 内容', () => {
    const text = '{"todos":[{"title":"买牛奶"}]}';
    const parsed = parseContentsResponse({
      sha: 'sha1',
      encoding: 'base64',
      content: utf8ToBase64(text),
    });
    expect(parsed.sha).toBe('sha1');
    expect(parsed.text).toBe(text);
  });

  it('超过 1 MB 时 encoding 为 none，text 为 null', () => {
    const parsed = parseContentsResponse({ sha: 'sha2', encoding: 'none', content: '' });
    expect(parsed.sha).toBe('sha2');
    expect(parsed.text).toBeNull();
  });

  it('缺少 sha 时抛 SyncError', () => {
    expect(() => parseContentsResponse({ encoding: 'base64', content: '' })).toThrow(SyncError);
    expect(() => parseContentsResponse(null)).toThrow(SyncError);
  });
});

describe('describeGitHubError', () => {
  it('常见状态码给出可行动文案', () => {
    expect(describeGitHubError(401)).toContain('令牌无效');
    expect(describeGitHubError(403)).toContain('Contents: Read and write');
    expect(describeGitHubError(404)).toContain('私有仓库');
    expect(describeGitHubError(409)).toContain('sha');
  });

  it('422 会带上 GitHub 的详细说明', () => {
    expect(describeGitHubError(422, 'sha is required')).toContain('sha is required');
  });

  it('未知状态码也给出可读文案', () => {
    expect(describeGitHubError(500)).toContain('500');
  });
});

describe('toSyncError', () => {
  it('SyncError 原样返回', () => {
    const err = new SyncError('x', 400);
    expect(toSyncError(err)).toBe(err);
  });

  it('TypeError 归为网络问题', () => {
    expect(toSyncError(new TypeError('Failed to fetch'))).toBeInstanceOf(SyncError);
    expect(toSyncError(new TypeError('Failed to fetch')).message).toContain('网络');
  });

  it('未知值也能变成 SyncError', () => {
    expect(toSyncError('boom')).toBeInstanceOf(SyncError);
    expect(toSyncError(undefined)).toBeInstanceOf(SyncError);
  });
});
