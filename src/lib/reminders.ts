/**
 * 待办提醒调度器：监听库里有 remindAt 且未完成的待办，
 * 用 setTimeout 在时刻到达时弹系统通知（页面级提醒，关闭页面即失效）。
 *
 * 设计要点：
 * - setTimeout 的延迟上限是 2^31-1 ms（约 24.8 天），更远的提醒等下次同步再排
 * - 以 `${todoId}:${remindAt}` 为指纹，改期会拆掉旧定时器重排
 * - 应用启动时补发"错过"的提醒（页面关着的时候到点的），只补一次
 */
import type { Todo } from '@/db/schema';
import { notify } from '@/lib/notify';

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** id → { at: 目标时刻, timer: 句柄 }。ReturnType 兼容浏览器 number 与 Node Timeout 两种 setTimeout */
const scheduled = new Map<string, { at: number; timer: ReturnType<typeof setTimeout> }>();
/** 已经响过（或补发过）的提醒指纹，防止重复打扰 */
const fired = new Set<string>();

function fingerprint(id: string, remindAt: string): string {
  return `${id}:${remindAt}`;
}

export function fireTodoReminder(todo: Todo): void {
  if (!todo.remindAt) return;
  const key = fingerprint(todo.id, todo.remindAt);
  if (fired.has(key)) return;
  fired.add(key);
  notify('待办提醒', todo.title, true, 1, 'workbench-todo');
}

/** 用最新列表重排所有定时器；每次列表变化调用 */
export function syncTodoReminders(todos: Todo[], nowMs = Date.now()): void {
  const wanted = new Map<string, { todo: Todo; at: number }>();
  for (const todo of todos) {
    if (!todo.remindAt || todo.done) continue;
    wanted.set(todo.id, { todo, at: new Date(todo.remindAt).getTime() });
  }

  // 拆掉不再需要或已改期的定时器
  for (const [id, entry] of scheduled) {
    const next = wanted.get(id);
    if (!next || next.at !== entry.at) {
      clearTimeout(entry.timer);
      scheduled.delete(id);
    }
  }

  for (const [id, { todo, at }] of wanted) {
    if (at <= nowMs) {
      // 错过的提醒：立即补发一次（页面开着才算数）
      if (todo.remindAt) fireTodoReminder(todo);
      continue;
    }
    if (scheduled.has(id)) continue; // 同一时刻已在排程里

    const delay = Math.min(at - nowMs, MAX_TIMEOUT_MS);
    const timer = setTimeout(() => {
      scheduled.delete(id);
      fireTodoReminder(todo);
    }, delay);
    scheduled.set(id, { at, timer });
  }
}

/** 全部清空，页面卸载/测试用 */
export function clearTodoReminders(): void {
  for (const { timer } of scheduled.values()) clearTimeout(timer);
  scheduled.clear();
}

/** 连同"已响过"记录一起重置，仅测试用 */
export function resetReminderState(): void {
  clearTodoReminders();
  fired.clear();
}

export function reminderCount(): number {
  return scheduled.size;
}
