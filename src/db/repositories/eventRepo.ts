import { db, moveToTrash, nowISO } from '..';
import type { CalendarEvent, EventRepeat } from '../schema';
import { newId } from '@/lib/id';
import { todayKey, type DateKey } from '@/lib/date';
import { expandEvents, type EventOccurrence } from '@/lib/eventOccurrence';

export interface NewEventInput {
  title: string;
  date: DateKey;
  /** 跨天/重复截止日（含当天），单日省略 */
  endDate?: DateKey;
  start: string;
  end: string;
  allDay?: boolean;
  repeat?: EventRepeat;
  color?: string;
  note?: string;
}

function byStart(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.start.localeCompare(b.start);
}

/**
 * 事件表是个人规模的小表，重复/跨天发生在 JS 里展开：
 * 一次性读全表比按天索引查询再拼重复规则更简单，也更好测。
 */
async function occurrencesBetween(from: DateKey, to: DateKey): Promise<EventOccurrence[]> {
  const rows = await db.events.toArray();
  return expandEvents(rows, from, to);
}

export const eventRepo = {
  /** 某天的发生列表（含跨天进行中、重复事件在本天的发生） */
  async listByDate(date: DateKey = todayKey()): Promise<EventOccurrence[]> {
    return occurrencesBetween(date, date);
  },

  async listToday(): Promise<EventOccurrence[]> {
    return eventRepo.listByDate(todayKey());
  },

  async listBetween(from: DateKey, to: DateKey): Promise<EventOccurrence[]> {
    return occurrencesBetween(from, to);
  },

  /** 原始事件行，供备份/编辑等场景 */
  async listAll(): Promise<CalendarEvent[]> {
    const rows = await db.events.toArray();
    return rows.sort((a, b) => a.date.localeCompare(b.date) || byStart(a, b));
  },

  async create(input: NewEventInput): Promise<CalendarEvent> {
    const event: CalendarEvent = {
      id: newId('event'),
      title: input.title.trim(),
      date: input.date,
      endDate: input.endDate && input.endDate > input.date ? input.endDate : undefined,
      start: input.start,
      end: input.end,
      allDay: input.allDay ?? false,
      repeat: input.repeat ?? 'none',
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
    // Dexie 的 update 会忽略 undefined；清除 endDate 必须用 modify
    const clearEnd = 'endDate' in patch && patch.endDate === undefined;
    if (clearEnd) {
      await db.events
        .where('id')
        .equals(id)
        .modify((row) => {
          Object.assign(row, patch);
          delete row.endDate;
        });
      return;
    }
    await db.events.update(id, patch);
  },

  async remove(id: string): Promise<void> {
    const event = await db.events.get(id);
    if (!event) return;
    await moveToTrash('events', id, event.title);
  },
};
