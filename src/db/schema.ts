import Dexie, { type Table } from 'dexie';
import type { DateKey } from '@/lib/date';

/** 时刻型字段统一 ISO 字符串 */
export type ISODateTime = string;

/** 优先级：0 无 / 1 低 / 2 中 / 3 高 */
export type Priority = 0 | 1 | 2 | 3;

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Todo {
  id: string;
  title: string;
  note?: string;
  done: boolean;
  priority: Priority;
  dueDate?: DateKey;
  /** 提醒时刻（ISO）；到期且未完成时弹系统通知 */
  remindAt?: ISODateTime;
  projectId?: string;
  tags: string[];
  subtasks: SubTask[];
  /** 浮点序号：拖拽插入时取相邻两条的均值，避免整表重排 */
  order: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  completedAt?: ISODateTime;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  order: number;
  createdAt: ISODateTime;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  /** null / undefined = 根级未分类 */
  folderId: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CounterMode = 'down' | 'up';

/**
 * 倒计时周期：date 存锚点日（如生日 1990-06-15），
 * 展示时按周期滚到下一次发生日，到期后自动进入下一轮，不改写数据。
 * 仅对 mode='down' 有意义。
 */
export type CountdownRepeat = 'none' | 'yearly' | 'monthly' | 'weekly';

export interface Countdown {
  id: string;
  title: string;
  mode: CounterMode;
  /** 倒计时为目标日，正计时为起始日，YYYY-MM-DD；周期倒计时为首次/锚点日 */
  date: DateKey;
  /** 周期规则，缺省视为 none（旧数据兼容） */
  repeat?: CountdownRepeat;
  color: string;
  /** lucide 图标名；旧数据可能没有 */
  icon?: string;
  order: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Habit {
  id: string;
  name: string;
  /** lucide 图标名，渲染时映射 */
  icon: string;
  color: string;
  targetPerWeek: number;
  archived: boolean;
  order: number;
  createdAt: ISODateTime;
}

export interface HabitLog {
  /** 固定为 `${habitId}:${date}`，让打卡天然幂等 */
  id: string;
  habitId: string;
  date: DateKey;
  count: number;
  createdAt: ISODateTime;
}

export type PomodoroType = 'focus' | 'break';

export interface Pomodoro {
  id: string;
  type: PomodoroType;
  /** 计划时长（秒） */
  durationSec: number;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  /** 归属日期，便于按天聚合 */
  date: DateKey;
  todoId?: string;
  /** 只有完整跑完才算 completed，中断的记录保留用于统计专注时长 */
  completed: boolean;
}

/**
 * 重复规则。简化版 RRULE：
 * - daily 每天一次、weekly 同一 ISO 周几、monthly 同一"几号"（无该号的月份跳过）
 * - 重复事件的 endDate 表示重复截止（含当天）；不重复时表示跨天结束日（含当天）
 */
export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

export interface CalendarEvent {
  id: string;
  title: string;
  /** 起始日（重复事件的第一次发生日） */
  date: DateKey;
  /** 结束日（含当天）。单日事件省略，等价于 date */
  endDate?: DateKey;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  allDay: boolean;
  /** 重复规则，缺省视为 none */
  repeat?: EventRepeat;
  color: string;
  note?: string;
  createdAt: ISODateTime;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  group: string;
  order: number;
  clicks: number;
  createdAt: ISODateTime;
}

/** 键值配置表：种子标记、上次备份时间等 */
export interface MetaRecord {
  key: string;
  value: string;
}

/** 软删除回收站：删除的实体先落到这里，7 天内可撤销 */
export interface TrashRecord {
  /** `${table}:${entityId}` */
  id: string;
  table: EntityTableName;
  entityId: string;
  payload: unknown;
  label: string;
  deletedAt: ISODateTime;
}

export type EntityTableName =
  | 'todos'
  | 'projects'
  | 'notes'
  | 'habits'
  | 'habitLogs'
  | 'pomodoros'
  | 'events'
  | 'bookmarks';

export class WorkbenchDB extends Dexie {
  todos!: Table<Todo, string>;
  projects!: Table<Project, string>;
  notes!: Table<Note, string>;
  noteFolders!: Table<NoteFolder, string>;
  habits!: Table<Habit, string>;
  habitLogs!: Table<HabitLog, string>;
  pomodoros!: Table<Pomodoro, string>;
  events!: Table<CalendarEvent, string>;
  bookmarks!: Table<Bookmark, string>;
  countdowns!: Table<Countdown, string>;
  meta!: Table<MetaRecord, string>;
  trash!: Table<TrashRecord, string>;

  constructor() {
    super('zlong-workbench');

    // 注意：IndexedDB 的键只能是 number / string / Date / 二进制 / 数组，
    // 布尔字段（done、pinned、archived）不能建索引，只能用 JS 过滤。
    this.version(1).stores({
      todos: '&id, dueDate, projectId, order, createdAt, completedAt',
      projects: '&id, order',
      notes: '&id, updatedAt, createdAt, *tags',
      habits: '&id, order',
      habitLogs: '&id, habitId, date, [habitId+date]',
      pomodoros: '&id, date, type, todoId, startedAt',
      events: '&id, date, start',
      bookmarks: '&id, group, order, clicks',
      meta: '&key',
      trash: '&id, table, deletedAt',
    });

    this.version(2)
      .stores({
        notes: '&id, folderId, updatedAt, createdAt, *tags',
        noteFolders: '&id, parentId, order',
      })
      .upgrade(async (tx) => {
        await tx
          .table('notes')
          .toCollection()
          .modify((note: { folderId?: string | null }) => {
            if (note.folderId === undefined) note.folderId = null;
          });
      });

    this.version(3).stores({
      countdowns: '&id, mode, date, order',
    });

    // v4：todos 增加提醒索引；events 增加跨天/重复字段（字段不建索引，回填默认值）
    this.version(4)
      .stores({
        todos: '&id, dueDate, projectId, order, createdAt, completedAt, remindAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('events')
          .toCollection()
          .modify((event: { repeat?: string }) => {
            if (event.repeat === undefined) event.repeat = 'none';
          });
      });

    // v5：countdowns 增加周期字段（同样不建索引，回填 none）
    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table('countdowns')
          .toCollection()
          .modify((row: { repeat?: string }) => {
            if (row.repeat === undefined) row.repeat = 'none';
          });
      });
  }
}

export const db = new WorkbenchDB();

/** 各实体表名的联合类型，供通用仓储工具使用 */
export const ENTITY_TABLES = [
  'todos',
  'projects',
  'notes',
  'habits',
  'habitLogs',
  'pomodoros',
  'events',
  'bookmarks',
] as const;
