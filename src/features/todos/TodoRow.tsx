import {
  useEffect,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, GripVertical, Plus, Trash, X } from 'lucide-react';
import type { Priority, Project, Todo } from '@/db/schema';
import { todoRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Checkbox } from '@/components/ui/Checkbox';
import { IconButton } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown';
import { humanDate, isOverdue } from '@/lib/date';
import { cn } from '@/lib/cn';

const PRIORITY_DOT: Record<Priority, string> = {
  0: 'bg-transparent border border-line-strong',
  1: 'bg-info',
  2: 'bg-warning',
  3: 'bg-danger',
};

const PRIORITY_OPTS: { value: Priority; label: string }[] = [
  { value: 0, label: '无' },
  { value: 1, label: '低' },
  { value: 2, label: '中' },
  { value: 3, label: '高' },
];

export interface TodoRowProps {
  todo: Todo;
  projects: Project[];
  expanded: boolean;
  onToggleExpand: () => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  selectable: boolean;
  draggable: boolean;
}

export function TodoRow({
  todo,
  projects,
  expanded,
  onToggleExpand,
  selected,
  onToggleSelect,
  selectable,
  draggable,
}: TodoRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = isOverdue(todo.dueDate);
  const doneSubs = todo.subtasks.filter((s) => s.done).length;
  const subTotal = todo.subtasks.length;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-xl border border-transparent transition-colors',
        expanded ? 'border-line bg-surface shadow-[var(--shadow-card)]' : 'hover:bg-surface-2',
        isDragging && 'z-10 opacity-80 shadow-[var(--shadow-pop)]',
        selected && !expanded && 'bg-primary-soft/40',
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        className="flex cursor-pointer items-start gap-2 px-2 py-2"
      >
        {draggable ? (
          <button
            type="button"
            className="mt-1 cursor-grab touch-none text-ink-subtle opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
            aria-label="拖动排序"
            title="拖动排序"
            onClick={(e) => e.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        ) : (
          <span className="mt-1 w-3.5 shrink-0" />
        )}

        {selectable ? (
          <Checkbox
            variant="select"
            checked={selected}
            onChange={() => onToggleSelect(todo.id)}
            label={`多选 ${todo.title}`}
            title="多选，用于批量操作"
            className="mt-1"
          />
        ) : null}

        <Checkbox
          variant="complete"
          checked={todo.done}
          onChange={() => void todoRepo.toggle(todo.id)}
          label={`完成 ${todo.title}`}
          title="标记完成"
          className="mt-1"
        />

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[0.8125rem] leading-snug',
              todo.done ? 'text-ink-subtle line-through' : 'text-ink',
            )}
          >
            {todo.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[0.6875rem] text-ink-subtle">
            {todo.priority > 0 ? (
              <span className="flex items-center gap-1">
                <span className={cn('size-1.5 rounded-full', PRIORITY_DOT[todo.priority])} />
                P{todo.priority}
              </span>
            ) : null}
            {todo.dueDate ? (
              <span className={cn(overdue && !todo.done && 'font-medium text-danger')}>
                {overdue && !todo.done ? '已逾期 · ' : ''}
                {humanDate(todo.dueDate)}
              </span>
            ) : (
              <span>未排期</span>
            )}
            {subTotal > 0 ? (
              <span>
                子任务 {doneSubs}/{subTotal}
              </span>
            ) : null}
            {todo.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-primary-text">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <ChevronDown
          className={cn(
            'mt-1 size-3.5 shrink-0 text-ink-subtle transition-transform',
            expanded && 'rotate-180',
          )}
        />

        <IconButton
          label="删除"
          className="mt-0.5 size-7 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            void todoRepo.remove(todo.id).then(() => toast('已移入回收站'));
          }}
        >
          <Trash className="size-3.5" />
        </IconButton>
      </div>

      {expanded ? (
        <TodoEditor
          key={todo.id}
          todo={todo}
          projects={projects}
          onCollapse={onToggleExpand}
        />
      ) : null}
    </li>
  );
}

function MetaField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[0.6875rem] text-ink-subtle">{label}</p>
      {children}
    </div>
  );
}

function MetaTrigger({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-8 w-full items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 text-left text-[0.8125rem] text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
      <ChevronDown className="size-3.5 shrink-0 text-ink-subtle" />
    </button>
  );
}

