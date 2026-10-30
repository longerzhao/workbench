import { useState, type FormEvent } from 'react';
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
import { PanelLeftClose, PanelLeftOpen, Pencil, Plus, Trash } from 'lucide-react';
import { bookmarkRepo, DEFAULT_BOOKMARK_GROUP } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { IconButton } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';
import { BookmarkGroupRow } from './BookmarkGroupRow';

export interface BookmarkSidebarProps {
  groups: string[] | undefined;
  activeGroup: string;
  onSelect: (group: string) => void;
  compact?: boolean;
  /** 折叠成窄边条，只留展开按钮 */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function BookmarkSidebar({
  groups,
  activeGroup,
  onSelect,
  compact,
  collapsed,
  onToggleCollapse,
}: BookmarkSidebarProps) {
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active: a, over } = event;
    if (!over || !groups || a.id === over.id) return;
    const ids = groups;
    const oldIndex = ids.indexOf(String(a.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    void bookmarkRepo.reorderGroups(arrayMove(ids, oldIndex, newIndex));
  };

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    if (groups?.includes(name)) {
      toast(`分组「${name}」已存在`, 'danger');
      return;
    }
    setDraft('');
    onSelect(name);
    toast(`已切换到「${name}」，添加第一条书签即可创建分组`, 'success', 3);
  };

  const commitRename = async (from: string) => {
    const to = renameDraft.trim();
    setRenaming(null);
    if (!to || to === from) return;
    try {
      await bookmarkRepo.renameGroup(from, to);
      onSelect(to);
      toast('已重命名分组', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '重命名失败', 'danger');
    }
  };

  const dissolve = async (name: string) => {
    if (name === DEFAULT_BOOKMARK_GROUP) {
      toast('默认分组不能解散', 'danger');
      return;
    }
    if (!window.confirm(`解散分组「${name}」？其中的书签会移到「${DEFAULT_BOOKMARK_GROUP}」。`)) {
      return;
    }
    try {
      await bookmarkRepo.dissolveGroup(name);
      onSelect(DEFAULT_BOOKMARK_GROUP);
      toast('分组已解散', 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'danger');
    }
  };

  if (compact) {
    return (
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
        {(groups ?? []).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(name)}
            className={cn(
              'chip shrink-0',
              activeGroup === name && 'bg-primary-soft text-primary-text',
            )}
          >
            {name}
          </button>
        ))}
      </div>
    );
  }

  // 折叠态：收成窄边条，只留一个展开按钮，内容区因此能多出 180px。
  // 侧栏始终是同一个元素，只改宽度——这样折叠才有平滑过渡。
  return (
    <aside
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-line bg-surface transition-[width] duration-200',
        collapsed ? 'w-10' : 'w-[220px]',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b border-line',
          collapsed ? 'justify-center px-1.5 py-3' : 'px-3 py-3',
        )}
      >
        {collapsed ? (
          <IconButton
            label="展开分组"
            className="size-7"
            onClick={() => onToggleCollapse?.()}
          >
            <PanelLeftOpen className="size-3.5" />
          </IconButton>
        ) : (
          <>
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-ink-subtle">
              分组
            </p>
            <IconButton
              label="折叠分组"
              className="size-6"
              onClick={() => onToggleCollapse?.()}
            >
              <PanelLeftClose className="size-3.5" />
            </IconButton>
          </>
        )}
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto p-2', collapsed && 'hidden')}>
        {groups === undefined ? (
          <div className="p-2">
            <SkeletonLines lines={4} />
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={groups} strategy={verticalListSortingStrategy}>
              <ul className="space-y-0.5">
                {groups.map((name) => {
                  const active = name === activeGroup;
                  if (renaming === name) {
                    return (
                      <li key={name} className="px-1">
                        <input
                          autoFocus
                          className="input h-8 text-xs"
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => void commitRename(name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') void commitRename(name);
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                        />
                      </li>
                    );
                  }
                  return (
                    <BookmarkGroupRow
                      key={name}
                      name={name}
                      active={active}
                      onSelect={() => onSelect(name)}
                      actions={
                        <>
                          <IconButton
                            label="重命名"
                            className="size-7 opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              setRenaming(name);
                              setRenameDraft(name);
                            }}
                          >
                            <Pencil className="size-3" />
                          </IconButton>
                          {name !== DEFAULT_BOOKMARK_GROUP ? (
                            <IconButton
                              label="解散分组"
                              className="size-7 text-danger opacity-0 group-hover:opacity-100"
                              onClick={() => void dissolve(name)}
                            >
                              <Trash className="size-3" />
                            </IconButton>
                          ) : null}
                        </>
                      }
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <form
        onSubmit={(e) => void createGroup(e)}
        className={cn('border-t border-line p-2', collapsed && 'hidden')}
      >
        <div className="flex gap-1.5">
          <input
            className="input h-8 min-w-0 flex-1 text-xs"
            placeholder="新建分组"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <IconButton label="新建分组" className="size-8" type="submit">
            <Plus className="size-4" />
          </IconButton>
        </div>
      </form>
    </aside>
  );
}
