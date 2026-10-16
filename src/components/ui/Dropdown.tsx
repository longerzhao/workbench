import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside([ref, menuRef], () => setOpen(false), open);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const trigger = ref.current?.getBoundingClientRect();
      const menu = menuRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const menuHeight = menu?.height ?? 240;
      const menuWidth = menu?.width ?? trigger.width;
      const gap = 6;
      const spaceBelow = window.innerHeight - trigger.bottom;
      const spaceAbove = trigger.top;
      const openUp =
        side === 'top' || (spaceBelow < menuHeight + gap && spaceAbove > spaceBelow);
      const top = openUp
        ? Math.max(8, trigger.top - menuHeight - gap)
        : Math.min(window.innerHeight - menuHeight - 8, trigger.bottom + gap);
      const rawLeft = align === 'end' ? trigger.right - menuWidth : trigger.left;
      const left = Math.max(8, Math.min(rawLeft, window.innerWidth - menuWidth - 8));
      setPos({ top, left });
    };

    place();
    const frame = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align, side]);

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

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
              className={cn(
                'card animate-pop-in fixed z-[80] min-w-[11rem] overflow-hidden p-1 shadow-[var(--shadow-pop)]',
                !pos && 'invisible',
                className,
              )}
            >
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
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
