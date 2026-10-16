import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { buildMonthCells } from '@/lib/calendarGrid';
import { dayjs, todayKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export interface DatePickerProps {
  value?: DateKey;
  onChange: (next: DateKey | undefined) => void;
  placeholder?: string;
  className?: string;
  /** 触发器额外 class */
  triggerClassName?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = '未设置',
  className,
  triggerClassName,
}: DatePickerProps) {
  const initial = value ? dayjs(value) : dayjs();
  const [cursor, setCursor] = useState(() => ({
    year: initial.year(),
    month: initial.month(),
  }));

  const weeks = useMemo(
    () => buildMonthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
  const today = todayKey();

  const label = value ? dayjs(value).format('M月D日') : placeholder;

  return (
    <Dropdown
      align="start"
      className={cn('w-[17.5rem] p-2', className)}
      trigger={
        <button
          type="button"
          className={cn(
            'flex h-8 w-full items-center justify-between gap-2 rounded-[10px] border border-line bg-surface px-2.5 text-left text-[0.8125rem] text-ink transition-colors hover:border-line-strong hover:bg-surface-2',
            !value && 'text-ink-subtle',
            triggerClassName,
          )}
        >
          <span className="truncate">{label}</span>
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink-subtle" aria-hidden>
            <path
              fill="currentColor"
              d="M4 2.5h1V1h1v1.5h4V1h1v1.5h1.5A1.5 1.5 0 0 1 14 4v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13V4A1.5 1.5 0 0 1 3.5 2.5H4Zm8.5 4h-9V13h9V6.5Zm0-1.5V4h-1.5v1h-1V4h-4v1h-1V4H3.5v1h9Z"
            />
          </svg>
        </button>
      }
    >
      {(close) => (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1 px-0.5">
            <button
              type="button"
              aria-label="上个月"
              className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-surface-2"
              onClick={() =>
                setCursor((c) => {
                  const d = dayjs(new Date(c.year, c.month, 1)).subtract(1, 'month');
                  return { year: d.year(), month: d.month() };
                })
              }
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-0 flex-1 text-center text-[0.8125rem] font-medium text-ink">
              {cursor.year}年{cursor.month + 1}月
            </p>
            <button
              type="button"
              aria-label="下个月"
              className="grid size-7 place-items-center rounded-lg text-ink-muted hover:bg-surface-2"
              onClick={() =>
                setCursor((c) => {
                  const d = dayjs(new Date(c.year, c.month, 1)).add(1, 'month');
                  return { year: d.year(), month: d.month() };
                })
              }
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((d) => (
              <span
                key={d}
                className="py-1 text-center text-[0.625rem] font-medium text-ink-subtle"
              >
                {d}
              </span>
            ))}
            {weeks.flat().map((cell) => {
              const selected = cell.date === value;
              const isToday = cell.date === today;
              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => {
                    onChange(cell.date);
                    close();
                  }}
                  className={cn(
                    'grid aspect-square place-items-center rounded-lg text-[0.75rem] tabular-nums transition-colors',
                    !cell.inMonth && 'text-ink-subtle/70',
                    cell.inMonth && !selected && 'text-ink hover:bg-surface-2',
                    isToday && !selected && 'ring-1 ring-primary/40 ring-inset',
                    selected && 'bg-primary font-semibold text-white hover:bg-primary',
                  )}
                >
                  {dayjs(cell.date).date()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[0.75rem] text-ink-muted hover:bg-surface-2 hover:text-ink"
              onClick={() => {
                onChange(undefined);
                close();
              }}
            >
              清除
            </button>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[0.75rem] font-medium text-primary-text hover:bg-primary-soft"
              onClick={() => {
                const t = todayKey();
                onChange(t);
                setCursor({ year: dayjs(t).year(), month: dayjs(t).month() });
                close();
              }}
            >
              今天
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}
