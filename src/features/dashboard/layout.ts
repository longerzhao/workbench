import {
  Bookmark,
  CalendarDays,
  Flame,
  ListChecks,
  StickyNote,
  Hourglass,
  Timer,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export type CardId =
  | 'todos'
  | 'pomodoro'
  | 'schedule'
  | 'habits'
  | 'bookmarks'
  | 'notes'
  | 'trend'
  | 'countdown';

export interface CardDef {
  id: CardId;
  title: string;
  icon: LucideIcon;
  /** 12 列栅格里占的列数 */
  colSpan: number;
  /** 占几行（行高 96px，间距 16px） */
  rowSpan: number;
  /** 在「布局」设置里给用户看的一句话说明 */
  summary: string;
}

/**
 * 卡片注册表：Dashboard 只负责摆位，不知道每张卡内部是什么。
 * 顺序即默认顺序；用户改过的顺序存在 ui store 里。
 */
export const CARD_DEFS: CardDef[] = [
  {
    id: 'todos',
    title: '今日待办',
    icon: ListChecks,
    colSpan: 4,
    rowSpan: 3,
    summary: '今天到期、已逾期和未排期的任务',
  },
  {
    id: 'pomodoro',
    title: '番茄钟',
    icon: Timer,
    colSpan: 4,
    rowSpan: 3,
    summary: '专注计时与今日番茄数',
  },
  {
    id: 'schedule',
    title: '今日日程',
    icon: CalendarDays,
    colSpan: 4,
    rowSpan: 3,
    summary: '今天的时间轴安排',
  },
  {
    id: 'habits',
    title: '习惯打卡',
    icon: Flame,
    colSpan: 6,
    rowSpan: 3,
    summary: '近 7 天的打卡矩阵，可直接点格子打卡',
  },
  {
    id: 'bookmarks',
    title: '快捷入口',
    icon: Bookmark,
    colSpan: 6,
    rowSpan: 3,
    summary: '按分组展示常用网址',
  },
  {
    id: 'notes',
    title: '速记',
    icon: StickyNote,
    colSpan: 6,
    rowSpan: 3,
    summary: '一行输入即存为笔记',
  },
  {
    id: 'countdown',
    title: '计时',
    icon: Hourglass,
    colSpan: 4,
    rowSpan: 3,
    summary: '最近一个法定假期或自定义倒计时',
  },
  {
    id: 'trend',
    title: '本周趋势',
    icon: TrendingUp,
    colSpan: 6,
    rowSpan: 3,
    summary: '近 7 天的完成量、专注时长与打卡数',
  },
];

export const CARD_IDS: CardId[] = CARD_DEFS.map((def) => def.id);

export const CARD_MAP: Map<CardId, CardDef> = new Map(CARD_DEFS.map((def) => [def.id, def]));

export function isCardId(value: string): value is CardId {
  return CARD_IDS.includes(value as CardId);
}

/**
 * 把用户存的顺序与注册表合并。
 * 新增卡片（或存了过期 id）时不会丢卡片——注册表里没出现的补到末尾。
 */
export function resolveCardOrder(stored: string[]): CardId[] {
  const head = stored.filter(isCardId);
  const tail = CARD_IDS.filter((id) => !head.includes(id));
  return [...head.filter((id, index) => head.indexOf(id) === index), ...tail];
}

export function resolveVisible(stored: string[], hidden: string[]): CardId[] {
  const hiddenSet = new Set(hidden);
  return resolveCardOrder(stored).filter((id) => !hiddenSet.has(id));
}
