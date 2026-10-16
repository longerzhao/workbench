import { useMemo } from 'react';
import type { CalendarEvent } from '@/db/schema';
import { buildMonthCells } from '@/lib/calendarGrid';
import { dayjs, todayKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { zodiacLabelForYear, zodiacSrcForYear } from '@/lib/zodiac';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export interface YearViewProps {
  anchor: DateKey;
  events: CalendarEvent[];
  onSelectMonth: (date: DateKey) => void;
  onSelectDay: (date: DateKey) => void;
}

export function YearView({ anchor, events, onSelectMonth, onSelectDay }: YearViewProps) {
  const year = dayjs(anchor).year();
  const today = todayKey();
  const zodiacSrc = zodiacSrcForYear(year);
  const zodiacLabel = zodiacLabelForYear(year);

  const eventDays = useMemo(() => {
    const set = new Set<string>();
    for (const ev of events) set.add(ev.date);
    return set;
  }, [events]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden p-2 md:p-3">
      <div
        aria-hidden
        title={`${year} · ${zodiacLabel}`}
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        <img
          src={zodiacSrc}
          alt=""
          className="max-h-[85%] max-w-[min(88%,34rem)] object-contain opacity-[0.42] dark:opacity-[0.55]"
          draggable={false}
        />
      </div>

      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-6xl grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:gap-2.5 xl:grid-cols-4 xl:grid-rows-3 xl:overflow-hidden">
        {Array.from({ length: 12 }, (_, month) => {
          const weeks = buildMonthCells(year, month);
          const monthAnchor = `${year}-${String(month + 1).padStart(2, '0')}-01` as DateKey;
          const rowCount = weeks.length;

          return (
            <section
              key={month}
              className="flex min-h-0 flex-col rounded-[10px] border border-line bg-surface/55 p-1.5 shadow-[var(--shadow-card)] transition-colors hover:border-line-strong hover:bg-surface/75 xl:overflow-hidden"
            >
              <button
                type="button"
                onClick={() => onSelectMonth(monthAnchor)}
                className="mb-0.5 w-full shrink-0 rounded-md px-1 py-0.5 text-left text-[0.75rem] font-semibold text-ink hover:bg-surface-2"
              >
                {month + 1}月
              </button>

              <div
                className="grid min-h-0 flex-1 grid-cols-7 gap-px"
                style={{ gridTemplateRows: `auto repeat(${rowCount}, minmax(0, 1fr))` }}
              >
                {WEEKDAYS.map((d) => (
                  <span
                    key={d}
                    className="py-px text-center text-[0.5rem] leading-none text-ink-subtle"
                  >
                    {d}
                  </span>
                ))}
                {weeks.flat().map((cell) => {
                  const inMonth = cell.inMonth;
                  const isToday = cell.date === today;
                  const hasEvent = inMonth && eventDays.has(cell.date);

                  return (
                    <button
                      key={cell.date}
                      type="button"
                      disabled={!inMonth}
                      onClick={() => {
                        if (inMonth) onSelectDay(cell.date);
                      }}
                      className={cn(
                        'relative grid min-h-0 place-items-center rounded text-[0.5625rem] leading-none tabular-nums transition-colors',
                        !inMonth && 'text-transparent',
                        inMonth && 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                        isToday && inMonth && 'bg-primary font-semibold text-white hover:bg-primary',
                      )}
                      title={inMonth ? cell.date : undefined}
                    >
                      {inMonth ? dayjs(cell.date).date() : ''}
                      {hasEvent && !isToday ? (
                        <span className="absolute bottom-0 size-1 rounded-full bg-primary" />
                      ) : null}
                      {hasEvent && isToday ? (
                        <span className="absolute bottom-0 size-1 rounded-full bg-white/90" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
