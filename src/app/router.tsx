import { createHashRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import {
  AnalyticsPage,
  BookmarksPage,
  CalendarPage,
  CountdownPage,
  DashboardPage,
  HabitsPage,
  NotFoundPage,
  NotesPage,
  PomodoroPage,
  TodosPage,
  TrashPage,
} from './lazyPages';

/**
 * 用 hash 路由：静态托管和直接双击 index.html 打开都不会 404，
 * 对"纯本地、零后端"的定位来说这是唯一稳妥的选择。
 * 各页面经 lazyPages 懒加载，切换时的占位见 AppShell 的 RouteFallback。
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
      { path: 'trash', element: <TrashPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
