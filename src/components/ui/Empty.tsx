import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface EmptyProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

/** 卡片空态。每张卡片都必须有一个像样的空态，否则新用户看到的是八个洞里的一片空白 */
export function Empty({ icon, title, hint, action, className }: EmptyProps) {
  return (
    <div
      className={cn(
        'flex h-full min-h-[88px] flex-col items-center justify-center gap-1.5 text-center',
        className,
      )}
    >
      {icon ? <span className="text-ink-subtle [&>svg]:size-6">{icon}</span> : null}
      <p className="text-[0.8125rem] font-medium text-ink-muted">{title}</p>
      {hint ? <p className="max-w-[16rem] text-xs text-ink-subtle">{hint}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
