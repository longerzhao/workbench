import {
  Bike,
  BookOpen,
  Brain,
  Circle,
  Coffee,
  Droplets,
  Dumbbell,
  Footprints,
  Leaf,
  MoonStar,
  Music,
  Pill,
  Sunrise,
  Target,
  type LucideIcon,
} from 'lucide-react';

/**
 * 习惯图标名 → 组件。数据里只存字符串，
 * 这样导出的 JSON 不会被组件实现绑死。
 */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Dumbbell,
  Sunrise,
  Brain,
  Droplets,
  Footprints,
  Bike,
  Leaf,
  Coffee,
  Music,
  Pill,
  MoonStar,
  Target,
  Circle,
};

export const HABIT_ICON_NAMES = Object.keys(HABIT_ICONS);

export function habitIcon(name: string): LucideIcon {
  return HABIT_ICONS[name] ?? Circle;
}
