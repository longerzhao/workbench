import { formatDuration } from '@/lib/date';

export interface PomodoroStatsProps {
  todayCompleted: number | undefined;
  todayFocusSec: number | undefined;
  weekCompleted: number | undefined;
  weekFocusSec: number | undefined;
}

function Tile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-surface-2/60 px-3 py-3">
      <p className="text-[0.6875rem] text-ink-subtle">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-[0.6875rem] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function PomodoroStats({
  todayCompleted,
  todayFocusSec,
  weekCompleted,
  weekFocusSec,
}: PomodoroStatsProps) {
  const loading = todayCompleted === undefined;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Tile
        label="今日完成"
        value={loading ? '…' : `${todayCompleted}`}
        hint="个番茄"
      />
      <Tile
        label="今日专注"
        value={loading ? '…' : formatDuration(todayFocusSec ?? 0)}
      />
      <Tile
        label="本周完成"
        value={weekCompleted === undefined ? '…' : `${weekCompleted}`}
        hint="个番茄"
      />
      <Tile
        label="本周专注"
        value={weekFocusSec === undefined ? '…' : formatDuration(weekFocusSec)}
      />
    </div>
  );
}
