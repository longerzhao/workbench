import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useClickOutside } from '@/hooks/useClickOutside';

export interface DropdownProps {
  /** 触发元素；点击它开关菜单 */
  trigger: ReactNode;
  /** 渲染函数，拿到的 close() 可在点击菜单项后关闭 */
  children: (close: () => void) => ReactNode;
  align?: 'start' | 'end';
  /** 菜单相对触发器的方向；底部工具条请用 top，避免被裁切 */
  side?: 'top' | 'bottom';
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = 'end',
  side = 'bottom',
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        {trigger}
      </div>

      {open ? (
        <div
          role="menu"
          className={cn(
            'card animate-pop-in absolute z-50 min-w-[11rem] overflow-hidden p-1 shadow-[var(--shadow-pop)]',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

export interface DropdownItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** 当前选中项：浅底 + 右侧勾 */
  active?: boolean;
}

export function DropdownItem({
  icon,
  children,
  onClick,
  danger,
  disabled,
  active,
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      aria-current={active || undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors disabled:opacity-40',
        danger
          ? 'text-danger hover:bg-danger/10'
          : active
            ? 'bg-primary-soft font-medium text-primary-text'
            : 'text-ink hover:bg-surface-2',
      )}
    >
      {icon ? <span className="shrink-0 [&>svg]:size-3.5">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {active ? (
        <svg
          viewBox="0 0 16 16"
          className="size-3.5 shrink-0 text-primary"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M6.5 11.2 3.3 8l1.1-1.1 2.1 2.1 5-5L12.6 5l-6.1 6.2Z"
          />
        </svg>
      ) : null}
    </button>
  );
}

export function DropdownDivider() {
  return <div className="divider my-1" />;
}
