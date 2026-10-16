import { useEffect } from 'react';
import { resolveDark, useUIStore } from '@/app/store/ui';

/**
 * 把主题模式落到 <html class="dark">。
 * 首屏由 index.html 里的内联脚本先行设置，这里只负责后续切换与跟随系统。
 */
export function useThemeEffect(): void {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      document.documentElement.classList.toggle('dark', resolveDark(theme, media.matches));
    };

    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
