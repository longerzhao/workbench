import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { CommandPalette } from '@/components/command/CommandPalette';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCommandStore } from '@/app/store/command';
import { useGlobalHotkeys } from '@/hooks/useHotkeys';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * 路由级懒加载的占位：模块页单独成 chunk 后，切换时需要一帧加载态。
 * 形状刻意做得像卡片网格，避免整页闪白。
 */
function RouteFallback() {
  return (
    <div className="p-4 lg:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <Skeleton className="h-[288px] rounded-[14px] xl:col-span-4" />
        <Skeleton className="h-[288px] rounded-[14px] xl:col-span-4" />
        <Skeleton className="h-[288px] rounded-[14px] xl:col-span-4" />
        <Skeleton className="h-[288px] rounded-[14px] xl:col-span-6" />
        <Skeleton className="h-[288px] rounded-[14px] xl:col-span-6" />
      </div>
    </div>
  );
}

/**
 * 应用外壳：左侧栏（≥1024px）+ 顶栏 + 内容区。
 * 窄屏时侧栏隐藏，导航降级到底部标签栏。
 */
export function AppShell() {
  useGlobalHotkeys();
  const paletteOpen = useCommandStore((state) => state.open);

  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <MobileNav />
      </div>

      {paletteOpen ? <CommandPalette /> : null}
    </div>
  );
}
