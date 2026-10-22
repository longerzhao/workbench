import { NavLink } from 'react-router-dom';
import { Flame, PanelLeftClose, PanelLeftOpen, Search, Sparkles, Timer } from 'lucide-react';
import { NAV_ITEMS } from '@/app/navigation';
import { useCommandStore } from '@/app/store/command';
import { useUIStore } from '@/app/store/ui';
import { useCounts } from '@/hooks/useCounts';
import { useOverview } from '@/features/dashboard/useOverview';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { IconButton } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDuration } from '@/lib/date';
import { cn } from '@/lib/cn';

/**
 * ⌘ 与 K 的字形高度差约 25%（实测 5.85px vs 7.29px，同字号下），
 * 并排会显得忽大忽小。按墨迹高度反推字号（13.5px ≈ 7.18px 墨迹），
 * 再把 ⌘ 下移 1.5px 补偿它悬在基线上方的部分。
 */
function ShortcutHint() {
  return (
    <kbd className="ml-auto flex items-baseline gap-px rounded border border-line bg-surface px-1 py-0.5 leading-none">
      <span aria-hidden className="relative top-[1.5px] text-[13.5px]">
        ⌘
      </span>
      <span className="text-[10px]">K</span>
    </kbd>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const avatarDataUrl = useUIStore((state) => state.avatarDataUrl);
  const openPalette = useCommandStore((state) => state.openPalette);
  const counts = useCounts();
  const overview = useOverview();

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[68px]' : 'w-[232px]',
      )}
    >
      {/* 品牌区 */}
      <div className={cn('flex h-14 items-center gap-2.5 px-4', collapsed && 'justify-center px-0')}>
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-primary text-primary-fg shadow-[0_4px_12px_-4px_var(--ring)]">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt="" className="size-full object-cover" />
          ) : (
            <Sparkles className="size-4" />
          )}
        </span>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-semibold leading-tight text-ink">
              个人工作台
            </p>
            <p className="truncate text-[0.6875rem] leading-tight text-ink-subtle">本地优先</p>
          </div>
        ) : null}
      </div>

      {/* 搜索入口：常驻「总览」上方，⌘K 快捷键与此等效 */}
      <div className="shrink-0 px-2.5 pt-2">
        <button
          type="button"
          onClick={() => openPalette('search')}
          aria-label="搜索（⌘K）"
          title={collapsed ? '搜索（⌘K）' : undefined}
          className={cn(
            'flex h-9 w-full items-center gap-2.5 rounded-[10px] border border-line bg-surface-2 px-2.5 text-[0.8125rem] text-ink-subtle transition-colors hover:border-line-strong hover:text-ink',
            collapsed && 'justify-center border-transparent bg-transparent px-0 hover:bg-surface-2',
          )}
        >
          <Search className="size-4 shrink-0" />
          {!collapsed ? (
            <>
              <span>搜索</span>
              <ShortcutHint />
            </>
          ) : null}
        </button>
      </div>

      {/* 模块导航 */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-2">
        {NAV_ITEMS.map((item) => {
          const badge = item.badgeKey ? counts?.[item.badgeKey] : undefined;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'group relative flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-[0.8125rem] font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary-soft text-primary-text'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-4 shrink-0" strokeWidth={isActive ? 2.4 : 2} />
                  {!collapsed ? (
                    <>
                      <span className="truncate">{item.label}</span>
                      {badge !== undefined && badge > 0 ? (
                        <span className="ml-auto shrink-0 rounded-full bg-surface-3 px-1.5 py-px text-[0.6875rem] font-semibold text-ink-muted">
                          {badge}
                        </span>
                      ) : null}
                    </>
                  ) : badge !== undefined && badge > 0 ? (
                    <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
                  ) : null}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 今日进度：8 张卡片之一，常驻在侧栏 */}
      <div className="shrink-0 border-t border-line p-3">
        {overview === undefined ? (
          <div className="flex justify-center py-2">
            <Skeleton className="size-[68px] rounded-full" />
          </div>
        ) : (
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <ProgressRing
              ratio={overview.todayRatio}
              size={collapsed ? 44 : 56}
              stroke={5}
              className="shrink-0"
            >
              <span className="text-[0.6875rem] font-semibold text-ink">
                {overview.todayPercent}%
              </span>
            </ProgressRing>

            {!collapsed ? (
              <div className="min-w-0 flex-1 space-y-1 text-[0.6875rem]">
                <p className="font-medium text-ink">
                  今日 {overview.todayDone}/{overview.todayTotal}
                </p>
                <p className="flex items-center gap-1 text-ink-muted">
                  <Timer className="size-3 shrink-0" />
                  专注 {formatDuration(overview.focusSecondsToday)}
                </p>
                <p className="flex items-center gap-1 text-ink-muted">
                  <Flame className="size-3 shrink-0" />
                  连续 {overview.bestStreak} 天
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line p-2.5">
        <IconButton
          label={collapsed ? '展开侧栏' : '收起侧栏'}
          onClick={toggleSidebar}
          className={cn('w-full', collapsed && 'mx-auto')}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </IconButton>
      </div>
    </aside>
  );
}
