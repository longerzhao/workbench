import {
  Bookmark,
  CalendarDays,
  ChartColumn,
  Flame,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  Hourglass,
  Timer,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** 侧栏徽标的计数来源键 */
  badgeKey?: 'openTodos' | 'notes' | 'todayEvents' | 'habits' | 'bookmarks';
  hint: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '总览', icon: LayoutDashboard, hint: '今日作战室' },
  { path: '/todos', label: '待办', icon: ListChecks, badgeKey: 'openTodos', hint: '任务清单' },
  { path: '/notes', label: '笔记', icon: NotebookPen, badgeKey: 'notes', hint: '速记与长文' },
  { path: '/calendar', label: '日历', icon: CalendarDays, badgeKey: 'todayEvents', hint: '日程安排' },
  { path: '/habits', label: '习惯', icon: Flame, badgeKey: 'habits', hint: '打卡与连续天数' },
  { path: '/pomodoro', label: '番茄', icon: Timer, hint: '专注统计' },
  { path: '/countdown', label: '计时', icon: Hourglass, hint: '倒计时与正计时' },
  { path: '/bookmarks', label: '书签', icon: Bookmark, badgeKey: 'bookmarks', hint: '常用入口' },
  { path: '/analytics', label: '看板', icon: ChartColumn, hint: '趋势与统计' },
];
