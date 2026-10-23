import { createElement, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Pencil, Plus, Repeat, Trash } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Countdown, CountdownRepeat, CounterMode } from '@/db/schema';
import { countdownRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button, IconButton } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Modal } from '@/components/ui/Modal';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useNow } from '@/hooks/useNow';
import {
  HOLIDAYS,
  REPEAT_LABELS,
  counterDuration,
  nextRepeatDate,
  nextHolidayDate,
  type DurationParts,
  type HolidayId,
} from '@/lib/countdown';
import {
  COUNTDOWN_ICON_NAMES,
  DEFAULT_COUNTDOWN_ICON,
  countdownIcon,
} from '@/lib/countdownIcons';
import { todayKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#0d9488', '#db2777', '#dc2626'];

interface DisplayItem {
  key: string;
  title: string;
  mode: CounterMode;
  /** 展示用发生日：周期倒计时是下一次发生日，其余是原日期 */
  date: DateKey;
  /** 存储的锚点日期，供编辑回填 */
  anchorDate: DateKey;
  repeat: Countdown['repeat'];
  color: string;
  icon?: string;
  holidayId?: HolidayId;
  record?: Countdown;
}

export function CountdownPage() {
  const now = useNow();
  const custom = useLiveQuery(() => countdownRepo.listAll(), []);
  const hidden = useLiveQuery(() => countdownRepo.hiddenHolidayIds(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Countdown | null>(null);

  const today = todayKey();
  const hiddenSet = useMemo(() => new Set(hidden ?? []), [hidden]);

  const holidays = useMemo<DisplayItem[]>(() => {
    return HOLIDAYS.map((item) => ({
      key: item.id,
      title: item.title,
      mode: 'down' as const,
      date: nextHolidayDate(item.id, today),
      anchorDate: nextHolidayDate(item.id, today),
      repeat: 'none' as const,
      color: item.color,
      icon: item.icon,
      holidayId: item.id,
    }));
  }, [today]);

  const customs = useMemo<DisplayItem[]>(
    () =>
      (custom ?? []).map((row) => {
        const repeat = row.repeat ?? 'none';
        return {
          key: row.id,
          title: row.title,
          mode: row.mode,
          // 周期倒计时滚到下一次发生日；其余用原日期
          date: row.mode === 'down' && repeat !== 'none' ? nextRepeatDate(repeat, row.date, today) : row.date,
          anchorDate: row.date,
          repeat,
          color: row.color,
          icon: row.icon ?? DEFAULT_COUNTDOWN_ICON,
          record: row,
        };
      }),
    [custom, today],
  );

  const visibleHolidays = useMemo(
    () => sortItems(holidays.filter((item) => !hiddenSet.has(item.holidayId!)), now),
    [holidays, hiddenSet, now],
  );
  const hiddenHolidays = useMemo(
    () => sortItems(holidays.filter((item) => hiddenSet.has(item.holidayId!)), now),
    [holidays, hiddenSet, now],
  );
  const countdowns = useMemo(
    () => sortItems(customs.filter((item) => item.mode === 'down'), now),
    [customs, now],
  );
  const countups = useMemo(
    () => sortItems(customs.filter((item) => item.mode === 'up'), now),
    [customs, now],
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h1 className="min-w-0 flex-1 text-base font-semibold text-ink">计时</h1>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          新建
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {custom === undefined || hidden === undefined ? (
          <SkeletonLines lines={6} />
        ) : (
          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            <section className="space-y-2">
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-ink-subtle">
                法定假期
              </h2>
              {visibleHolidays.length === 0 ? (
                <p className="text-[0.8125rem] text-ink-muted">假期都已隐藏，可在下方恢复。</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleHolidays.map((item) => (
                    <CounterCard
                      key={item.key}
                      item={item}
                      now={now}
                      onToggleHidden={() => void setHolidayHidden(item.holidayId!, true)}
                    />
                  ))}
                </div>
              )}
            </section>

            <CustomSection
              title="倒计时"
              items={countdowns}
              now={now}
              empty="还没有倒计时"
              onCreate={openCreate}
              onEdit={(record) => {
                setEditing(record);
                setFormOpen(true);
              }}
            />
            <CustomSection
              title="正计时"
              items={countups}
              now={now}
              empty="还没有正计时"
              onCreate={openCreate}
              onEdit={(record) => {
                setEditing(record);
                setFormOpen(true);
              }}
            />

            {hiddenHolidays.length > 0 ? (
              <details className="rounded-[12px] border border-line bg-surface px-3 py-2">
                <summary className="cursor-pointer text-[0.8125rem] text-ink-muted">
                  已隐藏 {hiddenHolidays.length} 个假期
                </summary>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {hiddenHolidays.map((item) => (
                    <li
                      key={item.key}
                      className="flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-[0.8125rem] text-ink"
                    >
                      {item.title}
                      <button
                        type="button"
                        className="text-primary-text"
                        onClick={() => void setHolidayHidden(item.holidayId!, false)}
                      >
                        恢复
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        )}
      </div>

      <CounterForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function sortItems(items: DisplayItem[], now: Date): DisplayItem[] {
  return [...items].sort((a, b) => {
    if (a.mode !== b.mode) return a.mode === 'down' ? -1 : 1;
    const ad = counterDuration(a.mode, a.date, now);
    const bd = counterDuration(b.mode, b.date, now);
    if (a.mode === 'down' && ad.past !== bd.past) return ad.past ? 1 : -1;
    const aMs = ad.days * 86400 + ad.hours * 3600 + ad.minutes * 60 + ad.seconds;
    const bMs = bd.days * 86400 + bd.hours * 3600 + bd.minutes * 60 + bd.seconds;
    return a.mode === 'down' ? aMs - bMs : bMs - aMs;
  });
}

async function setHolidayHidden(id: HolidayId, hidden: boolean) {
  try {
    await countdownRepo.setHolidayHidden(id, hidden);
    toast(hidden ? '已隐藏' : '已恢复', 'success', 2);
  } catch (error) {
    toast(error instanceof Error ? error.message : '操作失败', 'danger');
  }
}

async function removeCounter(record: Countdown | undefined) {
  if (!record) return;
  if (!window.confirm(`删除「${record.title}」？`)) return;
  try {
    await countdownRepo.remove(record.id);
    toast('已删除', 'success', 2);
  } catch (error) {
    toast(error instanceof Error ? error.message : '删除失败', 'danger');
  }
}

function CustomSection({
  title,
  items,
  now,
  empty,
  onCreate,
  onEdit,
}: {
  title: string;
  items: DisplayItem[];
  now: Date;
  empty: string;
  onCreate: () => void;
  onEdit: (record: Countdown) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-ink-subtle">{title}</h2>
      {items.length === 0 ? (
        <div className="flex items-center justify-between rounded-[12px] border border-dashed border-line px-3 py-3">
          <p className="text-[0.8125rem] text-ink-muted">{empty}</p>
          <Button variant="outline" size="sm" onClick={onCreate}>
            <Plus className="size-3.5" />
            新建
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <CounterCard
              key={item.key}
              item={item}
              now={now}
              onEdit={() => item.record && onEdit(item.record)}
              onRemove={() => void removeCounter(item.record)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CounterCard({
  item,
  now,
  onToggleHidden,
  onEdit,
  onRemove,
}: {
  item: DisplayItem;
  now: Date;
  onToggleHidden?: () => void;
  onEdit?: () => void;
  onRemove?: () => void;
}) {
  const parts = counterDuration(item.mode, item.date, now);
  const actionable = Boolean(onEdit || onRemove);
  const [actionsOpen, setActionsOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  useClickOutside(cardRef, () => setActionsOpen(false), actionable && actionsOpen);
  const caption =
    item.mode === 'down'
      ? parts.past
        ? '已过去'
        : '还有'
      : '已经';

  const toggleActions = () => {
    if (actionable) setActionsOpen((open) => !open);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!actionable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleActions();
    }
    if (event.key === 'Escape') setActionsOpen(false);
  };

  return (
    <article
      ref={cardRef}
      tabIndex={actionable ? 0 : undefined}
      aria-expanded={actionable ? actionsOpen : undefined}
      onClick={toggleActions}
      onKeyDown={onKeyDown}
      className={cn(
        'rounded-[12px] border border-line bg-surface p-3 shadow-[var(--shadow-card)]',
        actionable && 'cursor-pointer',
        actionsOpen && 'ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-start gap-2">
        {item.icon ? (
          createElement(countdownIcon(item.icon), {
            className: 'mt-0.5 size-4 shrink-0',
            style: { color: item.color },
            'aria-hidden': true,
          })
        ) : (
          <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.875rem] font-semibold text-ink">{item.title}</h3>
          <p className="flex items-center gap-1 text-[0.75rem] text-ink-subtle">
            {item.mode === 'down' ? '目标' : '始于'} {item.date}
            {item.mode === 'down' && item.repeat && item.repeat !== 'none' ? (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-1.5 text-[0.625rem] font-medium text-primary-text"
                title={`${REPEAT_LABELS[item.repeat]}重复 · 锚点 ${item.anchorDate}`}
              >
                <Repeat className="size-2.5" />
                {REPEAT_LABELS[item.repeat]}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex h-7 shrink-0 items-center">
          {onToggleHidden ? (
            <button
              type="button"
              className="rounded-[8px] px-1.5 text-[0.75rem] text-ink-subtle hover:bg-surface-2 hover:text-ink"
              onClick={onToggleHidden}
            >
              隐藏
            </button>
          ) : null}
          {actionsOpen && onEdit ? (
            <IconButton
              label="编辑"
              className="size-7"
              onClick={(event) => {
                event.stopPropagation();
                setActionsOpen(false);
                onEdit();
              }}
            >
              <Pencil className="size-3.5" />
            </IconButton>
          ) : null}
          {actionsOpen && onRemove ? (
            <IconButton
              label="删除"
              className="size-7 text-danger"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash className="size-3.5" />
            </IconButton>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-[0.75rem] text-ink-muted">{caption}</p>
      <DurationReadout parts={parts} />
    </article>
  );
}

function DurationReadout({ parts }: { parts: DurationParts }) {
  const cells = [
    { value: parts.days, unit: '天' },
    { value: parts.hours, unit: '时' },
    { value: parts.minutes, unit: '分' },
    { value: parts.seconds, unit: '秒' },
  ];
  return (
    <div className="mt-1 grid grid-cols-4 gap-1.5">
      {cells.map((cell) => (
        <div key={cell.unit} className="rounded-[10px] bg-surface-2 px-1 py-2 text-center">
          <div className="text-lg font-semibold tabular-nums text-ink">{cell.value}</div>
          <div className="text-[0.625rem] text-ink-subtle">{cell.unit}</div>
        </div>
      ))}
    </div>
  );
}

function CounterForm({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: Countdown | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return <CounterFormInner key={editing?.id ?? 'new'} editing={editing} onClose={onClose} />;
}

function CounterFormInner({
  editing,
  onClose,
}: {
  editing: Countdown | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [mode, setMode] = useState<CounterMode>(editing?.mode ?? 'down');
  const [date, setDate] = useState<DateKey>(editing?.date ?? todayKey());
  const [repeat, setRepeat] = useState<CountdownRepeat>(editing?.repeat ?? 'none');
  const [color, setColor] = useState(editing?.color ?? COLORS[0]!);
  const [icon, setIcon] = useState(editing?.icon ?? DEFAULT_COUNTDOWN_ICON);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // 周期只对倒计时有效
      const nextRepeat: CountdownRepeat = mode === 'down' ? repeat : 'none';
      if (editing) {
        await countdownRepo.update(editing.id, { title, mode, date, repeat: nextRepeat, color, icon });
        toast('已更新', 'success', 2);
      } else {
        await countdownRepo.create({ title, mode, date, repeat: nextRepeat, color, icon });
        toast('已添加', 'success', 2);
      }
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? '编辑计时' : '新建计时'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void submit({ preventDefault() {} } as FormEvent)} disabled={busy || !title.trim()}>
            {editing ? '保存' : '添加'}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">标题</span>
          <input
            autoFocus
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={mode === 'down' ? '放假' : '上次放假'}
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">类型</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['down', '倒计时'],
                ['up', '正计时'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  'rounded-[10px] border px-3 py-2 text-[0.8125rem]',
                  mode === id
                    ? 'border-primary bg-primary-soft text-primary-text'
                    : 'border-line text-ink-muted hover:bg-surface-2',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">
            {mode === 'down' ? (repeat === 'none' ? '目标日期' : '首次日期（锚点）') : '开始日期'}
          </span>
          <DatePicker clearable={false} format="YYYY/MM/DD" value={date} onChange={(next) => next && setDate(next)} />
          {mode === 'down' && repeat !== 'none' ? (
            <p className="text-[0.6875rem] text-ink-subtle">
              到期后自动滚到下一次，此日期仅作锚点保持不变
            </p>
          ) : null}
        </div>
        {mode === 'down' ? (
          <div className="space-y-1.5">
            <span className="text-[0.8125rem] text-ink-muted">周期</span>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(REPEAT_LABELS) as CountdownRepeat[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRepeat(id)}
                  className={cn(
                    'rounded-[10px] border px-2 py-2 text-[0.8125rem]',
                    repeat === id
                      ? 'border-primary bg-primary-soft text-primary-text'
                      : 'border-line text-ink-muted hover:bg-surface-2',
                  )}
                >
                  {REPEAT_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">图标</span>
          <div className="flex flex-wrap gap-1.5">
            {COUNTDOWN_ICON_NAMES.map((name) => {
              const Icon = countdownIcon(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={icon === name}
                  onClick={() => setIcon(name)}
                  className={cn(
                    'grid size-8 place-items-center rounded-[8px] border transition-colors',
                    icon === name
                      ? 'border-primary bg-primary-soft text-primary-text'
                      : 'border-line text-ink-muted hover:bg-surface-2',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">颜色</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={item}
                onClick={() => setColor(item)}
                className={cn(
                  'size-7 rounded-full ring-2 ring-offset-2 ring-offset-surface',
                  color === item ? 'ring-primary' : 'ring-transparent',
                )}
                style={{ backgroundColor: item }}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
