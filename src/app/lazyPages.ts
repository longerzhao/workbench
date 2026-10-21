import { lazy } from 'react';

/**
 * 路由级懒加载的页面工厂，单独放在这里是为了让 router.tsx 只导出 router，
 * 不触发 react-refresh 的「文件不应同时导出组件和非组件」规则。
 * 收益：recharts（看板）、react-markdown（笔记）、lunar-javascript（日历/计时）
 * 都不再进主包，各自跟着所属页面按需加载。
 */
export const DashboardPage = lazy(() =>
  import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
export const TodosPage = lazy(() =>
  import('@/features/todos/TodosPage').then((m) => ({ default: m.TodosPage })),
);
export const NotesPage = lazy(() =>
  import('@/features/notes/NotesPage').then((m) => ({ default: m.NotesPage })),
);
export const CalendarPage = lazy(() =>
  import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
export const HabitsPage = lazy(() =>
  import('@/features/habits/HabitsPage').then((m) => ({ default: m.HabitsPage })),
);
export const PomodoroPage = lazy(() =>
  import('@/features/pomodoro/PomodoroPage').then((m) => ({ default: m.PomodoroPage })),
);
export const CountdownPage = lazy(() =>
  import('@/features/countdown/CountdownPage').then((m) => ({ default: m.CountdownPage })),
);
export const BookmarksPage = lazy(() =>
  import('@/features/bookmarks/BookmarksPage').then((m) => ({ default: m.BookmarksPage })),
);
export const AnalyticsPage = lazy(() =>
  import('@/features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
export const NotFoundPage = lazy(() =>
  import('@/features/shell/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
