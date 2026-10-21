import { useEffect } from 'react';
import { useCommandStore } from '@/app/store/command';

/** 焦点在可编辑元素上时，单键快捷键必须让路，否则打字会被劫持 */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * 全局快捷键：
 * - ⌘K / Ctrl+K  开合命令面板
 * - /            打开搜索
 * - N            直接进入新建（输入标题回车即建）
 * - Esc          关闭面板（面板内也会处理，这里兜住焦点不在输入框的情况）
 *
 * 刻意不做「按数字切模块」：那是需要记忆的映射，命令面板已经更好用。
 */
export function useGlobalHotkeys() {
  const open = useCommandStore((state) => state.open);
  const openPalette = useCommandStore((state) => state.openPalette);
  const closePalette = useCommandStore((state) => state.closePalette);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // 中文输入法组合过程中不要抢键
      if (event.isComposing) return;

      const withModifier = event.metaKey || event.ctrlKey;

      if (withModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) closePalette();
        else openPalette('search');
        return;
      }

      if (event.key === 'Escape' && open) {
        closePalette();
        return;
      }

      if (isEditable(event.target) || event.altKey || withModifier || event.shiftKey) return;

      if (event.key === '/') {
        event.preventDefault();
        openPalette('search');
        return;
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openPalette('create');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, openPalette, closePalette]);
}
