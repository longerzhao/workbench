import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { bookmarkRepo, DEFAULT_BOOKMARK_GROUP } from '@/db/repositories';

export function useBookmarkSearch(): {
  group: string;
  setGroup: (group: string) => void;
  groups: string[] | undefined;
} {
  const [search, setSearch] = useSearchParams();
  const groupParam = useMemo(() => search.get('group')?.trim() || undefined, [search]);
  const groups = useLiveQuery(() => bookmarkRepo.listGroupNames(), []);

  const setGroup = (next: string) => {
    const params = new URLSearchParams(search);
    params.set('group', next);
    setSearch(params, { replace: true });
  };

  // 允许 URL 指向尚无条目的新分组；仅在缺省时回退
  const group = groupParam ?? groups?.[0] ?? DEFAULT_BOOKMARK_GROUP;

  useEffect(() => {
    if (groupParam) return;
    if (groups === undefined) return;
    setGroup(group);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupParam, groups]);

  // URL 指向的分组可能还没有条目（新建分组后立刻切过去），补进列表末尾且不打乱顺序
  const displayGroups = useMemo(() => {
    if (!groups) return undefined;
    if (groups.includes(group)) return groups;
    return [...groups, group];
  }, [groups, group]);

  return { group, setGroup, groups: displayGroups };
}

export function useBookmarkList(group: string) {
  const items = useLiveQuery(() => bookmarkRepo.listByGroup(group), [group]);
  return { items };
}
