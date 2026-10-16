import { hostnameOf } from '@/db/repositories/bookmarkRepo';

/** 字母方块用的单字：优先标题，否则域名首字母 */
export function letterGlyph(title: string, url: string): string {
  const fromTitle = title.trim().charAt(0);
  if (fromTitle) return fromTitle.toUpperCase();
  const host = hostnameOf(url);
  const fromHost = host.trim().charAt(0);
  return fromHost ? fromHost.toUpperCase() : '?';
}
