import { db, metaGet, metaSet, nowISO } from '@/db';
import type {
  Bookmark,
  CalendarEvent,
  Habit,
  HabitLog,
  Note,
  Pomodoro,
  Project,
  Todo,
} from '@/db/schema';
import { addDays, recentDays, todayKey } from '@/lib/date';
import { newId } from '@/lib/id';
import { habitLogId } from '@/db/repositories';

const SEED_FLAG = 'seededAt';

/**
 * 模块级缓存：React StrictMode 在开发模式下会把 effect 跑两遍，
 * 没有这层保护就可能并发播种两次。
 */
let seedPromise: Promise<boolean> | null = null;

/**
 * 首次打开时灌一批示例数据，让主页面立刻是「活的」而不是八个空壳。
 * 只在整个库为空时执行一次，并用 meta 标记，用户清空数据后不会又长回来。
 */
export function ensureSeeded(): Promise<boolean> {
  seedPromise ??= runSeed();
  return seedPromise;
}

async function runSeed(): Promise<boolean> {
  if (await metaGet(SEED_FLAG)) return false;

  const existing = await db.transaction('r', db.tables, async () =>
    Promise.all(db.tables.map((table) => table.count())),
  );
  if (existing.some((count) => count > 0)) {
    await metaSet(SEED_FLAG, nowISO());
    return false;
  }

  await seedDemoData();
  await metaSet(SEED_FLAG, nowISO());
  return true;
}

const PALETTE = {
  grape: '#7c3aed',
  blue: '#0ea5e9',
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  teal: '#14b8a6',
};

