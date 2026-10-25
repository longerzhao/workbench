import type { ReactNode } from 'react';

export function ChartShell({
  title,
  chip,
  children,
}: {
  title: string;
  /** 标题右侧的说明性小徽标，如「累计」 */
  chip?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex h-56 flex-col rounded-[12px] border border-line p-3">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
        {title}
        {chip ? (
          <span className="chip bg-surface-2 text-[0.625rem] font-normal text-ink-subtle">{chip}</span>
        ) : null}
      </h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
