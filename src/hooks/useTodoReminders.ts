import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { todoRepo } from '@/db/repositories';
import { clearTodoReminders, syncTodoReminders } from '@/lib/reminders';

/**
 * 全局待办提醒：列表变化就重排定时器。
 *
 * 刻意不在卸载时清空排程 —— StrictMode（开发模式）会挂载→卸载→重挂载，
 * 卸载即清空会让第二次挂载因列表未变而不再重排，提醒就此丢失。
 * 定时器生命周期与页面一致，由 syncTodoReminders 自己拆解过期项。
 */
export function useTodoReminders(): void {
  const todos = useLiveQuery(() => todoRepo.listWithReminder(), []);

  useEffect(() => {
    if (todos !== undefined) syncTodoReminders(todos);
  }, [todos]);
}

/** 仅供应用关闭/测试时显式清理 */
export { clearTodoReminders };