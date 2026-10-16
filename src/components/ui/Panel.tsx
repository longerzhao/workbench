import { useContext, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { PanelGripContext } from './panelChrome';

export interface PanelProps {
  title: string;
  icon?: ReactNode;
  /** 标题右侧的计数或状态徽标 */
  badge?: ReactNode;
  /** 头部右侧的操作区 */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 内容区默认留白；表格/列表类卡片可关掉自己控制 */
  padded?: boolean;
  footer?: ReactNode;
}

/**
 * 看板卡片的统一外壳：固定的头部高度 + 可滚动的内容区。
 * 卡片在图格里是定高的，所以内容必须自己处理溢出，不能把卡片撑开。
 */
export function Panel({
  title,
  icon,
  badge,
  action,
  children,
  className,
  bodyClassName,
  padded = true,
  footer,
}: PanelProps) {
  const grip = useContext(PanelGripContext);

  return (
    <section className={cn('card flex h-full min-h-0 flex-col overflow-hidden', className)}>
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-3.5">
        {grip}
        {icon ? <span className="text-primary-text [&>svg]:size-4">{icon}</span> : null}
        <h3 className="truncate text-[0.8125rem] font-semibold text-ink">{title}</h3>
        {badge !== undefined ? <span className="chip shrink-0">{badge}</span> : null}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">{action}</div>
      </header>

      <div className={cn('min-h-0 flex-1 overflow-y-auto', padded && 'p-3.5', bodyClassName)}>
        {children}
      </div>

      {footer ? (
        <footer className="shrink-0 border-t border-line px-3.5 py-2 text-xs text-ink-muted">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}
