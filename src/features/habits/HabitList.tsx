import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Flame, Plus } from 'lucide-react';
import type { Habit, HabitLog } from '@/db/schema';
import { habitRepo } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { HabitRow } from './HabitRow';

export interface HabitListProps {
  habits: Habit[] | undefined;
  logs: HabitLog[] | undefined;
  showArchived: boolean;
  onShowArchivedChange: (v: boolean) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
}

export function HabitList({
  habits,
  logs,
  showArchived,
  onShowArchivedChange,
  onAdd,
  onEdit,
}: HabitListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (habits === undefined || logs === undefined) {
    return (
      <div className="p-4">
        <SkeletonLines lines={5} />
      </div>
    );
  }

  const visible = habits.filter((h) => showArchived || !h.archived);
  const active = visible.filter((h) => !h.archived);

  const hitsByHabit = new Map<string, Set<string>>();
  for (const log of logs) {
    const set = hitsByHabit.get(log.habitId) ?? new Set();
    set.add(log.date);
    hitsByHabit.set(log.habitId, set);
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active: a, over } = event;
    if (!over || a.id === over.id) return;
    const ids = active.map((h) => h.id);
    const oldIndex = ids.indexOf(String(a.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void habitRepo.reorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ink">我的习惯</h2>
          <p className="text-[0.75rem] text-ink-subtle">
            {active.length} 个进行中
            {habits.some((h) => h.archived) ? ` · ${habits.filter((h) => h.archived).length} 个已归档` : ''}
          </p>
        </div>
        <label className="flex items-center gap-1.5 text-[0.75rem] text-ink-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => onShowArchivedChange(e.target.checked)}
            className="size-3.5 accent-[var(--primary)]"
          />
          显示归档
        </label>
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus className="size-3.5" />
          新建
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <Empty
            icon={<Flame />}
            title={showArchived ? '还没有习惯' : '没有进行中的习惯'}
            hint="点右上角新建一个想坚持的小事。"
            className="py-16"
            action={
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus className="size-3.5" />
                新建习惯
              </Button>
            }
          />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={active.map((h) => h.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-0.5 p-2 lg:p-3">
                {visible.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    hitDates={hitsByHabit.get(habit.id) ?? new Set()}
                    draggable={!habit.archived}
                    onEdit={onEdit}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </section>
  );
}
