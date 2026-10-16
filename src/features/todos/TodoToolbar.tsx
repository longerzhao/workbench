import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { Priority } from '@/db/schema';
import { todoRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { defaultWeekDue, todayKey } from '@/lib/date';
import { VIEW_LABELS, type SecondaryFilters, type TodoView } from '@/lib/todoFilters';
import { cn } from '@/lib/cn';

export interface TodoToolbarProps {
  view: TodoView;
  projectId?: string;
  projectName?: string;
  count: number;
  secondary: SecondaryFilters;
  availableTags: string[];
  onSecondaryChange: (next: SecondaryFilters) => void;
  /** trash 视图隐藏新建与筛选 */
  hideFilters?: boolean;
}

function defaultDue(view: TodoView): string | undefined {
  if (view === 'today') return todayKey();
  if (view === 'week') return defaultWeekDue();
  return undefined;
}

export function TodoToolbar({
  view,
  projectId,
  projectName,
  count,
  secondary,
  availableTags,
  onSecondaryChange,
  hideFilters,
}: TodoToolbarProps) {
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const title = projectName
    ? projectName
    : VIEW_LABELS[view];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || submitting || view === 'trash' || view === 'done') return;
    setSubmitting(true);
    try {
      await todoRepo.create({
        title: text,
        dueDate: defaultDue(view),
        projectId,
      });
      setDraft('');
    } catch (error) {
      toast(error instanceof Error ? error.message : '添加失败', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    const tags = secondary.tags.includes(tag)
      ? secondary.tags.filter((t) => t !== tag)
      : [...secondary.tags, tag];
    onSecondaryChange({ ...secondary, tags });
  };

  const setPriority = (priority: Priority | undefined) => {
    onSecondaryChange({ ...secondary, priority });
  };

  return (
    <div className="shrink-0 border-b border-line bg-surface px-4 py-3 lg:px-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-ink">{title}</h1>
          <p className="mt-0.5 text-xs text-ink-subtle">{count} 项</p>
        </div>
      </div>

      {!hideFilters && view !== 'done' && view !== 'trash' ? (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2 rounded-xl bg-surface-2 px-3">
          <Plus className="size-3.5 shrink-0 text-ink-subtle" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="添加任务，回车确认…"
            className="h-9 min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-ink-subtle"
            disabled={submitting}
          />
        </form>
      ) : null}

      {!hideFilters && view !== 'trash' ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={secondary.priority === undefined}
            onClick={() => setPriority(undefined)}
          >
            全部优先级
          </FilterChip>
          {([0, 1, 2, 3] as Priority[]).map((p) => (
            <FilterChip
              key={p}
              active={secondary.priority === p}
              onClick={() => setPriority(p)}
            >
              {p === 0 ? '无优先级' : `P${p}`}
            </FilterChip>
          ))}
          {availableTags.length > 0 ? <span className="mx-1 h-3 w-px bg-line" /> : null}
          {availableTags.map((tag) => (
            <FilterChip
              key={tag}
              active={secondary.tags.includes(tag)}
              onClick={() => toggleTag(tag)}
            >
              #{tag}
            </FilterChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'chip',
        active && 'bg-primary-soft text-primary-text',
      )}
    >
      {children}
    </button>
  );
}
