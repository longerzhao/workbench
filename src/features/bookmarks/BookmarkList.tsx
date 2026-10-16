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
import { Bookmark as BookmarkIcon, Plus } from 'lucide-react';
import type { Bookmark } from '@/db/schema';
import { bookmarkRepo } from '@/db/repositories';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { BookmarkRow } from './BookmarkRow';

export interface BookmarkListProps {
  group: string;
  items: Bookmark[] | undefined;
  onAdd: () => void;
  onEdit: (bookmark: Bookmark) => void;
}

export function BookmarkList({ group, items, onAdd, onEdit }: BookmarkListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (items === undefined) {
    return (
      <div className="p-4">
        <SkeletonLines lines={5} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
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

  const ids = items.map((b) => b.id);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ids, oldIndex, newIndex);
    void bookmarkRepo.reorderInGroup(group, next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-0.5 p-2 lg:p-3">
          {items.map((bookmark) => (
            <BookmarkRow
              key={bookmark.id}
              bookmark={bookmark}
              draggable
              onEdit={onEdit}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
