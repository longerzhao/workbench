import { useLiveQuery } from 'dexie-react-hooks';
import {
  bookmarkRepo,
  eventRepo,
  habitRepo,
  noteRepo,
  todoRepo,
} from '@/db/repositories';

export interface Counts {
  openTodos: number;
  notes: number;
  todayEvents: number;
  habits: number;
  bookmarks: number;
}

/**
 * 侧栏徽标用的计数。合并成一个 liveQuery，
 * 避免为 5 个数字挂 5 个订阅。
 */
export function useCounts(): Counts | undefined {
  return useLiveQuery(async () => {
    const [openTodos, notes, todayEvents, habits, bookmarks] = await Promise.all([
      todoRepo.listToday(),
      noteRepo.countAll(),
      eventRepo.listToday(),
      habitRepo.countActive(),
      bookmarkRepo.countAll(),
    ]);

    return {
      openTodos: openTodos.length,
      notes,
      todayEvents: todayEvents.length,
      habits,
      bookmarks,
    } satisfies Counts;
  }, []);
}