function TodoEditor({
  todo,
  projects,
  onCollapse,
}: {
  todo: Todo;
  projects: Project[];
  onCollapse: () => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [note, setNote] = useState(todo.note ?? '');
  const [tagDraft, setTagDraft] = useState('');
  const [subDraft, setSubDraft] = useState('');

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCollapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCollapse]);

  const saveTitle = async () => {
    const next = title.trim();
    if (!next || next === todo.title) {
      setTitle(todo.title);
      return;
    }
    await todoRepo.update(todo.id, { title: next });
  };

  const saveNote = async () => {
    const next = note.trim();
    if (next === (todo.note ?? '')) return;
    await todoRepo.update(todo.id, { note: next || undefined });
  };

  const addTag = async (event?: FormEvent) => {
    event?.preventDefault();
    const tag = tagDraft.trim().replace(/^#/, '');
    if (!tag || todo.tags.includes(tag)) {
      setTagDraft('');
      return;
    }
    await todoRepo.update(todo.id, { tags: [...todo.tags, tag] });
    setTagDraft('');
  };

  const addSub = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!subDraft.trim()) return;
    await todoRepo.addSubtask(todo.id, subDraft);
    setSubDraft('');
  };

  return (
    <div
      className="space-y-3 border-t border-line px-3 pt-3 pb-3"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => void saveTitle()}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void saveTitle();
          }
        }}
        className="w-full bg-transparent text-sm font-medium text-ink outline-none"
      />

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => void saveNote()}
        rows={2}
        placeholder="备注…"
        className="w-full resize-none rounded-lg bg-surface-2 px-2.5 py-2 text-[0.8125rem] text-ink outline-none placeholder:text-ink-subtle"
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <MetaField label="优先级">
          <Dropdown
            align="start"
            trigger={
              <MetaTrigger>
                <span
                  className={cn('size-2 shrink-0 rounded-full', PRIORITY_DOT[todo.priority])}
                />
                {PRIORITY_OPTS.find((o) => o.value === todo.priority)?.label ?? '无'}
              </MetaTrigger>
            }
          >
            {(close) => (
              <>
                {PRIORITY_OPTS.map((o) => (
                  <DropdownItem
                    key={o.value}
                    active={todo.priority === o.value}
                    icon={
                      <span className={cn('size-2.5 rounded-full', PRIORITY_DOT[o.value])} />
                    }
                    onClick={() => {
                      void todoRepo.update(todo.id, { priority: o.value });
                      close();
                    }}
                  >
                    {o.label}
                  </DropdownItem>
                ))}
              </>
            )}
          </Dropdown>
        </MetaField>

        <MetaField label="到期日">
          <DatePicker
            key={todo.id}
            value={todo.dueDate}
            onChange={(dueDate) => void todoRepo.update(todo.id, { dueDate })}
            placeholder="未设置"
          />
        </MetaField>

        <MetaField label="项目">
          <Dropdown
            align="start"
            className="min-w-[12rem]"
            trigger={
              <MetaTrigger>
                {todo.projectId ? (
                  <>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          projects.find((p) => p.id === todo.projectId)?.color ??
                          'var(--ink-subtle)',
                      }}
                    />
                    {projects.find((p) => p.id === todo.projectId)?.name ?? '未知项目'}
                  </>
                ) : (
                  '收件箱'
                )}
              </MetaTrigger>
            }
          >
            {(close) => (
              <>
                <DropdownItem
                  active={!todo.projectId}
                  onClick={() => {
                    void todoRepo.update(todo.id, { projectId: undefined });
                    close();
                  }}
                >
                  收件箱
                </DropdownItem>
                {projects.map((p) => (
                  <DropdownItem
                    key={p.id}
                    active={todo.projectId === p.id}
                    icon={
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                    }
                    onClick={() => {
                      void todoRepo.update(todo.id, { projectId: p.id });
                      close();
                    }}
                  >
                    {p.name}
                  </DropdownItem>
                ))}
              </>
            )}
          </Dropdown>
        </MetaField>
      </div>

      <div>
        <p className="text-[0.6875rem] text-ink-subtle">标签</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {todo.tags.map((tag) => (
            <span
              key={tag}
              className="chip gap-1 bg-primary-soft text-primary-text"
            >
              #{tag}
              <button
                type="button"
                aria-label={`移除 ${tag}`}
                onClick={() =>
                  void todoRepo.update(todo.id, {
                    tags: todo.tags.filter((t) => t !== tag),
                  })
                }
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <form onSubmit={addTag} className="flex items-center">
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="回车添加"
              className="h-7 w-24 bg-transparent text-[0.75rem] outline-none placeholder:text-ink-subtle"
            />
          </form>
        </div>
      </div>

      <div>
        <p className="text-[0.6875rem] text-ink-subtle">子任务</p>
        <ul className="mt-1 space-y-1">
          {todo.subtasks.map((sub) => (
            <li key={sub.id} className="flex items-center gap-2">
              <Checkbox
                checked={sub.done}
                onChange={() => void todoRepo.toggleSubtask(todo.id, sub.id)}
                label={sub.title}
              />
              <span
                className={cn(
                  'min-w-0 flex-1 text-[0.8125rem]',
                  sub.done ? 'text-ink-subtle line-through' : 'text-ink',
                )}
              >
                {sub.title}
              </span>
              <IconButton
                label="删除子任务"
                className="size-6"
                onClick={() => void todoRepo.removeSubtask(todo.id, sub.id)}
              >
                <X className="size-3" />
              </IconButton>
            </li>
          ))}
        </ul>
        <form onSubmit={addSub} className="mt-1.5 flex items-center gap-2">
          <Plus className="size-3.5 text-ink-subtle" />
          <input
            value={subDraft}
            onChange={(e) => setSubDraft(e.target.value)}
            placeholder="添加子任务…"
            className="h-7 min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-ink-subtle"
          />
        </form>
      </div>
    </div>
  );
}
