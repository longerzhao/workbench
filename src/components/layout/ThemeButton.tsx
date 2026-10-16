import { Monitor, Moon, Sun } from 'lucide-react';
import { useUIStore, type ThemeMode } from '@/app/store/ui';
import { IconButton } from '@/components/ui/Button';

const LABEL: Record<ThemeMode, string> = {
  light: '浅色模式',
  dark: '深色模式',
  system: '跟随系统',
};

export function ThemeButton() {
  const theme = useUIStore((state) => state.theme);
  const cycleTheme = useUIStore((state) => state.cycleTheme);

  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <IconButton label={`${LABEL[theme]}（点击切换）`} onClick={cycleTheme}>
      <Icon className="size-4" />
    </IconButton>
  );
}
