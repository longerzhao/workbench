/**
 * 官网脚本：three.js 背景场景 + 主题切换 + 多语言 + 滚动揭示
 *
 * 注意：应用本体承诺「零网络请求」，那是指 IndexedDB 里的业务数据不外传。
 * 官网是独立的静态页，这里从 CDN 取 three.js 属于正常的前端资源加载。
 */

/* ==========================================================================
   1. 文案字典（zh-CN / en）
   ========================================================================== */

const DICT = {
  'zh-CN': {
    'nav.features': '功能',
    'nav.highlights': '亮点',
    'nav.stack': '技术',
    'nav.start': '上手',
    'cta.open': '打开应用',
    'cta.github': '查看源码',
    'hero.eyebrow': '本地优先 · 零后端 · 无网络请求',
    'hero.title1': '把一天要做的事',
    'hero.title2': '收进同一个页面',
    'hero.sub':
      '待办、笔记、日历、习惯、番茄钟、计时、书签与数据看板，共享同一份本地数据。装上即用，数据永远留在你自己的浏览器里。',
    'stat.modules': '功能模块',
    'stat.tables': '本地数据表',
    'stat.tests': '单元测试',
    'stat.network': '网络请求',
    'stat.networkValue': '0',
    'features.title': '九个模块，一份数据',
    'features.sub': '每个模块都有独立页面，主页卡片里也能直接操作，不用来回跳转。',
    'hl.title': '不只是能用的功能',
    'hl.sub': '工程细节上做了不少取舍，这里挑最有代表性的几条。',
    'hl.1.title': '消息中心是算出来的，不是存下来的',
    'hl.1.body':
      '逾期待办、临近日程、待打卡、久未备份……六类消息每次都从当前数据实时推导。待办一勾完，消息自动消失；新逾期待办出现，消息自动多一条。没有陈旧数据要对账。',
    'hl.2.title': '命令面板，输入即创建',
    'hl.2.body':
      '按 ⌘K 模糊搜索待办与笔记，或直接输入一句话回车新建。「新建」刻意排在结果最后——输入「日历」时回车应该跳转到日历，而不是建一条叫日历的待办。',
    'hl.3.title': '番茄钟靠时间戳算，不靠定时器累加',
    'hl.3.body':
      '剩余时间由开始时刻与结束时刻相减得出，刷新页面或笔记本休眠后依然准确。中途放弃只结算真正专注过的秒数，不会把一分钟的尝试记成 25 分钟。',
    'hl.4.title': '重复日程不预生成数据行',
    'hl.4.body':
      '每天 / 每周 / 每月的日程在查询时才展开成「发生列表」，跨天事件按天铺开。数据库里始终只有一条记录，不会随着时间膨胀出几万个副本。',
    'hl.5.title': '删除是软删除，进回收站保留 7 天',
    'hl.5.body':
      '误删的任务可以在回收站里找回来。一键导出 JSON 备份，导入时校验结构，跨表引用失效的记录会自动修复后再入库。',
    'hl.6.title': '离线可用，装成应用',
    'hl.6.body':
      '手写 Service Worker 缓存应用外壳，断网刷新照样打开。桌面 Chrome 一键安装到桌面，手机可以「添加到主屏幕」。',
    'stack.title': '技术选型',
    'stack.sub': '全部依赖克制在必要范围内，不引入组件库。',
    'stack.note':
      '一条硬约束：组件不允许直接 import db，所有读写必须走仓储层。这样统计口径统一、可单测，将来要接后端只需新增一套实现，界面零改动。',
    'start.title': '本地跑起来',
    'start.sub': '需要 Node 20+ 与 pnpm。',
    'start.s1': '安装依赖',
    'start.s2': '启动开发服务器，打开 http://127.0.0.1:5273/workbench/',
    'start.s3': '类型检查 + 生产构建到 dist/',
    'start.noteTitle': '首次打开会灌入一批示例数据',
    'start.note':
      '让主页立刻是「活的」而不是一片空白。想从零开始，用顶栏的「数据 → 清空本地数据」，之后不会再自动播种。',
    'footer.built': '纯前端 · 零后端 · 无账号 · 无埋点',
    'footer.copy': '数据保存在你自己的浏览器里，清缓存前记得先导出备份。',
    'mod.todo': '今日待办',
    'mod.todo.d': '智能列表、项目分组、子任务、优先级、拖拽排序、批量改期与回收站。',
    'mod.note': 'Markdown 笔记',
    'mod.note.d': '目录树、编辑/预览双 Tab、标签、置顶，正文自动保存，原始 HTML 不执行。',
    'mod.calendar': '日历',
    'mod.calendar.d': '年/月/周三视图，跨天与重复日程，年视图带生肖剪纸水印。',
    'mod.habit': '习惯打卡',
    'mod.habit.d': '近 7 天矩阵与年度热力图，点格子即可补打，连续天数自动统计。',
    'mod.pomodoro': '番茄钟',
    'mod.pomodoro.d': '专注/休息切换、关联任务、结束提示音，刷新后计时依然准确。',
    'mod.countdown': '计时',
    'mod.countdown.d': '法定节假日倒计时（农历与节气自动换算）、自定义倒计时与正计时。',
    'mod.bookmark': '书签',
    'mod.bookmark.d': '分组管理、组内拖拽排序、点击计数，首页卡片按常用度排列。',
    'mod.analytics': '数据看板',
    'mod.analytics.d': '完成量、专注时长、习惯达成、项目进度四张图，只读无干扰。',
    'mod.dashboard': '总览主页',
    'mod.dashboard.d': 'Bento 卡片网格可直接操作，卡片可拖拽重排、逐张显隐。',
  },
  en: {
    'nav.features': 'Features',
    'nav.highlights': 'Highlights',
    'nav.stack': 'Stack',
    'nav.start': 'Get started',
    'cta.open': 'Open the app',
    'cta.github': 'Source code',
    'hero.eyebrow': 'Local-first · No backend · Zero network calls',
    'hero.title1': 'Everything for your day,',
    'hero.title2': 'in one screen',
    'hero.sub':
      'Todos, notes, calendar, habits, pomodoro, timers, bookmarks and analytics — all sharing one local dataset. Install it and go; your data never leaves the browser.',
    'stat.modules': 'Modules',
    'stat.tables': 'Local tables',
    'stat.tests': 'Unit tests',
    'stat.network': 'Network calls',
    'stat.networkValue': '0',
    'features.title': 'Nine modules, one dataset',
    'features.sub':
      'Every module has a full page, and the dashboard cards let you act without navigating away.',
    'hl.title': 'More than a feature list',
    'hl.sub': 'A few of the engineering decisions worth calling out.',
    'hl.1.title': 'The inbox is computed, not stored',
    'hl.1.body':
      'Overdue todos, upcoming events, unchecked habits, a stale backup — six kinds of messages derived from live data on every read. Tick a todo off and its message vanishes; nothing goes stale.',
    'hl.2.title': 'A command palette that creates as you type',
    'hl.2.body':
      'Press ⌘K to fuzzy-search todos and notes, or just type a title and hit enter to create it. "Create" sits last on purpose: typing "calendar" should navigate, not spawn a todo called calendar.',
    'hl.3.title': 'The timer reads a clock, not a counter',
    'hl.3.body':
      'Remaining time is the difference between two timestamps, so a refresh or a sleeping laptop does not throw it off. Abandoning a session banks only the seconds actually focused.',
    'hl.4.title': 'Recurring events are never materialised',
    'hl.4.body':
      'Daily, weekly and monthly schedules expand into occurrences at query time. The database keeps exactly one row and never grows a copy per day.',
    'hl.5.title': 'Deletion is soft, and reversible for 7 days',
    'hl.5.body':
      'Mis-clicks can be undone from the trash. Export a JSON backup at any time; imports are validated and broken cross-table references are repaired on the way in.',
    'hl.6.title': 'Works offline, installs like an app',
    'hl.6.body':
      'A hand-written service worker caches the shell, so a reload works with no network. Install it from desktop Chrome or add it to your home screen.',
    'stack.title': 'Stack',
    'stack.sub': 'Dependencies stay deliberately small — no component library.',
    'stack.note':
      'One hard rule: components never import the database directly. Everything goes through the repository layer, so metrics stay consistent, the code is testable, and a future backend is a new implementation behind the same interface.',
    'start.title': 'Run it locally',
    'start.sub': 'Needs Node 20+ and pnpm.',
    'start.s1': 'Install dependencies',
    'start.s2': 'Start the dev server and open http://127.0.0.1:5273/workbench/',
    'start.s3': 'Typecheck and build to dist/',
    'start.noteTitle': 'Demo data is seeded on first open',
    'start.note':
      'So the dashboard is alive rather than blank. To start from scratch, use Data → Clear local data; the seed will not come back.',
    'footer.built': 'Pure frontend · No backend · No accounts · No tracking',
    'footer.copy': 'Your data lives in your own browser — export a backup before clearing the cache.',
    'mod.todo': 'Todos',
    'mod.todo.d': 'Smart lists, projects, subtasks, priorities, drag ordering, bulk edits and a trash.',
    'mod.note': 'Markdown notes',
    'mod.note.d': 'Folder tree, edit/preview tabs, tags and pinning, autosaved, raw HTML never runs.',
    'mod.calendar': 'Calendar',
    'mod.calendar.d': 'Year, month and week views, multi-day and recurring events, zodiac watermark.',
    'mod.habit': 'Habits',
    'mod.habit.d': 'A seven-day matrix and a year heatmap; click any cell to backfill a day.',
    'mod.pomodoro': 'Pomodoro',
    'mod.pomodoro.d': 'Focus and break modes, task linking, end chime, accurate across reloads.',
    'mod.countdown': 'Timers',
    'mod.countdown.d': 'Statutory holidays converted from the lunar calendar, plus custom countdowns.',
    'mod.bookmark': 'Bookmarks',
    'mod.bookmark.d': 'Groups, drag sorting inside a group, click counts, most-used first on the card.',
    'mod.analytics': 'Analytics',
    'mod.analytics.d': 'Four read-only charts: completions, focus time, habit goals and project progress.',
    'mod.dashboard': 'Dashboard',
    'mod.dashboard.d': 'A bento grid you can act in directly, with draggable, hideable cards.',
  },
};

