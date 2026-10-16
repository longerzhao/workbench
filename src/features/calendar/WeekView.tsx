import type { CalendarEvent } from '@/db/schema';
import {
  WEEK_HOURS,
  WEEK_HOUR_END,
  WEEK_HOUR_START,
  eventBlockStyle,
  weekDates,
} from '@/lib/calendarGrid';
import { dayjs, todayKey, weekdayShort, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';

const HOUR_PX = 48;

export interface WeekViewProps {
  anchor: DateKey;
  events: CalendarEvent[];
  onSelectSlot: (date: DateKey, start: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export function WeekView({ anchor, events, onSelectSlot, onSelectEvent }: WeekViewProps) {
  const days = weekDates(anchor);
  const today = todayKey();
  const bandHeight = (WEEK_HOUR_END - WEEK_HOUR_START) * HOUR_PX;

  const byDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const list = byDate.get(ev.date) ?? [];
    list.push(ev);
    byDate.set(ev.date, list);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto p-3">
      {/* 全天 */}
      <div className="mb-2 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1 border-b border-line pb-2">
        <span className="text-[0.625rem] text-ink-subtle">全天</span>
        {days.map((date) => {
          const allDay = (byDate.get(date) ?? []).filter((e) => e.allDay);
          return (
            <div key={date} className="min-h-[1.5rem] space-y-0.5">
              {allDay.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onSelectEvent(ev)}
                  className="block w-full truncate rounded px-1 py-0.5 text-left text-[0.625rem] text-white"
                  style={{ backgroundColor: ev.color }}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* 表头 */}
      <div className="sticky top-0 z-10 mb-1 grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1 bg-surface pb-1">
        <span />
        {days.map((date) => (
          <div
            key={date}
            className={cn(
              'text-center text-[0.75rem]',
              date === today ? 'font-semibold text-primary-text' : 'text-ink-muted',
            )}
          >
            <div>{weekdayShort(date)}</div>
            <div className="text-[0.6875rem] text-ink-subtle">{dayjs(date).date()}</div>
          </div>
        ))}
      </div>

      <div
        className="grid grid-cols-[3rem_repeat(7,minmax(0,1fr))] gap-1"
        style={{ minHeight: bandHeight }}
      >
        <div className="relative" style={{ height: bandHeight }}>
          {WEEK_HOURS.map((h) => (
            <div
              key={h}
              className="absolute right-1 text-[0.625rem] text-ink-subtle"
              style={{ top: (h - WEEK_HOUR_START) * HOUR_PX }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {days.map((date) => {
          const timed = (byDate.get(date) ?? []).filter((e) => !e.allDay);
          return (
            <div
              key={date}
              className="relative rounded-[8px] border border-line bg-surface-2/40"
              style={{ height: bandHeight }}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const minutes =
                  WEEK_HOUR_START * 60 + Math.floor(y / HOUR_PX) * 60;
                const hh = Math.floor(minutes / 60);
                const start = `${String(hh).padStart(2, '0')}:00`;
                onSelectSlot(date, start);
              }}
            >
              {WEEK_HOURS.map((h) => (
                <div
                  key={h}
                  className="pointer-events-none absolute inset-x-0 border-t border-line/60"
                  style={{ top: (h - WEEK_HOUR_START) * HOUR_PX }}
                />
              ))}
              {timed.map((ev, index) => {
                const style = eventBlockStyle(ev.start, ev.end);
                if (!style) return null;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className="absolute overflow-hidden rounded-[6px] px-1 py-0.5 text-left text-[0.625rem] leading-tight text-white shadow-sm"
                    style={{
                      ...style,
                      left: 2 + index * 4,
                      right: 2,
                      backgroundColor: ev.color,
                      zIndex: 1 + index,
                    }}
                    title={`${ev.start}–${ev.end} ${ev.title}`}
                  >
                    <span className="font-medium">{ev.title}</span>
                    <span className="block opacity-80">{ev.start}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
