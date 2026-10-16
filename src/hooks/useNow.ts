import { useEffect, useState } from 'react';

/**
 * 每秒（或指定间隔）返回一个新的时间戳，用于驱动时钟与倒计时渲染。
 * 注意：倒计时的"真相"始终由 endsAt 时间戳计算，这个 hook 只负责触发重渲染。
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
