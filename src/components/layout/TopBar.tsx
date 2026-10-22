import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useUIStore } from '@/app/store/ui';
import { useNow } from '@/hooks/useNow';
import { IconButton } from '@/components/ui/Button';
import { dayjs, formatFullDateWithLunar, greeting, todayKey } from '@/lib/date';
import { DataMenu } from './DataMenu';
import { MessageBell } from './MessageBell';
import { SettingsModal } from './SettingsModal';
import { ThemeButton } from './ThemeButton';

export function TopBar() {
  const now = useNow(1000);
  const displayName = useUIStore((state) => state.displayName);
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

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {/* 窄屏时侧栏整体隐藏，消息入口在这里补位 */}
        <div className="w-9 lg:hidden">
          <MessageBell />
        </div>
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
