import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExternalLink, GripVertical, Pencil, Trash } from 'lucide-react';
import type { Bookmark } from '@/db/schema';
import { bookmarkRepo, hostnameOf } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { IconButton } from '@/components/ui/Button';
import { letterGlyph } from '@/lib/bookmarkUi';
import { cn } from '@/lib/cn';

export interface BookmarkRowProps {
  bookmark: Bookmark;
  draggable: boolean;
  onEdit: (bookmark: Bookmark) => void;
}

export function BookmarkRow({ bookmark, draggable, onEdit }: BookmarkRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bookmark.id,
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const open = async () => {
    try {
      await bookmarkRepo.recordClick(bookmark.id);
    } catch {
      /* 点击计数失败不挡打开 */
    }
    window.open(bookmark.url, '_blank', 'noopener,noreferrer');
  };

  const remove = async () => {
    if (!window.confirm(`删除书签「${bookmark.title}」？`)) return;
    try {
      await bookmarkRepo.remove(bookmark.id);
      toast('已移入回收站');
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-2',
        isDragging && 'z-10 bg-surface-2 opacity-90 shadow-sm',
      )}
    >
      {draggable ? (
        <button
          type="button"
          className="cursor-grab touch-none text-ink-subtle active:cursor-grabbing"
          aria-label="拖拽排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      ) : (
        <span className="w-4" />
      )}

      <button
        type="button"
        onClick={() => void open()}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        title={bookmark.url}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-primary/12 text-[0.75rem] font-bold uppercase text-primary-text">
          {letterGlyph(bookmark.title, bookmark.url)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.875rem] font-medium text-ink">
            {bookmark.title}
          </span>
          <span className="block truncate text-[0.75rem] text-ink-subtle">
            {hostnameOf(bookmark.url)}
            {bookmark.clicks > 0 ? ` · ${bookmark.clicks} 次` : ''}
          </span>
        </span>
        <ExternalLink className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50" />
      </button>

      <IconButton label="编辑" className="size-7 opacity-0 group-hover:opacity-100" onClick={() => onEdit(bookmark)}>
        <Pencil className="size-3.5" />
      </IconButton>
      <IconButton
        label="删除"
        className="size-7 text-danger opacity-0 group-hover:opacity-100"
        onClick={() => void remove()}
      >
        <Trash className="size-3.5" />
      </IconButton>
    </li>
  );
}