async function seedDemoData(): Promise<void> {
  const ts = nowISO();
  const today = todayKey();

  /* ------------------------------- 项目 ------------------------------- */
  const projects: Project[] = [
    { id: newId('proj'), name: '工作台 v1', color: PALETTE.grape, order: 1, createdAt: ts },
    { id: newId('proj'), name: '日常事务', color: PALETTE.blue, order: 2, createdAt: ts },
    { id: newId('proj'), name: '个人成长', color: PALETTE.green, order: 3, createdAt: ts },
  ];
  const [workbench, daily, growth] = projects as [Project, Project, Project];

  /* ------------------------------- 待办 ------------------------------- */
  const todoSeed: Array<Partial<Todo> & { title: string }> = [
    { title: '梳理本周需求优先级', priority: 3, dueDate: today, projectId: workbench.id },
    { title: '评审待办模块 PR #482', priority: 2, dueDate: today, projectId: workbench.id },
    { title: '写工作台架构文档', priority: 2, dueDate: today, projectId: workbench.id },
    { title: '回复产品侧邮件', priority: 1, dueDate: today, projectId: daily.id },
    { title: '整理下周迭代计划', priority: 1, dueDate: addDays(today, 1), projectId: workbench.id },
    { title: '准备季度述职材料', priority: 2, dueDate: addDays(today, 3), projectId: growth.id },
    { title: '预约牙医', priority: 0, projectId: daily.id },
    { title: '读《重构》第三章', priority: 1, projectId: growth.id },
  ];

  const todos: Todo[] = todoSeed.map((seed, index) => ({
    id: newId('todo'),
    title: seed.title,
    note: seed.note,
    done: false,
    priority: seed.priority ?? 0,
    dueDate: seed.dueDate,
    projectId: seed.projectId,
    tags: seed.tags ?? [],
    subtasks: [],
    order: index + 1,
    createdAt: ts,
    updatedAt: ts,
  }));

  // 两条已完成任务：让「今日完成」和趋势图有真实数据
  todos.push(
    {
      id: newId('todo'),
      title: '晨会同步进度',
      done: true,
      priority: 1,
      dueDate: today,
      projectId: daily.id,
      tags: [],
      subtasks: [],
      order: todos.length + 1,
      createdAt: ts,
      updatedAt: ts,
      completedAt: ts,
    },
    {
      id: newId('todo'),
      title: '升级依赖到最新版本',
      done: true,
      priority: 0,
      dueDate: addDays(today, -1),
      projectId: workbench.id,
      tags: [],
      subtasks: [],
      order: todos.length + 2,
      createdAt: ts,
      updatedAt: ts,
      completedAt: ts,
    },
  );

  // 过去 6 天各补一条完成记录，趋势图才有形状
  const historicalDone = [2, 4, 1, 3, 5, 2];
  historicalDone.forEach((count, dayIndex) => {
    const day = addDays(today, dayIndex - 6);
    for (let i = 0; i < count; i += 1) {
      const completedAt = `${day}T${String(10 + i).padStart(2, '0')}:00:00.000Z`;
      todos.push({
        id: newId('todo'),
        title: `${day} 归档任务 ${i + 1}`,
        done: true,
        priority: 0,
        dueDate: day,
        projectId: daily.id,
        tags: [],
        subtasks: [],
        order: 100 + dayIndex * 10 + i,
        createdAt: completedAt,
        updatedAt: completedAt,
        completedAt,
      });
    }
  });

  /* ------------------------------- 笔记 ------------------------------- */
  const notes: Note[] = [
    {
      id: newId('note'),
      title: '工作台架构笔记',
      content: [
        '# 工作台架构笔记',
        '',
        '- 数据全在 IndexedDB，用 Dexie 管理，UI 走 useLiveQuery',
        '- 组件不直接碰 db，一律经过 repositories',
        '- 布尔字段不能建索引，只能 JS 过滤',
        '',
        '> 下一步：把看板的图表切到按需加载',
      ].join('\n'),
      tags: ['架构', '工作台'],
      pinned: true,
      folderId: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('note'),
      title: '本周复盘',
      content: [
        '## 做完了',
        '- 主页面 Bento 布局定稿',
        '- 数据层接口收敛到 repositories',
        '',
        '## 下周',
        '- 打磨命令面板',
        '- 补 stats 的单测',
      ].join('\n'),
      tags: ['复盘'],
      pinned: false,
      folderId: null,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: newId('note'),
      title: '读书摘录',
      content: '好的抽象不是让代码变少，而是让变化只发生在一个地方。',
      tags: ['阅读'],
      pinned: false,
      folderId: null,
      createdAt: addDays(today, -2) + 'T09:00:00.000Z',
      updatedAt: addDays(today, -2) + 'T09:00:00.000Z',
    },
  ];

  /* ------------------------------- 习惯 ------------------------------- */
  const habitSeed = [
    { name: '阅读 30 分钟', icon: 'BookOpen', color: PALETTE.grape, targetPerWeek: 5 },
    { name: '运动', icon: 'Dumbbell', color: PALETTE.green, targetPerWeek: 4 },
    { name: '早起', icon: 'Sunrise', color: PALETTE.amber, targetPerWeek: 6 },
    { name: '冥想', icon: 'Brain', color: PALETTE.teal, targetPerWeek: 7 },
  ];

  const habits: Habit[] = habitSeed.map((seed, index) => ({
    id: newId('habit'),
    name: seed.name,
    icon: seed.icon,
    color: seed.color,
    targetPerWeek: seed.targetPerWeek,
    archived: false,
    order: index + 1,
    createdAt: ts,
  }));

  // 7 天命中模式（索引 0 = 6 天前，6 = 今天）
  const patterns = [
    [true, true, false, true, true, true, false],
    [true, false, true, true, false, true, true],
    [true, true, true, true, true, false, true],
    [false, true, true, true, true, true, false],
  ];
  const days = recentDays(7);
  const habitLogs: HabitLog[] = [];
  habits.forEach((habit, habitIndex) => {
    const pattern = patterns[habitIndex] ?? [];
    days.forEach((date, dayIndex) => {
      if (pattern[dayIndex]) {
        habitLogs.push({
          id: habitLogId(habit.id, date),
          habitId: habit.id,
          date,
          count: 1,
          createdAt: `${date}T08:00:00.000Z`,
        });
      }
    });
  });

  /* ------------------------------ 番茄钟 ------------------------------ */
  const focusPerDay = [3, 5, 4, 2, 6, 4, 2];
  const pomodoros: Pomodoro[] = [];
  days.forEach((date, dayIndex) => {
    const count = focusPerDay[dayIndex] ?? 0;
    for (let i = 0; i < count; i += 1) {
      const startedAt = `${date}T${String(9 + i).padStart(2, '0')}:00:00.000Z`;
      pomodoros.push({
        id: newId('pomo'),
        type: 'focus',
        durationSec: 25 * 60,
        startedAt,
        endedAt: `${date}T${String(9 + i).padStart(2, '0')}:25:00.000Z`,
        date,
        completed: true,
      });
    }
  });

  /* ------------------------------- 日程 ------------------------------- */
  const events: CalendarEvent[] = [
    {
      id: newId('event'),
      title: '站会',
      date: today,
      start: '09:30',
      end: '09:50',
      allDay: false,
      color: PALETTE.blue,
      createdAt: ts,
    },
    {
      id: newId('event'),
      title: '需求评审会',
      date: today,
      start: '14:00',
      end: '15:30',
      allDay: false,
      color: PALETTE.grape,
      createdAt: ts,
    },
    {
      id: newId('event'),
      title: '健身',
      date: today,
      start: '19:30',
      end: '20:30',
      allDay: false,
      color: PALETTE.green,
      createdAt: ts,
    },
    {
      id: newId('event'),
      title: '周会',
      date: addDays(today, 1),
      start: '10:00',
      end: '11:00',
      allDay: false,
      color: PALETTE.amber,
      createdAt: ts,
    },
  ];

  /* ------------------------------- 书签 ------------------------------- */
  const bookmarkSeed = [
    { title: 'GitHub', url: 'https://github.com', group: '开发' },
    { title: 'MDN', url: 'https://developer.mozilla.org', group: '开发' },
    { title: 'npm', url: 'https://www.npmjs.com', group: '开发' },
    { title: 'Figma', url: 'https://www.figma.com', group: '设计' },
    { title: '语雀', url: 'https://www.yuque.com', group: '效率' },
    { title: '掘金', url: 'https://juejin.cn', group: '效率' },
  ];
  const bookmarks: Bookmark[] = bookmarkSeed.map((seed, index) => ({
    id: newId('bm'),
    title: seed.title,
    url: seed.url,
    group: seed.group,
    order: index + 1,
    clicks: bookmarkSeed.length - index,
    createdAt: ts,
  }));

  await db.transaction(
    'rw',
    [db.projects, db.todos, db.notes, db.habits, db.habitLogs, db.pomodoros, db.events, db.bookmarks],
    async () => {
      await db.projects.bulkAdd(projects);
      await db.todos.bulkAdd(todos);
      await db.notes.bulkAdd(notes);
      await db.habits.bulkAdd(habits);
      await db.habitLogs.bulkAdd(habitLogs);
      await db.pomodoros.bulkAdd(pomodoros);
      await db.events.bulkAdd(events);
      await db.bookmarks.bulkAdd(bookmarks);
    },
  );
}
