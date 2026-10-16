import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 无可见文字时必须提供，作为无障碍名称 */
  label?: string;
  /**
   * complete — 圆形，表示「完成任务」
   * select — 圆角方框，表示「多选」
   */
  variant?: 'complete' | 'select';
  className?: string;
  title?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  variant = 'complete',
  className,
  title,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      title={title ?? label}
      onClick={(event) => {
        // 勾选框常嵌在可点击的整行里，这里必须阻止冒泡，否则会连带触发行的操作
        event.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        'grid size-[18px] shrink-0 place-items-center border transition-all duration-150',
        variant === 'complete' ? 'rounded-full' : 'rounded-[5px]',
        checked
          ? variant === 'select'
            ? 'border-primary bg-primary/15 text-primary-text'
            : 'border-primary bg-primary text-primary-fg'
          : variant === 'select'
            ? 'border-dashed border-line-strong bg-transparent hover:border-primary hover:bg-primary-soft/40'
            : 'border-line-strong bg-transparent hover:border-primary',
        className,
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={3.5} /> : null}
    </button>
  );
}
