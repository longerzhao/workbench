import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Folder, GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface BookmarkGroupRowProps {
  name: string;
  active: boolean;
  /** 拖拽手柄与按钮区 */
  actions?: ReactNode;
  onSelect: () => void;
}

/**
 * 可拖拽的分组行。拖拽手柄单独占一格，只有按住它才能发起拖动，
 * 否则点击分组与 hover 按钮会被误判成拖拽。
 */
export function BookmarkGroupRow({ name, active, actions, onSelect }: BookmarkGroupRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-0.5 rounded-[10px] pr-1',
        active ? 'bg-primary-soft text-primary-text' : 'hover:bg-surface-2',
        isDragging && 'z-10 opacity-70 shadow-[var(--shadow-pop)]',
      )}
    >
      <button
        type="button"
        aria-label={`拖动排序 ${name}`}
        title="拖动排序"
        className="cursor-grab touch-none py-2 pl-0.5 text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-1.5 pr-1 text-left text-[0.8125rem]"
      >
        <Folder className="size-3.5 shrink-0 opacity-70" />
        <span className="truncate">{name}</span>
      </button>

      {actions}
    </li>
  );
}