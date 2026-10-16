/** 十二生肖（公历年，与标题「YYYY年」一致） */
export const ZODIAC_KEYS = [
  'shu',
  'niu',
  'hu',
  'tu',
  'long',
  'she',
  'ma',
  'yang',
  'hou',
  'ji',
  'gou',
  'zhu',
] as const;

export type ZodiacKey = (typeof ZODIAC_KEYS)[number];

export const ZODIAC_LABELS: Record<ZodiacKey, string> = {
  shu: '鼠',
  niu: '牛',
  hu: '虎',
  tu: '兔',
  long: '龙',
  she: '蛇',
  ma: '马',
  yang: '羊',
  hou: '猴',
  ji: '鸡',
  gou: '狗',
  zhu: '猪',
};

/** (year - 4) % 12 → 鼠…猪；2020→鼠，2026→马 */
export function zodiacKeyForYear(year: number): ZodiacKey {
  const idx = ((year - 4) % 12 + 12) % 12;
  return ZODIAC_KEYS[idx]!;
}

export function zodiacSrcForYear(year: number): string {
  return `/zodiac/${zodiacKeyForYear(year)}.svg`;
}

export function zodiacLabelForYear(year: number): string {
  return ZODIAC_LABELS[zodiacKeyForYear(year)];
}
