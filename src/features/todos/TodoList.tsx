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
import { ListChecks } from 'lucide-react';
import type { Project, Todo } from '@/db/schema';
import { todoRepo } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { TodoRow } from './TodoRow';

export interface TodoListProps {
  todos: Todo[] | undefined;
  projects: Project[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  selectable: boolean;
  draggable: boolean;
}

export function TodoList({
  todos,
  projects,
  expandedId,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  selectable,
  draggable,
}: TodoListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (todos === undefined) {
    return (
      <div className="p-4">
        <SkeletonLines lines={6} />
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <Empty
        icon={<ListChecks />}
        title="这里还没有任务"
        hint="用上方输入框添加，或换一个视图看看。"
        className="py-16"
      />
    );
  }

  const ids = todos.map((t) => t.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    void todoRepo.reorderWithin(next);
  };

  const list = (
    <ul className="space-y-0.5 p-2 lg:p-3">
      {todos.map((todo) => (
        <TodoRow
          key={todo.id}
          todo={todo}
          projects={projects}
          expanded={expandedId === todo.id}
          onToggleExpand={() => onToggleExpand(todo.id)}
          selected={selectedIds.has(todo.id)}
          onToggleSelect={onToggleSelect}
          selectable={selectable}
          draggable={draggable}
        />
      ))}
    </ul>
  );

  if (!draggable) return list;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}
