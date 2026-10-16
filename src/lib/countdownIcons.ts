import {
  Baby,
  Briefcase,
  Cake,
  Flag,
  Flame,
  Gift,
  Heart,
  Hourglass,
  House,
  Leaf,
  MapPin,
  Moon,
  PartyPopper,
  Plane,
  Rocket,
  Sailboat,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';

/** 计时图标名 → 组件。库里只存字符串。 */
export const COUNTDOWN_ICONS: Record<string, LucideIcon> = {
  Hourglass,
  Flag,
  Star,
  Heart,
  Cake,
  Gift,
  Plane,
  House,
  Baby,
  Briefcase,
  PartyPopper,
  Sparkles,
  Rocket,
  MapPin,
};

/** 内置假期专用，不出现在自定义图标选择里 */
const HOLIDAY_ONLY_ICONS: Record<string, LucideIcon> = {
  Flame,
  Leaf,
  Moon,
  Sailboat,
};

export const COUNTDOWN_ICON_NAMES = Object.keys(COUNTDOWN_ICONS);

export const DEFAULT_COUNTDOWN_ICON = 'Hourglass';

export function countdownIcon(name: string | undefined): LucideIcon {
  if (!name) return Hourglass;
  return COUNTDOWN_ICONS[name] ?? HOLIDAY_ONLY_ICONS[name] ?? Hourglass;
}
