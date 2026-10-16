import { db, moveToTrash, nowISO } from '..';
import type { CalendarEvent } from '../schema';
import { newId } from '@/lib/id';
import { todayKey, type DateKey } from '@/lib/date';

export interface NewEventInput {
  title: string;
  date: DateKey;
  start: string;
  end: string;
  allDay?: boolean;
  color?: string;
  note?: string;
}

function byStart(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.start.localeCompare(b.start);
}

export const eventRepo = {
  async listByDate(date: DateKey = todayKey()): Promise<CalendarEvent[]> {
    const rows = await db.events.where('date').equals(date).toArray();
    return rows.sort(byStart);
  },

  async listToday(): Promise<CalendarEvent[]> {
    return eventRepo.listByDate(todayKey());
  },

  async listBetween(from: DateKey, to: DateKey): Promise<CalendarEvent[]> {
    const rows = await db.events.where('date').between(from, to, true, true).toArray();
    return rows.sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b));
  },

  async create(input: NewEventInput): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: newId('event'),
      title: input.title.trim(),
      date: input.date,
      start: input.start,
      end: input.end,
      allDay: input.allDay ?? false,
      color: input.color ?? '#7c3aed',
      note: input.note,
      createdAt: nowISO(),
    };
    await db.events.add(event);
    return event;
  },

  async update(
    id: string,
    patch: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await db.events.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    const event = await db.events.get(id);
    if (!event) return;
    await moveToTrash('events', id, event.title);
  },
};