/** 功能卡片：图标用内联 SVG，避免额外字体与图片请求 */
const MODULES = [
  { key: 'mod.dashboard', icon: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z' },
  { key: 'mod.todo', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11' },
  { key: 'mod.note', icon: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5' },
  { key: 'mod.calendar', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { key: 'mod.habit', icon: 'M12 2c1 4 4 5 4 8a4 4 0 01-8 0c0-3 3-4 4-8zM12 22a7 7 0 007-7c0-3-3-4-4-8' },
  { key: 'mod.pomodoro', icon: 'M12 8v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18z' },
  { key: 'mod.countdown', icon: 'M6 3h12M7 3v3l-4 9a3 3 0 003 4h12a3 3 0 003-4l-4-9V3M12 11v4' },
  { key: 'mod.bookmark', icon: 'M6 3h12v18l-6-5-6 5z' },
  { key: 'mod.analytics', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
];

const STACK = [
  'Vite 8', 'React 19', 'TypeScript 5.9', 'Tailwind CSS 4', 'Dexie 4', 'Zustand 5',
  'React Router 7', 'Recharts 3', '@dnd-kit', 'zod 4', 'lunar-javascript',
  'dayjs', 'lucide-react', 'Vitest 5',
];

/* ==========================================================================
   2. 语言切换
   ========================================================================== */

const LANG_KEY = 'workbench-site:lang';
const THEME_KEY = 'workbench-site:theme';
const ACCENT_KEY = 'workbench-site:accent';

const LOCALES = ['zh-CN', 'en'];
let lang = localStorage.getItem(LANG_KEY) || (navigator.language.startsWith('zh') ? 'zh-CN' : 'en');
if (!LOCALES.includes(lang)) lang = 'zh-CN';

function applyLang(next) {
  lang = next;
  localStorage.setItem(LANG_KEY, next);
  document.documentElement.lang = next;

  for (const el of document.querySelectorAll('[data-i18n]')) {
    const key = el.getAttribute('data-i18n');
    const value = DICT[next]?.[key];
    if (value) el.textContent = value;
  }

  // 动态生成的卡片与 chips 也要跟着换
  renderModules();
  renderStack();

  const toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.querySelector('#lang-label').textContent = next === 'zh-CN' ? 'EN' : '中';
    toggle.setAttribute('aria-label', next === 'zh-CN' ? 'Switch to English' : '切换到中文');
  }
  document.title =
    next === 'zh-CN'
      ? '个人工作台 · Local-first Workbench'
      : 'Personal Workbench · Local-first Productivity';
}

/* ==========================================================================
   3. 主题与强调色
   ========================================================================== */

const THEMES = ['light', 'dark', 'system'];
const ACCENTS = ['grape', 'ocean', 'forest', 'sunset'];
const THEME_ICONS = { light: '☀', dark: '☾', system: '◐' };

function applyTheme(next) {
  localStorage.setItem(THEME_KEY, next);
  if (next === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = next;

  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = THEME_ICONS[next];
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.setAttribute('aria-label', `Theme: ${next}`);

  // three.js 场景跟着主题换色
  if (window.__scene) window.__scene.syncTheme();
}

function applyAccent(next) {
  localStorage.setItem(ACCENT_KEY, next);
  document.documentElement.dataset.accent = next;
  if (window.__scene) window.__scene.syncTheme();
}

/* ==========================================================================
   4. 渲染功能卡片与 chips
   ========================================================================== */

function svgIcon(path) {
  return `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
}

function renderModules() {
  const grid = document.getElementById('feature-grid');
  if (!grid) return;
  grid.innerHTML = MODULES.map((m) => {
    const t = DICT[lang]?.[m.key] ?? '';
    const d = DICT[lang]?.[`${m.key}.d`] ?? '';
    return `<article class="tile reveal">
      <div class="tile-icon">${svgIcon(m.icon)}</div>
      <h3>${t}</h3>
      <p>${d}</p>
    </article>`;
  }).join('');
  bindReveal();
}

function renderStack() {
  const box = document.getElementById('stack-chips');
  if (!box) return;
  box.innerHTML = STACK.map((s) => `<span class="chip reveal">${s}</span>`).join('');
  bindReveal();
}

/* ==========================================================================
   5. 滚动揭示 + 卡片光标跟随
   ========================================================================== */

let observer;

function bindReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    return;
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px' },
  );
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => observer.observe(el));
}

function bindPointerGlow() {
  document.addEventListener('pointermove', (e) => {
    const tile = e.target.closest?.('.tile');
    if (!tile) return;
    const rect = tile.getBoundingClientRect();
    tile.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    tile.style.setProperty('--my', `${e.clientY - rect.top}px`);
  });
}

/* ==========================================================================
   6. three.js 背景场景
   ========================================================================== */

async function initScene() {
  const canvas = document.getElementById('bg');
  if (!canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let THREE;
  try {
    // 官网是独立静态页，从 CDN 取 three.js 属于正常的资源加载
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js');
  } catch (err) {
    console.warn('[site] three.js 加载失败，背景降级为纯 CSS', err);
    document.body.classList.add('no-3d');
    return;
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 26);

  // ── 粒子云 ──
  const COUNT = reduced ? 320 : 900;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const spread = 34;

  for (let i = 0; i < COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * spread * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const pointsMat = new THREE.PointsMaterial({
    size: 0.16,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, pointsMat);
  scene.add(points);

  // ── 连线：距离近的点之间拉线，形成星云般的网 ──
  const LINK_DIST = 4.2;
  const LINK_MAX = COUNT * 2;
  const linePos = new Float32Array(LINK_MAX * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // ── 中心多面体：随鼠标轻微转动 ──
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.4, 1),
    new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
    }),
  );
  core.position.set(0, 0, -4);
  scene.add(core);

  const core2 = new THREE.Mesh(
    new THREE.TorusKnotGeometry(2.1, 0.28, 96, 12),
    new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.22,
    }),
  );
  core2.position.set(0, 0, -2);
  scene.add(core2);

  const mouse = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };

  window.addEventListener('pointermove', (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  /** 主题同步：把场景配色换成当前强调色 */
  function syncTheme() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue('--accent').trim() || '#7c3aed';
    const dark = document.documentElement.dataset.theme === 'dark'
      || (!document.documentElement.dataset.theme
          && window.matchMedia('(prefers-color-scheme: dark)').matches);

    pointsMat.color.set(accent);
    lineMat.color.set(accent);
    core.material.color.set(accent);
    core2.material.color.set(accent);
    pointsMat.opacity = dark ? 0.62 : 0.45;
    lineMat.opacity = dark ? 0.2 : 0.13;
    core.material.opacity = dark ? 0.22 : 0.14;
  }
  syncTheme();

  const clock = new THREE.Clock();
  let visible = true;
  let frame = 0;

  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden;
  });

  function updateLines() {
    let idx = 0;
    const p = geo.attributes.position.array;
    for (let i = 0; i < COUNT && idx < LINK_MAX; i += 1) {
      const ix = p[i * 3];
      const iy = p[i * 3 + 1];
      const iz = p[i * 3 + 2];
      for (let j = i + 1; j < COUNT && idx < LINK_MAX; j += 1) {
        const dx = p[j * 3] - ix;
        const dy = p[j * 3 + 1] - iy;
        const dz = p[j * 3 + 2] - iz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > LINK_DIST * LINK_DIST) continue;
        linePos[idx * 6] = ix;
        linePos[idx * 6 + 1] = iy;
        linePos[idx * 6 + 2] = iz;
        linePos[idx * 6 + 3] = p[j * 3];
        linePos[idx * 6 + 4] = p[j * 3 + 1];
        linePos[idx * 6 + 5] = p[j * 3 + 2];
        idx += 1;
      }
    }
    lineGeo.setDrawRange(0, idx * 2);
    lineGeo.attributes.position.needsUpdate = true;
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;

    const t = clock.getElapsedTime();
    const p = geo.attributes.position.array;

    // 粒子缓慢漂移 + 呼吸
    for (let i = 0; i < COUNT; i += 1) {
      p[i * 3 + 1] += Math.sin(t * 0.35 + seeds[i]) * 0.0016;
      p[i * 3] += Math.cos(t * 0.28 + seeds[i]) * 0.0012;
    }
    geo.attributes.position.needsUpdate = true;

    // 每 3 帧更新一次连线，控制开销
    frame += 1;
    if (frame % 3 === 0) updateLines();

    // 鼠标视差
    mouse.x += (target.x - mouse.x) * 0.045;
    mouse.y += (target.y - mouse.y) * 0.045;
    points.rotation.y = mouse.x * 0.09;
    points.rotation.x = -mouse.y * 0.05;
    camera.position.x = mouse.x * 1.6;
    camera.position.y = -mouse.y * 1.1;
    camera.lookAt(0, 0, -2);

    core.rotation.x = t * 0.11;
    core.rotation.y = t * 0.16;
    core2.rotation.x = -t * 0.14;
    core2.rotation.y = t * 0.1;

    renderer.render(scene, camera);
  }
  animate();

  window.__scene = { syncTheme, renderer, scene, camera };
}

/* ==========================================================================
   7. 启动
   ========================================================================== */

function initThemeToggle() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = THEMES.includes(saved) ? saved : 'system';
  applyTheme(theme);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const current = localStorage.getItem(THEME_KEY) || 'system';
    const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
    applyTheme(next);
  });

  const accent = localStorage.getItem(ACCENT_KEY);
  applyAccent(ACCENTS.includes(accent) ? accent : 'grape');

  // 强调色：按住强调色按钮时轮换，或用 Shift + 点击主题按钮切换
  document.getElementById('theme-toggle')?.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const current = localStorage.getItem(ACCENT_KEY) || 'grape';
    applyAccent(ACCENTS[(ACCENTS.indexOf(current) + 1) % ACCENTS.length]);
  });
}

function initLangToggle() {
  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    applyLang(lang === 'zh-CN' ? 'en' : 'zh-CN');
  });
}

function initTopbarScroll() {
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/**
 * 旧链接兼容：之前应用挂在 /workbench/ 下，收藏的是 /workbench/#/todos。
 * 应用搬到 /workbench/app/ 后，这类链接要转过去，否则 404。
 */
function redirectLegacyHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#/')) return;
  const target = new URL('./app/' + hash, window.location.href);
  window.location.replace(target.toString());
}

/**
 * 注册官网自己的 SW（作用域 /workbench/）。
 * 它在 activate 时会清掉旧版应用留下的 workbench-v1 缓存——
 * 那是「Failed to fetch dynamically imported module」报错的根因。
 */
function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('[site] Service Worker 注册失败', error);
    });
  });
}

applyLang(lang);
initThemeToggle();
initLangToggle();
initTopbarScroll();
bindPointerGlow();
redirectLegacyHash();
initServiceWorker();
initScene();
