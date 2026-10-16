import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { CalendarEvent } from '@/db/schema';
import { Button, IconButton } from '@/components/ui/Button';
import { SkeletonLines } from '@/components/ui/Skeleton';
import { shiftAnchor, viewTitle, type CalendarView } from '@/lib/calendarGrid';
import { todayKey, type DateKey } from '@/lib/date';
import { cn } from '@/lib/cn';
import { EventForm } from './EventForm';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { YearView } from './YearView';
import { useCalendarEvents, useCalendarSearch } from './useCalendarQuery';

const VIEW_TABS: { id: CalendarView; label: string }[] = [
  { id: 'year', label: '年' },
  { id: 'month', label: '月' },
  { id: 'week', label: '周' },
];

export function CalendarPage() {
  const { view, date, setParams } = useCalendarSearch();
  const { events } = useCalendarEvents(view, date);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [formDate, setFormDate] = useState<DateKey>(date);
  const [formStart, setFormStart] = useState<string | undefined>();

  const openCreate = (d: DateKey, start?: string) => {
    setEditing(null);
    setFormDate(d);
    setFormStart(start);
    setFormOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditing(event);
    setFormDate(event.date);
    setFormStart(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-1">
          <IconButton
            label="上一段"
            className="size-8"
            onClick={() => setParams({ date: shiftAnchor(date, view, -1) })}
          >
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton
            label="下一段"
            className="size-8"
            onClick={() => setParams({ date: shiftAnchor(date, view, 1) })}
          >
            <ChevronRight className="size-4" />
          </IconButton>
        </div>

        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
          {viewTitle(view, date)}
        </h1>

        <div className="flex items-center gap-1 rounded-[10px] border border-line p-0.5">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setParams({ view: tab.id })}
              className={cn(
                'rounded-[8px] px-2.5 py-1 text-[0.75rem]',
                view === tab.id
                  ? 'bg-primary-soft text-primary-text'
                  : 'text-ink-muted hover:bg-surface-2',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => setParams({ date: todayKey() })}>
          今天
        </Button>
        <Button variant="primary" size="sm" onClick={() => openCreate(date)}>
          <Plus className="size-3.5" />
          新建
        </Button>
      </header>

      {events === undefined ? (
        <div className="p-4">
          <SkeletonLines lines={8} />
        </div>
      ) : view === 'year' ? (
        <YearView
          anchor={date}
          events={events}
          onSelectMonth={(d) => setParams({ view: 'month', date: d })}
          onSelectDay={(d) => openCreate(d)}
        />
      ) : view === 'month' ? (
        <MonthView
          anchor={date}
          events={events}
          onSelectDay={(d) => openCreate(d)}
          onSelectEvent={openEdit}
        />
      ) : (
        <WeekView
          anchor={date}
          events={events}
          onSelectSlot={(d, start) => openCreate(d, start)}
          onSelectEvent={openEdit}
        />
      )}

      <EventForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        defaultDate={formDate}
        defaultStart={formStart}
        editing={editing}
      />
    </div>
  );
}
