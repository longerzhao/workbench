import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: '',
  icon: 'btn-icon',
};

export function Button({ variant = 'ghost', size = 'md', className, ...rest }: ButtonProps) {
  return <button className={cn('btn', VARIANTS[variant], SIZES[size], className)} {...rest} />;
}

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  /** 图标按钮必须有可读名称，否则屏幕阅读器读不出来 */
  label: string;
  children: ReactNode;
}

export function IconButton({ label, className, ...rest }: IconButtonProps) {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      className={cn('shrink-0 rounded-[10px]', className)}
      {...rest}
    />
  );
}
