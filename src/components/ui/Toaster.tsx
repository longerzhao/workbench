import { Check, Info, TriangleAlert, X } from 'lucide-react';
import { useToastStore, type ToastTone } from '@/app/store/toast';
import { cn } from '@/lib/cn';

const TONE_ICON: Record<ToastTone, typeof Info> = {
  default: Info,
  success: Check,
  danger: TriangleAlert,
};

const TONE_CLASS: Record<ToastTone, string> = {
  default: 'text-ink',
  success: 'text-success',
  danger: 'text-danger',
};

export function Toaster() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
      {items.map((item) => {
        const Icon = TONE_ICON[item.tone];
        return (
          <div
            key={item.id}
            role="status"
            className="card animate-pop-in pointer-events-auto flex w-full items-center gap-2.5 px-3.5 py-2.5 shadow-[var(--shadow-pop)]"
          >
            <Icon className={cn('size-4 shrink-0', TONE_CLASS[item.tone])} />
            <p className="min-w-0 flex-1 text-[0.8125rem] text-ink">{item.message}</p>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded-md p-0.5 text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
