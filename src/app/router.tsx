import { createHashRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { TodosPage } from '@/features/todos/TodosPage';
import { NotesPage } from '@/features/notes/NotesPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { HabitsPage } from '@/features/habits/HabitsPage';
import { PomodoroPage } from '@/features/pomodoro/PomodoroPage';
import { CountdownPage } from '@/features/countdown/CountdownPage';
import { BookmarksPage } from '@/features/bookmarks/BookmarksPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { NotFoundPage } from '@/features/shell/NotFoundPage';

/**
 * 用 hash 路由：静态托管和直接双击 index.html 打开都不会 404，
 * 对"纯本地、零后端"的定位来说这是唯一稳妥的选择。
 */
export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'todos', element: <TodosPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'habits', element: <HabitsPage /> },
      { path: 'pomodoro', element: <PomodoroPage /> },
      { path: 'countdown', element: <CountdownPage /> },
      { path: 'bookmarks', element: <BookmarksPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
