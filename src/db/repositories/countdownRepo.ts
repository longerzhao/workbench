import { db, metaGet, metaSet, nowISO } from '..';
import type { Countdown, CounterMode } from '../schema';
import { newId } from '@/lib/id';
import type { DateKey } from '@/lib/date';

const HIDDEN_KEY = 'countdown.hiddenHolidays';

export interface NewCountdownInput {
  title: string;
  mode: CounterMode;
  date: DateKey;
  color?: string;
  icon?: string;
}

export const countdownRepo = {
  async listAll(): Promise<Countdown[]> {
    const rows = await db.countdowns.toArray();
    return rows.sort((a, b) => a.order - b.order || b.createdAt.localeCompare(a.createdAt));
  },

  async create(input: NewCountdownInput): Promise<Countdown> {
    const all = await db.countdowns.toArray();
    const maxOrder = all.reduce((max, row) => Math.max(max, row.order), -1);
    const ts = nowISO();
    const row: Countdown = {
      id: newId('cd'),
      title: input.title.trim() || (input.mode === 'down' ? '未命名倒计时' : '未命名正计时'),
      mode: input.mode,
      date: input.date,
      color: input.color ?? '#7c3aed',
      icon: input.icon ?? 'Hourglass',
      order: maxOrder + 1,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.countdowns.add(row);
    return row;
  },

  async update(
    id: string,
    patch: Partial<Pick<Countdown, 'title' | 'mode' | 'date' | 'color' | 'icon'>>,
  ): Promise<void> {
    const next = { ...patch, updatedAt: nowISO() };
    if (next.title) next.title = next.title.trim();
    await db.countdowns.update(id, next);
  },

  async remove(id: string): Promise<void> {
    await db.countdowns.delete(id);
  },

  async hiddenHolidayIds(): Promise<string[]> {
    const raw = await metaGet(HIDDEN_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  },

  async setHolidayHidden(id: string, hidden: boolean): Promise<void> {
    const current = new Set(await this.hiddenHolidayIds());
    if (hidden) current.add(id);
    else current.delete(id);
    await metaSet(HIDDEN_KEY, JSON.stringify([...current]));
  },
};
