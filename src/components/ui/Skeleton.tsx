import { cn } from '@/lib/cn';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton h-3.5 w-full', className)} />;
}

/** 卡片加载态：几行长短不一的灰条 */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-[86%]', 'w-[64%]', 'w-[78%]', 'w-[52%]'];
  return (
    <div className="space-y-2.5 py-0.5">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={widths[index % widths.length]} />
      ))}
    </div>
  );
}
