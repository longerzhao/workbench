import { useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Sparkles } from 'lucide-react';
import { useUIStore } from '@/app/store/ui';
import { usePomodoroStore } from '@/app/store/pomodoro';
import { toast } from '@/app/store/toast';
import { CARD_DEFS } from '@/features/dashboard/layout';
import { fileToAvatarDataUrl } from '@/lib/avatar';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Modal } from '@/components/ui/Modal';
import { GitHubSyncSection } from './GitHubSyncSection';

export interface SettingsModalProps {
  onClose: () => void;
}

/**
 * 由父组件在打开时才挂载（而不是靠 open 开关），
 * 这样草稿状态每次都是干净的，不需要在 effect 里同步。
 */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const displayName = useUIStore((state) => state.displayName);
  const setDisplayName = useUIStore((state) => state.setDisplayName);
  const avatarDataUrl = useUIStore((state) => state.avatarDataUrl);
  const setAvatarDataUrl = useUIStore((state) => state.setAvatarDataUrl);
  const hidden = useUIStore((state) => state.cards.hidden);
  const toggleCard = useUIStore((state) => state.toggleCard);
  const resetCards = useUIStore((state) => state.resetCards);

  const focusMinutes = usePomodoroStore((state) => state.focusMinutes);
  const breakMinutes = usePomodoroStore((state) => state.breakMinutes);
  const soundEnabled = usePomodoroStore((state) => state.soundEnabled);
  const soundDurationSec = usePomodoroStore((state) => state.soundDurationSec);
  const setFocusMinutes = usePomodoroStore((state) => state.setFocusMinutes);
  const setBreakMinutes = usePomodoroStore((state) => state.setBreakMinutes);
  const toggleSound = usePomodoroStore((state) => state.toggleSound);
  const setSoundDurationSec = usePomodoroStore((state) => state.setSoundDurationSec);

  const [nameDraft, setNameDraft] = useState(displayName);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickAvatar = async (file: File | undefined) => {
    if (!file || avatarBusy) return;
    setAvatarBusy(true);
    try {
      const url = await fileToAvatarDataUrl(file);
      setAvatarDataUrl(url);
      toast('头像已更新', 'success', 2);
    } catch (error) {
      toast(error instanceof Error ? error.message : '更换头像失败', 'danger');
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="设置"
      description="偏好存在浏览器本地，导出备份时一并带走"
      footer={
        <Button variant="primary" onClick={onClose}>
          完成
        </Button>
      }
    >
      <div className="space-y-6">
        <section className="space-y-2.5">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
            基本
          </h3>

          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">头像</span>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-primary text-primary-fg shadow-[0_4px_12px_-4px_var(--ring)]">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Sparkles className="size-5" />
                )}
              </span>
              <div className="flex min-w-0 flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={avatarBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="size-3.5" />
                  {avatarBusy ? '处理中…' : '更换头像'}
                </Button>
                {avatarDataUrl ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={avatarBusy}
                    onClick={() => {
                      setAvatarDataUrl(null);
                      toast('已恢复默认头像', 'success', 2);
                    }}
                  >
                    恢复默认
                  </Button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void onPickAvatar(event.target.files?.[0])}
              />
            </div>
          </div>
          <p className="pl-[5.75rem] text-[0.6875rem] text-ink-subtle">
            支持常见图片，自动裁成方形并压缩，存于本机。
          </p>

          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">称呼</span>
            <input
              className="input"
              value={nameDraft}
              maxLength={20}
              placeholder="zlong"
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => setDisplayName(nameDraft)}
            />
          </label>
        </section>

        <section className="space-y-2.5">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
            番茄钟
          </h3>
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">专注时长</span>
            <input
              type="number"
              min={1}
              max={180}
              className="input tabular-nums"
              value={focusMinutes}
              onChange={(event) => setFocusMinutes(Number(event.target.value))}
            />
            <span className="shrink-0 text-xs text-ink-subtle">分钟</span>
          </label>
          <label className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">休息时长</span>
            <input
              type="number"
              min={1}
              max={60}
              className="input tabular-nums"
              value={breakMinutes}
              onChange={(event) => setBreakMinutes(Number(event.target.value))}
            />
            <span className="shrink-0 text-xs text-ink-subtle">分钟</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <Checkbox checked={soundEnabled} onChange={toggleSound} label="结束时提示音" />
            <span className="text-[0.8125rem] text-ink-muted">一轮结束时播放提示音</span>
          </label>
          <label
            className={`flex items-center gap-3 ${soundEnabled ? '' : 'pointer-events-none opacity-40'}`}
          >
            <span className="w-20 shrink-0 text-[0.8125rem] text-ink-muted">提示音时长</span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              className="range flex-1"
              value={soundDurationSec}
              disabled={!soundEnabled}
              aria-valuetext={`${soundDurationSec} 秒`}
              onChange={(event) => setSoundDurationSec(Number(event.target.value))}
            />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-subtle">
              {soundDurationSec} 秒
            </span>
          </label>
        </section>

        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-ink-subtle">
              看板卡片
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                resetCards();
                toast('已恢复默认布局', 'success');
              }}
            >
              <RotateCcw className="size-3.5" />
              重置布局
            </Button>
          </div>

          <ul className="space-y-1">
            {CARD_DEFS.map((def) => {
              const visible = !hidden.includes(def.id);
              return (
                <li key={def.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-surface-2">
                    <Checkbox
                      checked={visible}
                      onChange={() => toggleCard(def.id)}
                      label={def.title}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.8125rem] text-ink">{def.title}</span>
                      <span className="block text-xs text-ink-subtle">{def.summary}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-ink-subtle">
            「今日进度」常驻侧栏，不在此列表中。卡片顺序可直接在总览页拖拽调整。
          </p>
        </section>

        <GitHubSyncSection />
      </div>
    </Modal>
  );
}
