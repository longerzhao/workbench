import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import { useCounts } from '@/hooks/useCounts';
import { cn } from '@/lib/cn';

/** 窄屏下的底部标签栏：侧栏在 <1024px 时整体隐藏，导航落到这里 */
export function MobileNav() {
  const counts = useCounts();

  return (
    <nav className="flex shrink-0 items-stretch justify-around border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV_ITEMS.map((item) => {
        const badge = item.badgeKey ? counts?.[item.badgeKey] : undefined;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.625rem] font-medium transition-colors',
                isActive ? 'text-primary-text' : 'text-ink-subtle',
              )
            }
          >
            <span className="relative">
              <item.icon className="size-[18px]" />
              {badge !== undefined && badge > 0 ? (
                <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-primary" />
              ) : null}
            </span>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
