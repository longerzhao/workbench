/**
 * 消息中心：把「现在需要关注什么」算出来。
 *
 * 刻意做成派生而非存储——消息是当前数据的一次投影：
 * 待办完成了，逾期消息自然消失；新逾期待办出现，消息自然多一条。
 * 不落库就没有陈旧数据要对账，也不必做 schema 迁移。
 */
import type { CalendarEvent, Habit, Todo } from '@/db/schema';
import { humanDate, type DateKey } from '@/lib/date';
import { timeToMinutes } from '@/lib/calendarGrid';

export type MessageKind =
  | 'todo-overdue'
  | 'todo-due-today'
  | 'todo-reminder'
  | 'event-upcoming'
  | 'habit-pending'
  | 'backup-stale';

export interface WorkbenchMessage {
  /** 稳定标识，已读状态与去重都靠它 */
  id: string;
  kind: MessageKind;
  title: string;
  detail?: string;
  link: string;
  severity: 'high' | 'normal';
  /** 排序键，越大越靠前 */
  sortAt: number;
}

export interface MessageInput {
  todos: Todo[];
  /** 今天已展开的日程发生（含跨天与重复） */
  events: { date: DateKey; event: CalendarEvent }[];
  habits: Habit[];
  /** 今天已打卡的习惯 id */
  habitDoneToday: Set<string>;
  /** meta.lastBackupAt；从未备份过为 undefined */
  lastBackupAt?: string;
  today: DateKey;
  /** 当前时刻，用于"即将开始"和提醒是否已触发 */
  nowMs: number;
}

/** 日程提前多久算"即将开始"，分钟 */
export const EVENT_UPCOMING_MINUTES = 120;
/** 距上次备份超过多少天提醒一次 */
export const BACKUP_STALE_DAYS = 7;

const DAY_MS = 86_400_000;

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  0: '',
  1: 'P1',
  2: 'P2',
  3: 'P3',
};

function todoDetail(todo: Todo): string | undefined {
  const parts: string[] = [];
  if (todo.priority > 0) parts.push(PRIORITY_LABEL[todo.priority]);
  if (todo.dueDate) parts.push(humanDate(todo.dueDate));
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/** 今天的「还有多少分钟开始」；已开始的或非今天的返回 undefined */
function minutesUntilToday(hhmm: string, nowMs: number): number | undefined {
  const m = timeToMinutes(hhmm);
  if (Number.isNaN(m)) return undefined;

  const now = new Date(nowMs);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // 已开始的（跨天事件"今天这一份"可能已经结束）
  if (m < nowMinutes) return undefined;
  return m - nowMinutes;
}

export function buildMessages(input: MessageInput): WorkbenchMessage[] {
  const { todos, events, habits, habitDoneToday, lastBackupAt, today, nowMs } = input;
  const messages: WorkbenchMessage[] = [];

  // 待办：逾期 / 今天到期 / 提醒已触发
  for (const todo of todos) {
    if (todo.done) continue;

    if (todo.dueDate && todo.dueDate < today) {
      // 逾期越久越靠前
      const overdueDays = Math.round(
        (new Date(`${today}T00:00:00`).getTime() - new Date(`${todo.dueDate}T00:00:00`).getTime()) /
          DAY_MS,
      );
      messages.push({
        id: `overdue:${todo.id}`,
        kind: 'todo-overdue',
        title: todo.title,
        detail: `已逾期 ${overdueDays} 天 · ${todoDetail(todo) ?? ''}`.replace(/ · $/, ''),
        link: '/todos',
        severity: 'high',
        sortAt: nowMs + overdueDays * 1000,
      });
    } else if (todo.dueDate === today) {
      messages.push({
        id: `due:${todo.id}`,
        kind: 'todo-due-today',
        title: todo.title,
        detail: todoDetail(todo) ?? '今天到期',
        link: '/todos',
        severity: 'high',
        sortAt: nowMs,
      });
    }

    // 提醒时刻已过但仍未完成——多半是被漏掉了
    if (todo.remindAt) {
      const at = new Date(todo.remindAt).getTime();
      if (!Number.isNaN(at) && at <= nowMs) {
        messages.push({
          id: `remind:${todo.id}`,
          kind: 'todo-reminder',
          title: todo.title,
          detail: `提醒已过 · 仍未完成`,
          link: '/todos',
          severity: 'high',
          sortAt: at,
        });
      }
    }
  }

  // 日程：今天即将开始（非全天）
  for (const occ of events) {
    if (occ.date !== today) continue;
    const { event } = occ;
    if (event.allDay) continue;

    const inMins = minutesUntilToday(event.start, nowMs);
    if (inMins === undefined || inMins > EVENT_UPCOMING_MINUTES) continue;

    messages.push({
      // id 带日期，昨天的日程不会在今天继续挂着
      id: `event:${event.id}:${occ.date}`,
      kind: 'event-upcoming',
      title: event.title,
      detail: inMins === 0 ? '正在进行' : `${inMins} 分钟后 · ${event.start}`,
      link: '/calendar?view=week',
      severity: 'high',
      sortAt: nowMs + 1000 - inMins,
    });
  }

  // 习惯：今天还没打卡
  for (const habit of habits) {
    if (habit.archived) continue;
    if (habitDoneToday.has(habit.id)) continue;
    messages.push({
      id: `habit:${habit.id}:${today}`,
      kind: 'habit-pending',
      title: habit.name,
      detail: '今天还没打卡',
      link: '/habits',
      severity: 'normal',
      sortAt: nowMs - 1000,
    });
  }

  // 备份：太久没备份了
  if (lastBackupAt) {
    const at = new Date(lastBackupAt).getTime();
    if (!Number.isNaN(at) && nowMs - at > BACKUP_STALE_DAYS * DAY_MS) {
      messages.push({
        id: `backup:${lastBackupAt.slice(0, 10)}`,
        kind: 'backup-stale',
        title: '好久没备份了',
        detail: `距上次导出已超过 ${BACKUP_STALE_DAYS} 天`,
        link: '/',
        severity: 'normal',
        sortAt: nowMs - 2000,
      });
    }
  }

  // 同级按时间倒序，高优先级永远在前
  return messages.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    return b.sortAt - a.sortAt;
  });
}

/** 中文标签，面板分组与无障碍文案用 */
export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  'todo-overdue': '逾期',
  'todo-due-today': '今天到期',
  'todo-reminder': '提醒未处理',
  'event-upcoming': '日程即将开始',
  'habit-pending': '待打卡',
  'backup-stale': '备份提醒',
};