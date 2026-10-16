import { Outlet } from 'react-router-dom';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * 应用外壳：左侧栏（≥1024px）+ 顶栏 + 内容区。
 * 窄屏时侧栏隐藏，导航降级到底部标签栏。
 */
export function AppShell() {
  return (
    <div className="flex h-full overflow-hidden bg-canvas">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto">
            <Outlet />
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
