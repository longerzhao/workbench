import { useState } from 'react';
import { Search, Settings } from 'lucide-react';
import { useCommandStore } from '@/app/store/command';
import { useUIStore } from '@/app/store/ui';
import { useNow } from '@/hooks/useNow';
import { IconButton } from '@/components/ui/Button';
import { dayjs, formatFullDateWithLunar, greeting, todayKey } from '@/lib/date';
import { DataMenu } from './DataMenu';
import { SettingsModal } from './SettingsModal';
import { ThemeButton } from './ThemeButton';

/**
 * ⌘ 与 K 的字形高度差约 25%（实测 5.85px vs 7.29px，同字号下），
 * 并排会显得忽大忽小。按墨迹高度反推字号（13.5px ≈ 7.18px 墨迹），
 * 再把 ⌘ 下移 1.5px 补偿它悬在基线上方的部分。
 */
function ShortcutHint() {
  return (
    <kbd className="flex items-baseline gap-px rounded border border-line bg-surface px-1 py-0.5 leading-none">
      <span aria-hidden className="relative top-[1.5px] text-[13.5px]">
        ⌘
      </span>
      <span className="text-[10px]">K</span>
    </kbd>
  );
}

export function TopBar() {
  const now = useNow(1000);
  const displayName = useUIStore((state) => state.displayName);
  const openPalette = useCommandStore((state) => state.openPalette);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <div className="min-w-0">
        <p className="truncate text-[0.8125rem] font-semibold leading-tight text-ink">
          {greeting(now)}
          {displayName ? `，${displayName}` : ''}
        </p>
        <p className="truncate text-[0.6875rem] leading-tight text-ink-subtle">
          {formatFullDateWithLunar(todayKey())}
          <span className="mx-1.5 text-line-strong">·</span>
          <span className="tabular-nums">{dayjs(now).format('HH:mm:ss')}</span>
        </p>
      </div>

      {/*
        搜索框相对整个顶栏居中，而不是挂在右侧按钮组里。
        用绝对定位脱离 flex 流，右侧组仍靠 ml-auto 靠右。
      */}
      <button
        type="button"
        onClick={() => openPalette('search')}
        aria-label="搜索（⌘K）"
        className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[9px] border border-line bg-surface-2 py-1.5 pl-2.5 pr-1.5 text-xs text-ink-subtle transition-colors hover:border-line-strong hover:text-ink-muted sm:flex"
      >
        <Search className="size-3.5" />
        <span>搜索</span>
        <ShortcutHint />
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeButton />
        <DataMenu />
        <IconButton label="设置" onClick={() => setSettingsOpen(true)}>
          <Settings className="size-4" />
        </IconButton>
      </div>

      {settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null}
    </header>
  );
}
