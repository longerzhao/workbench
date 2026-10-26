import { Folder } from 'lucide-react';
import type { Bookmark } from '@/db/schema';
import { bookmarkRepo, hostnameOf } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { bookmarkTileColor, filterBookmarks, letterGlyph, type TopologyColumn } from '@/lib/bookmarkUi';

export interface BookmarkTopologyProps {
  /** 拓扑列（已按分组顺序构建、未过滤） */
  columns: TopologyColumn[] | undefined;
  /** 跨全部分组的搜索；列内过滤与来源标签由此驱动 */
  query: string;
  /** 点击列头跳转到该分组 */
  onJump: (group: string) => void;
}

/**
 * 拓扑视图：按分组分列的全景板。
 * 列头点击跳到该分组；小卡点击直接打开；搜索过滤跨全部分组并带来源标签。
 */
export function BookmarkTopology({ columns, query, onJump }: BookmarkTopologyProps) {
  const open = async (bookmark: Bookmark) => {
    try {
      await bookmarkRepo.recordClick(bookmark.id);
    } catch {
      /* 点击计数失败不挡打开 */
    }
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  if (columns === undefined) {
    return (
      <div className="p-4">
        <SkeletonLines lines={5} />
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <Empty
        icon={<Folder />}
        title="还没有任何书签"
        hint="点右上角「添加书签」开始。"
        className="py-16"
      />
    );
  }

  const filtered = Boolean(query.trim());
  const visibleColumns = columns.map((col) => ({
    ...col,
    visible: filtered ? filterBookmarks(col.items, query) : col.items,
  }));
  const total = visibleColumns.reduce((sum, col) => sum + col.visible.length, 0);

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-3 lg:p-4">
      {visibleColumns.map((col) => (
        <section
          key={col.group}
          className="flex max-h-full w-44 shrink-0 flex-col overflow-hidden rounded-[12px] border border-line bg-surface"
        >
          <button
            type="button"
            onClick={() => onJump(col.group)}
            title={`跳转到「${col.group}」`}
            className="flex shrink-0 items-center gap-1.5 border-b border-line px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
          >
            <Folder className="size-3.5 shrink-0 text-ink-subtle" />
            <span className="min-w-0 flex-1 truncate text-[0.75rem] font-semibold text-ink">
              {col.group}
            </span>
            <span className="shrink-0 rounded-full bg-surface-2 px-1.5 text-[0.625rem] tabular-nums text-ink-muted">
              {filtered ? `${col.visible.length}/${col.items.length}` : col.items.length}
            </span>
          </button>

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto p-2">
            {col.visible.length === 0 ? (
              <p className="py-3 text-center text-[0.6875rem] text-ink-subtle">
                {filtered ? '无匹配' : '暂无书签'}
              </p>
            ) : (
              col.visible.map((bookmark) => {
                const color = bookmarkTileColor(bookmark.url);
                return (
                  <button
                    key={bookmark.id}
                    type="button"
                    onClick={() => void open(bookmark)}
                    title={`${bookmark.title} · ${hostnameOf(bookmark.url)}${bookmark.clicks > 0 ? ` · ${bookmark.clicks} 次` : ''} · 在 ${col.group}`}
                    className="flex min-w-0 items-center gap-2 rounded-[9px] border border-line px-2 py-1.5 text-left transition-colors hover:border-primary"
                  >
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-[7px] text-[0.6875rem] font-bold uppercase"
                      style={{ backgroundColor: `${color}1f`, color }}
                    >
                      {letterGlyph(bookmark.title, bookmark.url)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.75rem] font-medium text-ink">
                      {bookmark.title}
                    </span>
                    {filtered ? (
                      <span className="shrink-0 text-[0.625rem] text-primary-text">
                        在 {col.group}
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>
      ))}

      {filtered ? (
        <p className="self-center whitespace-nowrap pl-1 text-[0.6875rem] text-ink-subtle">
          {total} 个匹配
        </p>
      ) : null}
    </div>
  );
}
