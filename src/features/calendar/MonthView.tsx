import type { CalendarEvent } from '@/db/schema';
import { buildMonthCells } from '@/lib/calendarGrid';
import { compareOccurrences, type EventOccurrence } from '@/lib/eventOccurrence';
import { dayjs, todayKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_VISIBLE = 2;

export interface MonthViewProps {
  anchor: DateKey;
  occurrences: EventOccurrence[];
  onSelectDay: (date: DateKey) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function MonthView({ anchor, occurrences, onSelectDay, onSelectEvent }: MonthViewProps) {
  const year = dayjs(anchor).year();
  const month = dayjs(anchor).month();
  const weeks = buildMonthCells(year, month);
  const today = todayKey();

  const byDate = new Map<string, EventOccurrence[]>();
  for (const occ of occurrences) {
    const list = byDate.get(occ.date) ?? [];
    list.push(occ);
    byDate.set(occ.date, list);
  }
  for (const list of byDate.values()) list.sort(compareOccurrences);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-3 md:p-4">
      {/* 星期表头与下方 7 列对齐 */}
      <div className="grid shrink-0 grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[0.75rem] font-medium text-ink-subtle"
          >
            {d}
          </div>
        ))}
      </div>

      {/* 按周分行：每行 7 格，行高均分剩余空间 */}
      <div className="flex min-h-0 flex-1 flex-col gap-px overflow-hidden rounded-[12px] border border-line bg-line">
        {weeks.map((week) => (
          <div key={week[0]?.date} className="grid min-h-0 flex-1 grid-cols-7 gap-px">
            {week.map((cell) => {
              const dayOccurrences = byDate.get(cell.date) ?? [];
              const visible = dayOccurrences.slice(0, MAX_VISIBLE);
              const more = dayOccurrences.length - visible.length;
              const isToday = cell.date === today;

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => onSelectDay(cell.date)}
                  className={cn(
                    'flex min-h-0 flex-col gap-1 overflow-hidden bg-surface p-1.5 text-left transition-colors hover:bg-surface-2 sm:p-2',
                    !cell.inMonth && 'bg-surface-2/70 text-ink-subtle',
                    isToday && cell.inMonth && 'bg-primary-soft/40',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[0.8125rem] tabular-nums',
                      cell.inMonth ? 'text-ink' : 'text-ink-subtle',
                      isToday && 'bg-primary font-semibold text-white',
                    )}
                  >
                    {dayjs(cell.date).date()}
                  </span>

                  <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                    {visible.map((occ) => {
                      const ev = occ.event;
                      return (
                        <span
                          key={`${ev.id}:${occ.date}`}
                          role="link"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              e.stopPropagation();
                              onSelectEvent(ev);
                            }
                          }}
                          className="block truncate rounded-[5px] px-1 py-0.5 text-[0.625rem] leading-tight text-white"
                          style={{ backgroundColor: ev.color }}
                          title={ev.allDay ? ev.title : `${ev.start} ${ev.title}`}
                        >
                          {ev.allDay ? ev.title : `${ev.start} ${ev.title}`}
                        </span>
                      );
                    })}
                    {more > 0 ? (
                      <span className="block px-1 text-[0.625rem] text-ink-subtle">
                        另有 {more} 项
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
