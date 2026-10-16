/**
 * 生成本地唯一 ID。
 * 优先用 crypto.randomUUID（现代浏览器均支持），降级方案只在对老环境兜底时命中。
 */
export function newId(prefix?: string): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return prefix ? `${prefix}_${raw}` : raw;
}
