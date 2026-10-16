import { Suspense, lazy, type ComponentType } from 'react';
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useUIStore } from '@/app/store/ui';
import { PanelGripContext } from '@/components/ui/panelChrome';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { CARD_MAP, resolveCardOrder, resolveVisible, type CardId } from './layout';
import { TodoCard } from './cards/TodoCard';
import { PomodoroCard } from './cards/PomodoroCard';
import { ScheduleCard } from './cards/ScheduleCard';
import { HabitsCard } from './cards/HabitsCard';
import { BookmarksCard } from './cards/BookmarksCard';
import { NotesCard } from './cards/NotesCard';

// 趋势卡带 recharts，单独切块按需加载，不拖慢首屏
const TrendCard = lazy(() =>
  import('./cards/TrendCard').then((module) => ({ default: module.TrendCard })),
);

const CARD_COMPONENTS: Record<CardId, ComponentType> = {
  todos: TodoCard,
  pomodoro: PomodoroCard,
  schedule: ScheduleCard,
  habits: HabitsCard,
  bookmarks: BookmarksCard,
  notes: NotesCard,
  trend: TrendCard,
};

/** 12 列栅格：<768 单列，768–1279 两列，≥1280 按注册表给的比例分列 */
function spanClass(id: CardId): string {
  const def = CARD_MAP.get(id);
  return cn(
    'col-span-1',
    def?.colSpan === 4 ? 'xl:col-span-4' : 'xl:col-span-6',
    'row-span-3',
  );
}

export function DashboardPage() {
  const order = useUIStore((state) => state.cards.order);
  const hidden = useUIStore((state) => state.cards.hidden);
  const setCardOrder = useUIStore((state) => state.setCardOrder);

  const visible = resolveVisible(order, hidden);

  const sensors = useSensors(
    // 8px 的触发距离：点击仍然穿透到卡片内部，只有真正拖动才进入排序
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visible.indexOf(active.id as CardId);
    const newIndex = visible.indexOf(over.id as CardId);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(visible, oldIndex, newIndex);
    // 隐藏的卡片接在末尾，用户重新显示时不会插到奇怪的位置
    const hiddenCards = resolveCardOrder(order).filter((id) => hidden.includes(id));
    setCardOrder([...moved, ...hiddenCards]);
  };

  if (visible.length === 0) {
    return (
      <div className="grid h-full place-items-center p-8">
        <p className="text-sm text-ink-muted">
          所有卡片都被隐藏了，到「设置 → 看板卡片」里重新打开。
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visible} strategy={rectSortingStrategy}>
          <div className="grid auto-rows-[96px] grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
            {visible.map((id) => (
              <SortableCard key={id} id={id} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableCard({ id }: { id: CardId }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const Card = CARD_COMPONENTS[id];

  const grip = (
    <button
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      aria-label="拖动调整卡片顺序"
      title="拖动调整顺序"
      className="-ml-1 grid size-5 shrink-0 cursor-grab touch-none place-items-center rounded-md text-ink-subtle opacity-0 transition-opacity hover:bg-surface-2 hover:text-ink focus-visible:opacity-100 group-hover/card:opacity-100 active:cursor-grabbing"
    >
      <GripVertical className="size-3.5" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group/card min-h-0',
        spanClass(id),
        isDragging && 'relative z-20 opacity-95',
      )}
    >
      <PanelGripContext.Provider value={grip}>
        <Suspense fallback={<Skeleton className="h-full rounded-[14px]" />}>
          <Card />
        </Suspense>
      </PanelGripContext.Provider>
    </div>
  );
}
