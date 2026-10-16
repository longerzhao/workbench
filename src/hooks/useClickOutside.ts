import { useEffect, useRef, type RefObject } from 'react';

/** 点击目标区域之外时触发回调，用于关闭气泡菜单 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null> | ReadonlyArray<RefObject<T | null>>,
  handler: () => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);

  // 在 effect 里同步最新回调，而不是渲染期写 ref
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const nodes = Array.isArray(ref) ? ref.map((item) => item.current) : [ref.current];
      if (nodes.every((node) => !node)) return;
      if (
        event.target instanceof Node &&
        nodes.every((node) => !node || !node.contains(event.target as Node))
      ) {
        handlerRef.current();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [ref, enabled]);
}
