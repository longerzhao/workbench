import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Habit, Todo } from '@/db/schema';
import type { MessageInput } from './messageCenter';
import { BACKUP_STALE_DAYS, EVENT_UPCOMING_MINUTES, buildMessages } from './messageCenter';

const TODAY = '2026-10-22';
/** 本地时间 2026-10-22 09:00:00 */
const NOW = new Date(2026, 9, 22, 9, 0, 0).getTime();

function todo(partial: Partial<Todo> & { id: string }): Todo {
  return {
    title: '任务',
    done: false,
    priority: 0,
    tags: [],
    subtasks: [],
    order: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

function event(partial: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    title: '日程',
    date: TODAY,
    start: '10:00',
    end: '11:00',
    allDay: false,
    color: '#000',
    createdAt: '2026-10-01T00:00:00.000Z',
    repeat: 'none',
    ...partial,
  };
}

function habit(partial: Partial<Habit> & { id: string }): Habit {
  return {
    name: '习惯',
    icon: 'target',
    color: '#000',
    targetPerWeek: 7,
    archived: false,
    order: 1,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

function input(partial: Partial<MessageInput> = {}): MessageInput {
  return {
    todos: [],
    events: [],
    habits: [],
    habitDoneToday: new Set(),
    today: TODAY,
    nowMs: NOW,
    ...partial,
  };
}

const ids = (list: ReturnType<typeof buildMessages>) => list.map((m) => m.id);
const kinds = (list: ReturnType<typeof buildMessages>) => list.map((m) => m.kind);

describe('待办消息', () => {
  it('逾期待办产出逾期消息', () => {
    const list = buildMessages(input({ todos: [todo({ id: 'a', title: '写周报', dueDate: '2026-10-19' })] }));
    expect(kinds(list)).toContain('todo-overdue');
    expect(list.find((m) => m.kind === 'todo-overdue')?.detail).toContain('已逾期 3 天');
  });

  it('今天到期产出今天到期消息，不是逾期', () => {
    const list = buildMessages(input({ todos: [todo({ id: 'a', dueDate: TODAY })] }));
    expect(kinds(list)).toEqual(['todo-due-today']);
  });

  it('未来到期的待办不产出消息', () => {
    const list = buildMessages(input({ todos: [todo({ id: 'a', dueDate: '2026-10-30' })] }));
    expect(list).toHaveLength(0);
  });

  it('已完成的待办不产出任何消息', () => {
    const list = buildMessages(
      input({
        todos: [
          todo({ id: 'a', dueDate: '2026-10-19', done: true }),
          todo({ id: 'b', dueDate: TODAY, done: true }),
        ],
      }),
    );
    expect(list).toHaveLength(0);
  });

  it('逾期越久排得越靠前', () => {
    const list = buildMessages(
      input({
        todos: [
          todo({ id: 'recent', title: '逾期1天', dueDate: '2026-10-21' }),
          todo({ id: 'old', title: '逾期10天', dueDate: '2026-10-12' }),
        ],
      }),
    );
    expect(list[0]?.id).toBe('overdue:old');
  });

  it('提醒时刻已过且未完成 → 提醒未处理', () => {
    const remindAt = new Date(2026, 9, 22, 8, 0).toISOString();
    const list = buildMessages(input({ todos: [todo({ id: 'a', remindAt })] }));
    expect(kinds(list)).toContain('todo-reminder');
  });

  it('提醒时刻还没到 → 不产出', () => {
    const remindAt = new Date(2026, 9, 22, 18, 0).toISOString();
    const list = buildMessages(input({ todos: [todo({ id: 'a', remindAt })] }));
    expect(list).toHaveLength(0);
  });

  it('提醒已过但任务完成了 → 不产出', () => {
    const remindAt = new Date(2026, 9, 22, 8, 0).toISOString();
    const list = buildMessages(input({ todos: [todo({ id: 'a', remindAt, done: true })] }));
    expect(list).toHaveLength(0);
  });
});

describe('日程消息', () => {
  const occ = (ev: CalendarEvent, date = TODAY) => ({ date, event: ev });

  it('两小时内开始 → 产出即将开始消息', () => {
    // 09:00 现在，09:30 开始
    const list = buildMessages(input({ events: [occ(event({ id: 'e1', title: '站会', start: '09:30' }))] }));
    const msg = list.find((m) => m.kind === 'event-upcoming');
    expect(msg?.title).toBe('站会');
    expect(msg?.detail).toBe('30 分钟后 · 09:30');
  });

  it(`超过 ${EVENT_UPCOMING_MINUTES} 分钟不产出`, () => {
    // 09:00 现在，13:00 开始，差 4 小时
    const list = buildMessages(input({ events: [occ(event({ id: 'e1', start: '13:00' }))] }));
    expect(list).toHaveLength(0);
  });

  it('刚刚开始算"正在进行"', () => {
    const list = buildMessages(input({ events: [occ(event({ id: 'e1', start: '09:00' }))] }));
    expect(list.find((m) => m.kind === 'event-upcoming')?.detail).toBe('正在进行');
  });

  it('全天日程不产出"即将开始"', () => {
    const list = buildMessages(input({ events: [occ(event({ id: 'e1', allDay: true }))] }));
    expect(list).toHaveLength(0);
  });

  it('非今天的日程不产出', () => {
    const list = buildMessages(
      input({ events: [occ(event({ id: 'e1', start: '09:30' }), '2026-10-23')] }),
    );
    expect(list).toHaveLength(0);
  });

  it('id 带日期，昨天的不会在今天重复出现', () => {
    const list = buildMessages(input({ events: [occ(event({ id: 'e1' }), '2026-10-22')] }));
    expect(list[0]?.id).toBe('event:e1:2026-10-22');
  });
});

describe('习惯消息', () => {
  it('今天没打卡 → 产出待打卡消息', () => {
    const list = buildMessages(input({ habits: [habit({ id: 'h1', name: '阅读' })] }));
    expect(list[0]?.kind).toBe('habit-pending');
    expect(list[0]?.title).toBe('阅读');
  });

  it('今天已打卡 → 不产出', () => {
    const list = buildMessages(
      input({ habits: [habit({ id: 'h1' })], habitDoneToday: new Set(['h1']) }),
    );
    expect(list).toHaveLength(0);
  });

  it('已归档的习惯不产出', () => {
    const list = buildMessages(input({ habits: [habit({ id: 'h1', archived: true })] }));
    expect(list).toHaveLength(0);
  });

  it('打卡记录是按天的，昨天打的今天仍提示', () => {
    const list = buildMessages(
      input({ habits: [habit({ id: 'h1' })], habitDoneToday: new Set<string>() }),
    );
    expect(list).toHaveLength(1);
  });
});

describe('备份提醒', () => {
  it(`${BACKUP_STALE_DAYS} 天内不提示`, () => {
    const recent = new Date(NOW - 3 * 86_400_000).toISOString();
    const list = buildMessages(input({ lastBackupAt: recent }));
    expect(list).toHaveLength(0);
  });

  it(`超过 ${BACKUP_STALE_DAYS} 天提示`, () => {
    const old = new Date(NOW - 12 * 86_400_000).toISOString();
    const list = buildMessages(input({ lastBackupAt: old }));
    expect(list.find((m) => m.kind === 'backup-stale')).toBeDefined();
  });

  it('从未备份过不提示', () => {
    expect(buildMessages(input())).toHaveLength(0);
  });
});

describe('排序与稳定性', () => {
  it('高优先级永远排在普通消息之前', () => {
    const list = buildMessages(
      input({
        todos: [todo({ id: 't', dueDate: TODAY })],
        habits: [habit({ id: 'h' })],
      }),
    );
    expect(list[0]?.severity).toBe('high');
    expect(list.at(-1)?.severity).toBe('normal');
  });

  it('id 稳定：同样的输入两次得到同样的 id 与顺序', () => {
    const args = input({
      todos: [todo({ id: 'a', dueDate: '2026-10-20' }), todo({ id: 'b', dueDate: TODAY })],
      habits: [habit({ id: 'h' })],
    });
    expect(ids(buildMessages(args))).toEqual(ids(buildMessages(args)));
  });

  it('全部为空时返回空数组', () => {
    expect(buildMessages(input())).toEqual([]);
  });

  it('消息都带跳转链接', () => {
    const list = buildMessages(
      input({
        todos: [todo({ id: 'a', dueDate: TODAY })],
        habits: [habit({ id: 'h' })],
      }),
    );
    for (const m of list) {
      expect(m.link.startsWith('/')).toBe(true);
    }
  });
});