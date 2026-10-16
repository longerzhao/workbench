import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { clamp, ringGeometry } from '@/lib/stats';

export interface ProgressRingProps {
  /** 0..1 */
  ratio: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({
  ratio,
  size = 96,
  stroke = 8,
  color = 'var(--primary)',
  trackColor = 'var(--surface-3)',
  children,
  className,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const { circumference, offset } = ringGeometry(radius, clamp(ratio, 0, 1));

  return (
    <div className={cn('relative grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
