/**
 * 纯函数统计工具。刻意不碰数据库，方便单测与复用。
 */

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/**
 * 环形进度用的 dash 参数。
 * r 为半径，返回值可直接喂给 stroke-dasharray / stroke-dashoffset。
 */
export function ringGeometry(r: number, ratio: number): { circumference: number; offset: number } {
  const circumference = 2 * Math.PI * r;
  return { circumference, offset: circumference * (1 - clamp(ratio, 0, 1)) };
}
