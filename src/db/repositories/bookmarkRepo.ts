import { db, moveToTrash, nowISO } from '..';
import type { Bookmark } from '../schema';
import { newId } from '@/lib/id';

export interface NewBookmarkInput {
  title: string;
  url: string;
  group?: string;
  order?: number;
}

export const DEFAULT_BOOKMARK_GROUP = '常用';

/** 归一化 URL：没写协议的补 https://，否则点击会跳到相对路径 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** 从 URL 取域名，用于生成兜底图标文字 */
export function hostnameOf(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const bookmarkRepo = {
  async listAll(): Promise<Bookmark[]> {
    const rows = await db.bookmarks.toArray();
    return rows.sort((a, b) => a.group.localeCompare(b.group) || a.order - b.order);
  },

  /** 主页面卡片用的分组视图：组内按点击次数降序 */
  async grouped(): Promise<{ group: string; items: Bookmark[] }[]> {
    const all = await this.listAll();
    const map = new Map<string, Bookmark[]>();
    for (const item of all) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()]
      .map(([group, items]) => ({
        group,
        items: [...items].sort((a, b) => b.clicks - a.clicks || a.order - b.order),
      }))
      .sort((a, b) => a.group.localeCompare(b.group));
  },

  async countAll(): Promise<number> {
    return db.bookmarks.count();
  },

  async create(input: NewBookmarkInput): Promise<Bookmark> {
    const last = await db.bookmarks.orderBy('order').last();
    const bookmark: Bookmark = {
      id: newId('bm'),
      title: input.title.trim() || hostnameOf(input.url),
      url: normalizeUrl(input.url),
      group: input.group?.trim() || DEFAULT_BOOKMARK_GROUP,
      order: input.order ?? (last?.order ?? 0) + 1,
      clicks: 0,
      createdAt: nowISO(),
    };
    await db.bookmarks.add(bookmark);
    return bookmark;
  },

  async update(id: string, patch: Partial<Omit<Bookmark, 'id' | 'createdAt'>>): Promise<void> {
    const next = { ...patch };
    if (next.url) next.url = normalizeUrl(next.url);
    await db.bookmarks.update(id, next);
  },

  async remove(id: string): Promise<void> {
    const bookmark = await db.bookmarks.get(id);
    if (!bookmark) return;
    await moveToTrash('bookmarks', id, bookmark.title);
  },

  /** 点击计数用于「常用自动置顶」 */
  async recordClick(id: string): Promise<void> {
    const bookmark = await db.bookmarks.get(id);
    if (!bookmark) return;
    await db.bookmarks.update(id, { clicks: bookmark.clicks + 1 });
  },

  async listByGroup(group: string): Promise<Bookmark[]> {
    const rows = await db.bookmarks.where('group').equals(group).toArray();
    return rows.sort((a, b) => a.order - b.order);
  },

  /** 派生去重分组名；保证默认组至少出现在空库侧栏时可被选中 */
  async listGroupNames(): Promise<string[]> {
    const all = await db.bookmarks.toArray();
    const names = new Set<string>();
    for (const row of all) {
      const g = row.group.trim() || DEFAULT_BOOKMARK_GROUP;
      names.add(g);
    }
    if (names.size === 0) names.add(DEFAULT_BOOKMARK_GROUP);
    return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  },

  /** 组内重排：复用原 order 槽位，避免全表重写 */
  async reorderInGroup(group: string, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return;
    await db.transaction('rw', db.bookmarks, async () => {
      const rows = await db.bookmarks.bulkGet(orderedIds);
      const valid = rows.filter((r): r is Bookmark => r != null && r.group === group);
      if (valid.length !== orderedIds.length) return;
      const orders = valid.map((r) => r.order).sort((a, b) => a - b);
      await Promise.all(
        orderedIds.map((id, index) => db.bookmarks.update(id, { order: orders[index]! })),
      );
    });
  },

  async renameGroup(from: string, to: string): Promise<void> {
    const source = from.trim();
    const target = to.trim();
    if (!source || !target) throw new Error('分组名不能为空');
    if (source === target) return;

    const names = await this.listGroupNames();
    if (names.includes(target) && target !== source) {
      throw new Error(`分组「${target}」已存在`);
    }

    const rows = await db.bookmarks.where('group').equals(source).toArray();
    if (rows.length === 0) return;
    await db.bookmarks.bulkPut(rows.map((r) => ({ ...r, group: target })));
  },

  /** 解散分组：条目并入默认组（或指定目标） */
  async dissolveGroup(group: string, target = DEFAULT_BOOKMARK_GROUP): Promise<void> {
    const source = group.trim();
    const dest = target.trim() || DEFAULT_BOOKMARK_GROUP;
    if (!source || source === dest) return;

    const rows = await db.bookmarks.where('group').equals(source).toArray();
    if (rows.length === 0) return;
    await db.bookmarks.bulkPut(rows.map((r) => ({ ...r, group: dest })));
  },
};
