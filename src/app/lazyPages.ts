import { lazy } from 'react';

/**
 * 路由级懒加载的页面工厂，单独放在这里是为了让 router.tsx 只导出 router，
 * 不触发 react-refresh 的「文件不应同时导出组件和非组件」规则。
 * 收益：recharts（看板）、react-markdown（笔记）、lunar-javascript（日历/计时）
 * 都不再进主包，各自跟着所属页面按需加载。
 */

/** 记录上一次「因 chunk 失效而刷新」的时刻 */
const RELOAD_AT_KEY = 'workbench:chunk-reload-at';
/** 10 秒内不重复刷新，避免刷新后又失败形成死循环 */
const RELOAD_COOLDOWN_MS = 10_000;

/**
 * 部署之后，旧的标签页会拿着旧版本的 chunk 名去请求资源——那些文件在新版本里
 * 已经被删掉了，于是动态 import 直接失败，页面上跳出
 *
 *   Failed to fetch dynamically imported module: .../BookmarksPage-XXXX.js
 *
 * 纯 hash 路由的跳转不会重新加载页面，内存里仍是旧的主包，所以只有真正刷新
 * 才能拿到新版本。这里在 import 失败时替用户刷新一次：先把时刻记下来，
 * 十秒内不再重复刷新，防止「刷新 → 仍失败 → 再刷新」把用户锁死。
 */
function reloadOnceOnChunkFailure(error: unknown): never {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) ?? '0');
  if (now - last > RELOAD_COOLDOWN_MS) {
    try {
      sessionStorage.setItem(RELOAD_AT_KEY, String(now));
    } catch {
      /* 隐私模式下 sessionStorage 可能不可用，忽略即可 */
    }
    window.location.reload();
  }
  throw error;
}

/** 给懒加载包一层自愈：chunk 取不到时先刷新一次 */
function withChunkRecovery<T>(promise: Promise<{ default: T }>): Promise<{ default: T }> {
  return promise.catch((error: unknown) => reloadOnceOnChunkFailure(error));
}

export const DashboardPage = lazy(() =>
  withChunkRecovery(
    import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
  ),
);
export const TodosPage = lazy(() =>
  withChunkRecovery(
    import('@/features/todos/TodosPage').then((m) => ({ default: m.TodosPage })),
  ),
);
export const NotesPage = lazy(() =>
  withChunkRecovery(
    import('@/features/notes/NotesPage').then((m) => ({ default: m.NotesPage })),
  ),
);
export const CalendarPage = lazy(() =>
  withChunkRecovery(
    import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
  ),
);
export const HabitsPage = lazy(() =>
  withChunkRecovery(
    import('@/features/habits/HabitsPage').then((m) => ({ default: m.HabitsPage })),
  ),
);
export const PomodoroPage = lazy(() =>
  withChunkRecovery(
    import('@/features/pomodoro/PomodoroPage').then((m) => ({ default: m.PomodoroPage })),
  ),
);
export const CountdownPage = lazy(() =>
  withChunkRecovery(
    import('@/features/countdown/CountdownPage').then((m) => ({ default: m.CountdownPage })),
  ),
);
export const BookmarksPage = lazy(() =>
  withChunkRecovery(
    import('@/features/bookmarks/BookmarksPage').then((m) => ({ default: m.BookmarksPage })),
  ),
);
export const AnalyticsPage = lazy(() =>
  withChunkRecovery(
    import('@/features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
  ),
);
export const TrashPage = lazy(() =>
  withChunkRecovery(
    import('@/features/trash/TrashPage').then((m) => ({ default: m.TrashPage })),
  ),
);
export const NotFoundPage = lazy(() =>
  withChunkRecovery(
    import('@/features/shell/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
  ),
);
