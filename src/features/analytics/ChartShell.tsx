import type { ReactNode } from 'react';

export function ChartShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex h-56 flex-col rounded-[12px] border border-line p-3">
      <h2 className="mb-2 text-sm font-semibold text-ink">{title}</h2>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
