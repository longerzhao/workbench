import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, ListChecks, Plus } from 'lucide-react';
import { todoRepo } from '@/db/repositories';
import type { Priority, Todo } from '@/db/schema';
import { Panel } from '@/components/ui/Panel';
import { Checkbox } from '@/components/ui/Checkbox';
import { Empty } from '@/components/ui/Empty';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { IconButton } from '@/components/ui/Button';
import { toast } from '@/app/store/toast';
import { humanDate, isOverdue, todayKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const VISIBLE_LIMIT = 6;

const PRIORITY_DOT: Record<Priority, string> = {
  0: 'bg-transparent',
  1: 'bg-info',
  2: 'bg-warning',
  3: 'bg-danger',
};

export function TodoCard() {
  const todos = useLiveQuery(() => todoRepo.listToday(), []);
  const completed = useLiveQuery(() => todoRepo.countCompletedOn(todayKey()), []);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const title = draft.trim();
    if (!title || submitting) return;

    setSubmitting(true);
    try {
      await todoRepo.create({ title, dueDate: todayKey() });
      setDraft('');
    } catch (error) {
      toast(error instanceof Error ? error.message : '添加失败', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const visible = todos?.slice(0, VISIBLE_LIMIT) ?? [];
  const hiddenCount = (todos?.length ?? 0) - visible.length;
  const doneCount = completed ?? 0;

  return (
    <Panel
      title="今日待办"
      icon={<ListChecks />}
      badge={todos === undefined ? undefined : `${doneCount}/${doneCount + todos.length}`}
      action={
        <Link
          to="/todos"
          className="btn btn-ghost h-7 px-2 text-xs"
          aria-label="打开待办列表"
          title="打开待办列表"
        >
          <ArrowRight className="size-3.5" />
        </Link>
      }
      padded={false}
      bodyClassName="flex flex-col"
      footer={
        hiddenCount > 0 ? (
          <Link to="/todos" className="text-primary-text hover:underline">
            还有 {hiddenCount} 项未显示
          </Link>
        ) : (
          <span>今日已完成 {doneCount} 项</span>
        )
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {todos === undefined ? (
          <div className="px-2 py-1">
            <SkeletonLines lines={4} />
          </div>
        ) : visible.length === 0 ? (
          <Empty
            icon={<ListChecks />}
            title="今天还没有任务"
            hint="在下面输入框回车即可添加，默认排在今天。"
          />
        ) : (
          <ul className="space-y-px">
            {visible.map((todo) => (
              <TodoRow key={todo.id} todo={todo} />
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="shrink-0 border-t border-line p-2">
        <div className="flex items-center gap-2 rounded-[10px] px-1.5 transition-colors focus-within:bg-surface-2">
          <Plus className="size-3.5 shrink-0 text-ink-subtle" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="添加任务，回车确认…"
            className="h-8 min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none placeholder:text-ink-subtle"
          />
          {draft.trim() ? (
            <IconButton label="添加" type="submit" className="size-7" disabled={submitting}>
              <ArrowRight className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}

function TodoRow({ todo }: { todo: Todo }) {
  const overdue = isOverdue(todo.dueDate);

  return (
    <li className="group flex items-start gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-surface-2">
      <Checkbox
        checked={todo.done}
        onChange={() => void todoRepo.toggle(todo.id)}
        label={todo.title}
        className="mt-[3px]"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] leading-snug text-ink">{todo.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[0.6875rem]">
          {todo.priority > 0 ? (
            <span className="flex items-center gap-1 text-ink-subtle">
              <span className={cn('size-1.5 rounded-full', PRIORITY_DOT[todo.priority])} />
              P{todo.priority}
            </span>
          ) : null}
          {todo.dueDate ? (
            <span className={cn(overdue ? 'font-medium text-danger' : 'text-ink-subtle')}>
              {overdue ? '已逾期 · ' : ''}
              {humanDate(todo.dueDate)}
            </span>
          ) : (
            <span className="text-ink-subtle">未排期</span>
          )}
        </div>
      </div>
    </li>
  );
}
