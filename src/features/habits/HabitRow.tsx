import { createElement } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Archive, ArchiveRestore, GripVertical, Pencil, Trash } from 'lucide-react';
import type { Habit } from '@/db/schema';
import { habitRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { IconButton } from '@/components/ui/Button';
import { habitIcon } from '@/lib/habitIcons';
import { currentStreak, longestStreak, weekHitCount } from '@/lib/habitStats';
import { todayKey, weekRange, addDays, weekdayShort } from '@/lib/date';
import { cn } from '@/lib/cn';

export interface HabitRowProps {
  habit: Habit;
  hitDates: Set<string>;
  draggable: boolean;
  onEdit: (habit: Habit) => void;
}

/** 行内补卡范围：今天往回 7 天（含今天） */
function lastSevenDays(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
}

export function HabitRow({ habit, hitDates, draggable, onEdit }: HabitRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
    disabled: !draggable || habit.archived,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const today = todayKey();
  const { start, end } = weekRange(today);
  const weekHits = weekHitCount(hitDates, start, end);
  const streak = currentStreak(hitDates, today);
  const longest = longestStreak(hitDates);

  const toggle = async (date: string) => {
    try {
      await habitRepo.toggleLog(habit.id, date);
    } catch (error) {
      toast(error instanceof Error ? error.message : '打卡失败', 'danger');
    }
  };

  const archive = async () => {
    try {
      await habitRepo.setArchived(habit.id, !habit.archived);
      toast(habit.archived ? '已取消归档' : '已归档', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'danger');
    }
  };

  const remove = async () => {
    if (!window.confirm(`删除习惯「${habit.name}」？打卡记录会一起移入回收站，可在数据菜单恢复（保留 7 天）。`)) return;
    try {
      await habitRepo.remove(habit.id);
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
        'group flex items-center gap-2 rounded-[10px] px-2 py-2.5 transition-colors hover:bg-surface-2',
        isDragging && 'z-10 bg-surface-2 opacity-90 shadow-sm',
        habit.archived && 'opacity-60',
      )}
    >
      {draggable && !habit.archived ? (
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

      {createElement(habitIcon(habit.icon), {
        className: 'size-4 shrink-0',
        style: { color: habit.color },
      })}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[0.875rem] font-medium text-ink">{habit.name}</span>
          {habit.archived ? <span className="chip">已归档</span> : null}
        </div>
        <p className="text-[0.75rem] text-ink-subtle">
          本周 {weekHits}/{habit.targetPerWeek} · 连续 {streak} 天 · 最长 {longest} 天
        </p>
      </div>

      {!habit.archived ? (
        <div
          className="flex shrink-0 items-center gap-1"
          role="group"
          aria-label={`${habit.name} 近 7 天打卡`}
        >
          {lastSevenDays(today).map((date) => {
            const done = hitDates.has(date);
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                aria-label={`${weekdayShort(date)}${isToday ? '（今天）' : ''} ${done ? '已打卡' : '未打卡'}`}
                aria-pressed={done}
                title={`${date}${isToday ? '（今天）' : ''} · 点击${done ? '撤销' : '补卡'}`}
                onClick={() => void toggle(date)}
                className={cn(
                  'size-6 rounded-[7px] border transition-all duration-150',
                  done ? 'border-transparent' : 'border-line-strong hover:border-primary',
                  isToday && 'ring-1 ring-primary ring-offset-1 ring-offset-[var(--surface)]',
                )}
                style={done ? { backgroundColor: habit.color } : undefined}
              />
            );
          })}
        </div>
      ) : null}

      <IconButton label="编辑" className="size-7 opacity-0 group-hover:opacity-100" onClick={() => onEdit(habit)}>
        <Pencil className="size-3.5" />
      </IconButton>
      <IconButton
        label={habit.archived ? '取消归档' : '归档'}
        className="size-7 opacity-0 group-hover:opacity-100"
        onClick={() => void archive()}
      >
        {habit.archived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
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
