import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { eventRepo } from '@/db/repositories';
import { dayjs, todayKey, type DateKey } from '@/lib/date';
import {
  parseCalendarView,
  parseDateParam,
  type CalendarView,
  weekDates,
} from '@/lib/calendarGrid';

export function useCalendarSearch(): {
  view: CalendarView;
  date: DateKey;
  setView: (view: CalendarView) => void;
  setDate: (date: DateKey) => void;
  setParams: (next: { view?: CalendarView; date?: DateKey }) => void;
} {
  const [search, setSearch] = useSearchParams();

  const view = parseCalendarView(search.get('view'));
  const date = parseDateParam(search.get('date'), todayKey());

  const setParams = (next: { view?: CalendarView; date?: DateKey }) => {
    const params = new URLSearchParams(search);
    const nextView = next.view ?? view;
    const nextDate = next.date ?? date;
    params.set('view', nextView);
    params.set('date', nextDate);
    setSearch(params, { replace: true });
  };

  return {
    view,
    date,
    setView: (v) => setParams({ view: v }),
    setDate: (d) => setParams({ date: d }),
    setParams,
  };
}

export function useCalendarEvents(view: CalendarView, date: DateKey) {
  const range = useMemo(() => {
    if (view === 'week') {
      const days = weekDates(date);
      return { from: days[0]!, to: days[6]! };
    }
    if (view === 'year') {
      const y = dayjs(date).year();
      return {
        from: `${y}-01-01` as DateKey,
        to: `${y}-12-31` as DateKey,
      };
    }
    const start = dayjs(date).startOf('month').startOf('isoWeek');
    const end = dayjs(date).endOf('month').endOf('isoWeek');
    return {
      from: start.format('YYYY-MM-DD') as DateKey,
      to: end.format('YYYY-MM-DD') as DateKey,
    };
  }, [view, date]);

  const events = useLiveQuery(
    () => eventRepo.listBetween(range.from, range.to),
    [range.from, range.to],
  );

  return { events, range };
}
