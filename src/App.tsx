import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { router } from '@/app/router';
import { toast } from '@/app/store/toast';
import { Toaster } from '@/components/ui/Toaster';
import { pruneTrash } from '@/db';
import { ensureSeeded } from '@/db/seed';
import { useAutoSync } from '@/hooks/useAutoSync';
import { useGlobalErrorToast } from '@/hooks/useGlobalErrorToast';
import { useThemeEffect } from '@/hooks/useTheme';

export function App() {
  useThemeEffect();
  useAutoSync();
  useGlobalErrorToast();

  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 兜底：即使本地库初始化卡住，也不能把用户永远挡在启动页
    const timeout = window.setTimeout(() => {
      if (!cancelled) setBooting(false);
    }, 3000);

    void (async () => {
      try {
        await pruneTrash();
        await ensureSeeded();
      } catch (error) {
        console.error('[workbench] 本地数据库初始化失败', error);
        toast('本地数据库初始化失败，数据可能无法保存', 'danger', 8);
      } finally {
        if (!cancelled) {
          window.clearTimeout(timeout);
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, []);

  if (booting) return <BootScreen />;

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}

function BootScreen() {
  return (
    <div className="grid h-full place-items-center bg-canvas">
      <div className="animate-fade-in flex flex-col items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-fg shadow-[0_8px_24px_-8px_var(--ring)]">
          <Sparkles className="size-5" />
        </span>
        <p className="text-[0.8125rem] font-medium text-ink">个人工作台</p>
        <p className="animate-breathe text-xs text-ink-subtle">正在准备本地数据…</p>
      </div>
    </div>
  );
}
