/**
 * 极简模糊匹配：按顺序命中字符即可，连续命中与开头命中权重更高。
 * 中文没有词边界，所以位置加分只认「开头」和「分隔符之后」。
 */
export interface FuzzyHit {
  score: number;
  /** 命中的字符下标，用于高亮 */
  positions: number[];
}

const SEPARATOR = /[\s\-_/·:：|]/;

export function fuzzyMatch(query: string, target: string): FuzzyHit | null {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return { score: 0, positions: [] };

  const t = target.toLowerCase();
  if (q.length > t.length) return null;

  let qi = 0;
  let score = 0;
  let prevIndex = -2;
  const positions: number[] = [];

  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] !== q[qi]) continue;

    positions.push(i);
    if (i === prevIndex + 1) score += 8;
    else score += 1;

    if (i === 0) score += 12;
    else if (SEPARATOR.test(t[i - 1] ?? '')) score += 6;

    prevIndex = i;
    qi += 1;
  }

  if (qi < q.length) return null;

  // 目标越长，命中越"散"，适当减分
  score -= Math.min(20, Math.floor((t.length - q.length) / 3));
  return { score, positions };
}

/** 把命中位置切成 [文本片段, 是否高亮] 序列，供渲染使用 */
export function splitHighlight(text: string, positions: number[]): [string, boolean][] {
  if (positions.length === 0) return [[text, false]];

  const marked = new Set(positions);
  const parts: [string, boolean][] = [];
  let buffer = '';
  let bufferMarked = marked.has(0);

  for (let i = 0; i < text.length; i += 1) {
    const isMarked = marked.has(i);
    if (isMarked !== bufferMarked && buffer.length > 0) {
      parts.push([buffer, bufferMarked]);
      buffer = '';
      bufferMarked = isMarked;
    }
    buffer += text[i];
  }
  if (buffer.length > 0) parts.push([buffer, bufferMarked]);
  return parts;
}

export interface Ranked<T> {
  item: T;
  score: number;
  positions: number[];
}

/** 按得分降序取前 limit 条 */
export function rankByFuzzy<T>(
  query: string,
  items: readonly T[],
  toText: (item: T) => string,
  limit: number,
): Ranked<T>[] {
  const hits: Ranked<T>[] = [];
  for (const item of items) {
    const hit = fuzzyMatch(query, toText(item));
    if (hit) hits.push({ item, score: hit.score, positions: hit.positions });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}
