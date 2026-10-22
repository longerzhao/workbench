import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { eventRepo, habitRepo, todoRepo } from '@/db/repositories';
import { metaGet } from '@/db';
import { buildMessages, type WorkbenchMessage } from '@/lib/messageCenter';
import { todayKey } from '@/lib/date';
import { useNow } from '@/hooks/useNow';
import { useMessageStore } from '@/app/store/messages';

export interface MessagesResult {
  messages: WorkbenchMessage[];
  /** 打开面板时的粗略上限，避免数据异常时面板被撑爆 */
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

/**
 * 消息是当前数据的投影，没有独立订阅源；
 * 每分钟重算一次，"日程即将开始"这类随时间变化的消息才会自己往前走。
 */
export function useMessages(): MessagesResult {
  // 仅作为重算触发器，真正的"现在"在 liveQuery 里取，避免闭包读到旧值
  useNow(60_000);
  const readAt = useMessageStore((state) => state.readAt);
  const markRead = useMessageStore((state) => state.markRead);
  const markAllReadInStore = useMessageStore((state) => state.markAllRead);

  const data = useLiveQuery(async () => {
    const today = todayKey();
    const [todos, events, habits, logs, lastBackupAt] = await Promise.all([
      todoRepo.listAll(),
      eventRepo.listToday(),
      habitRepo.listActive(),
      habitRepo.logsBetween(today, today),
      metaGet('lastBackupAt'),
    ]);

    return buildMessages({
      todos,
      events,
      habits,
      habitDoneToday: new Set(logs.map((log) => log.habitId)),
      lastBackupAt,
      today,
      nowMs: Date.now(),
    });
  }, []);

  const messages = useMemo(() => data ?? [], [data]);
  const unreadCount = useMemo(
    () => messages.filter((m) => !readAt[m.id]).length,
    [messages, readAt],
  );

  const markAllRead = useCallback(() => {
    markAllReadInStore(messages.map((m) => m.id));
  }, [messages, markAllReadInStore]);

  return { messages, unreadCount, markRead, markAllRead };
}