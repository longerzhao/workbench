/** 列表摘要：压成单行并截断，避免 Markdown 符号占满侧栏 */
export function summarizeNote(content: string, max = 80): string {
  const line = content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 0);

  if (!line) return '空笔记';

  const cleaned = line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^>\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/[*_`~]/g, '')
    .trim();

  const text = cleaned || '空笔记';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

/** 标签输入：逗号 / 空白分隔，去重保序 */
export function parseTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,，\s]+/)) {
    const tag = part.trim();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

export function formatTagsInput(tags: string[]): string {
  return tags.join(', ');
}
