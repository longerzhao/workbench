import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Habit } from '@/db/schema';
import { habitRepo } from '@/db/repositories';
import { yearBounds } from '@/lib/heatmap';
import { HabitForm } from './HabitForm';
import { HabitHeatmap } from './HabitHeatmap';
import { HabitList } from './HabitList';

export function HabitsPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [filterHabitId, setFilterHabitId] = useState<string | 'all'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const habits = useLiveQuery(() => habitRepo.listAll(), []);
  const { from, to } = useMemo(() => yearBounds(year), [year]);
  const yearLogs = useLiveQuery(() => habitRepo.logsBetween(from, to), [from, to]);
  const allLogs = useLiveQuery(() => habitRepo.listAllLogs(), []);

  const filterOptions = useMemo(
    () => (habits ?? []).filter((h) => !h.archived || h.id === filterHabitId),
    [habits, filterHabitId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <HabitHeatmap
        year={year}
        canGoNext={year < currentYear}
        onYearChange={setYear}
        logs={yearLogs}
        habits={filterOptions}
        filterHabitId={filterHabitId}
        onFilterChange={setFilterHabitId}
      />
      <HabitList
        habits={habits}
        logs={allLogs}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
        onEdit={(habit) => {
          setEditing(habit);
          setFormOpen(true);
        }}
      />
      <HabitForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
