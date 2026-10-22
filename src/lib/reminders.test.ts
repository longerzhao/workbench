import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '@/db/schema';

const notified: { title: string; body: string }[] = [];

// 提醒器直接 import 了 notify，用模块 mock 拦下真实调用
vi.mock('@/lib/notify', () => ({
  notify: (title: string, body: string) => {
    notified.push({ title, body });
  },
}));

const { clearTodoReminders, reminderCount, resetReminderState, syncTodoReminders } =
  await import('./reminders');

function makeTodo(id: string, remindAt: string, done = false): Todo {
  return {
    id,
    title: `任务 ${id}`,
    done,
    priority: 0,
    tags: [],
    subtasks: [],
    order: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    remindAt,
  };
}

beforeEach(() => {
  notified.length = 0;
  resetReminderState();
});

afterEach(() => {
  clearTodoReminders();
  vi.useRealTimers();
});

describe('syncTodoReminders', () => {
  it('未来的提醒会排上定时器', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T08:00:00.000Z');
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z')], now);
    expect(reminderCount()).toBe(1);
  });

  it('到点会触发一次提醒，不会重复', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T08:00:00.000Z');
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z')], now);

    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(notified).toHaveLength(1);

    // 同一指纹再次触发（列表未变而重排）不应重复弹
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z')], Date.now());
    expect(notified).toHaveLength(1);
  });

  it('错过的提醒会立即补发（页面重新打开时）', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T12:00:00.000Z');
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z')], now);
    expect(notified).toHaveLength(1);
    expect(reminderCount()).toBe(0);
  });

  it('改期会拆掉旧定时器重排', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T08:00:00.000Z');
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z')], now);

    syncTodoReminders([makeTodo('t1', '2026-03-10T15:00:00.000Z')], now);
    expect(reminderCount()).toBe(1);

    // 旧时刻不再触发
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(notified).toHaveLength(0);

    // 新时刻触发
    vi.advanceTimersByTime(6 * 60 * 60 * 1000);
    expect(notified).toHaveLength(1);
  });

  it('已完成的待办不排程', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T08:00:00.000Z');
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z', true)], now);
    expect(reminderCount()).toBe(0);
  });

  it('列表里不再有的任务会被清掉', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T08:00:00.000Z');
    syncTodoReminders([makeTodo('t1', '2026-03-10T09:00:00.000Z')], now);
    expect(reminderCount()).toBe(1);

    syncTodoReminders([], now);
    expect(reminderCount()).toBe(0);
  });

  it('超过 setTimeout 上限（约 24.8 天）的提醒仍会被排上', () => {
    vi.useFakeTimers();
    const now = Date.parse('2026-03-10T08:00:00.000Z');
    syncTodoReminders([makeTodo('far', '2026-12-31T09:00:00.000Z')], now);
    expect(reminderCount()).toBe(1);
  });
});