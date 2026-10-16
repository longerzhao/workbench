import { useState, type FormEvent } from 'react';
import type { Habit } from '@/db/schema';
import { habitRepo } from '@/db/repositories';
import { toast } from '@/app/store/toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { HABIT_ICON_NAMES, habitIcon } from '@/lib/habitIcons';
import { cn } from '@/lib/cn';

const COLORS = ['#7c3aed', '#2563eb', '#16a34a', '#d97706', '#0d9488', '#db2777', '#dc2626'];

export interface HabitFormProps {
  open: boolean;
  onClose: () => void;
  editing?: Habit | null;
}

export function HabitForm(props: HabitFormProps) {
  if (!props.open) return null;
  const key = props.editing?.id ?? 'new';
  return <HabitFormInner key={key} {...props} />;
}

function HabitFormInner({ open, onClose, editing }: HabitFormProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'Circle');
  const [color, setColor] = useState(editing?.color ?? COLORS[0]!);
  const [targetPerWeek, setTargetPerWeek] = useState(editing?.targetPerWeek ?? 7);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      if (editing) {
        await habitRepo.update(editing.id, {
          name: trimmed,
          icon,
          color,
          targetPerWeek: Math.min(7, Math.max(1, targetPerWeek)),
        });
        toast('已更新习惯', 'success', 2);
      } else {
        await habitRepo.create({
          name: trimmed,
          icon,
          color,
          targetPerWeek: Math.min(7, Math.max(1, targetPerWeek)),
        });
        toast('已添加习惯', 'success', 2);
      }
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '编辑习惯' : '新建习惯'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !name.trim()}>
            {editing ? '保存' : '添加'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">名称</span>
          <input
            autoFocus
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：阅读 30 分钟"
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">图标</span>
          <div className="flex flex-wrap gap-1.5">
            {HABIT_ICON_NAMES.map((nameKey) => {
              const Icon = habitIcon(nameKey);
              return (
                <button
                  key={nameKey}
                  type="button"
                  title={nameKey}
                  onClick={() => setIcon(nameKey)}
                  className={cn(
                    'grid size-8 place-items-center rounded-[8px] border transition-colors',
                    icon === nameKey
                      ? 'border-primary bg-primary-soft text-primary-text'
                      : 'border-line hover:bg-surface-2',
                  )}
                >
                  <Icon className="size-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">颜色</span>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColor(c)}
                className={cn(
                  'size-7 rounded-full border-2',
                  color === c ? 'border-ink' : 'border-transparent',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-[0.8125rem] text-ink-muted">每周目标（天）</span>
          <input
            type="number"
            min={1}
            max={7}
            className="input"
            value={targetPerWeek}
            onChange={(e) => setTargetPerWeek(Number(e.target.value) || 1)}
          />
        </label>
      </form>
    </Modal>
  );
}
