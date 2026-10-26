import { Bookmark as BookmarkIcon, Plus } from 'lucide-react';
import type { Bookmark } from '@/db/schema';
import { bookmarkRepo, hostnameOf } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { bookmarkTileColor, letterGlyph } from '@/lib/bookmarkUi';

export interface BookmarkGridProps {
  items: Bookmark[] | undefined;
  /** 搜索无匹配与分组为空的提示不同 */
  filtered: boolean;
  onAdd: () => void;
}

/**
 * 启动页式网格：单行小卡（彩色方块 + 名字）。
 * 域名与点击次数收进悬停提示；拖拽排序在列表视图做。
 */
export function BookmarkGrid({ items, filtered, onAdd }: BookmarkGridProps) {
  if (items === undefined) {
    return (
      <div className="p-4">
        <SkeletonLines lines={5} />
      </div>
    );
  }

  if (items.length === 0) {
    return filtered ? (
      <Empty icon={<BookmarkIcon />} title="没有匹配的书签" hint="换个关键词试试" className="py-16" />
    ) : (
      <Empty
        icon={<BookmarkIcon />}
        title="这个分组还是空的"
        hint="添加一个常用网址吧。"
        className="py-16"
        action={
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="size-3.5" />
            添加书签
          </Button>
        }
      />
    );
  }

  const open = async (bookmark: Bookmark) => {
    try {
      await bookmarkRepo.recordClick(bookmark.id);
    } catch {
      /* 点击计数失败不挡打开 */
    }
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ul className="grid gap-2 p-3 [grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr))] lg:p-4">
      {items.map((bookmark) => {
        const color = bookmarkTileColor(bookmark.url);
        return (
          <li key={bookmark.id}>
            <button
              type="button"
              onClick={() => void open(bookmark)}
              title={`${bookmark.title} · ${hostnameOf(bookmark.url)}${bookmark.clicks > 0 ? ` · ${bookmark.clicks} 次` : ''}`}
              className="flex w-full min-w-0 items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-primary"
            >
              <span
                className="grid size-7 shrink-0 place-items-center rounded-[8px] text-[0.8125rem] font-bold uppercase"
                style={{ backgroundColor: `${color}1f`, color }}
              >
                {letterGlyph(bookmark.title, bookmark.url)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-ink">
                {bookmark.title}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
