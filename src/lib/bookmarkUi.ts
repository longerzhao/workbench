import { hostnameOf } from '@/db/repositories/bookmarkRepo';
import type { Bookmark } from '@/db/schema';

/** 字母方块用的单字：优先标题，否则域名首字母 */
export function letterGlyph(title: string, url: string): string {
  const fromTitle = title.trim().charAt(0);
  if (fromTitle) return fromTitle.toUpperCase();
  const host = hostnameOf(url);
  const fromHost = host.trim().charAt(0);
  return fromHost ? fromHost.toUpperCase() : '?';
}

/**
 * 图标方块色板：柔和的一组主题色，按域名哈希取色。
 * 同一网站永远同色、不同网站尽量散开——零网络请求的 favicon 替代品。
 */
export const TILE_PALETTE = [
  '#7c3aed', '#2563eb', '#16a34a', '#d97706',
  '#0d9488', '#db2777', '#4f46e5', '#dc2626',
] as const;

export function bookmarkTileColor(url: string): string {
  const host = hostnameOf(url);
  // djb2：够散、确定性、无依赖
  let hash = 5381;
  for (let i = 0; i < host.length; i += 1) {
    hash = (hash * 33) ^ host.charCodeAt(i);
  }
  const index = Math.abs(hash) % TILE_PALETTE.length;
  return TILE_PALETTE[index]!;
}

export type BookmarkSort = 'manual' | 'clicks';

/** manual 保持仓储返回的手工顺序；clicks 按次数降序 */
export function sortBookmarks(items: Bookmark[], sort: BookmarkSort): Bookmark[] {
  if (sort === 'clicks') {
    return [...items].sort((a, b) => b.clicks - a.clicks || a.title.localeCompare(b.title, 'zh-CN'));
  }
  return items;
}

/** 视图内搜索：标题或域名包含（大小写不敏感） */
export function filterBookmarks(items: Bookmark[], query: string): Bookmark[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (b) => b.title.toLowerCase().includes(q) || hostnameOf(b.url).toLowerCase().includes(q),
  );
}

export interface TopologyColumn {
  group: string;
  items: Bookmark[];
}

/**
 * 拓扑视图数据：按用户排定的分组顺序输出全部列（空分组也保留，全景的意义就是看到结构）。
 * groupOrder 是 listGroupNames/groupOrder 的顺序；书签里出现但顺序里没有的分组按名称接尾。
 */
export function buildBookmarkTopology(
  bookmarks: Bookmark[],
  groupOrder: string[],
): TopologyColumn[] {
  const byGroup = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    const list = byGroup.get(b.group) ?? [];
    list.push(b);
    byGroup.set(b.group, list);
  }

  const ordered: TopologyColumn[] = [];
  const seen = new Set<string>();
  for (const group of groupOrder) {
    ordered.push({ group, items: byGroup.get(group) ?? [] });
    seen.add(group);
  }
  const rest = [...byGroup.keys()]
    .filter((g) => !seen.has(g))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'));
  for (const group of rest) {
    ordered.push({ group, items: byGroup.get(group)! });
  }
  return ordered;
}
