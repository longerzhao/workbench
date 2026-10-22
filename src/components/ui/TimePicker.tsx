import { useEffect, useMemo, useRef } from 'react';
import { Dropdown } from '@/components/ui/Dropdown';
import { cn } from '@/lib/cn';

const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export interface TimePickerProps {
  value: string;
  onChange: (next: string) => void;
  className?: string;
}

function splitTime(value: string): [string, string] {
  const [hour = '09', minute = '00'] = value.split(':');
  return [hour.padStart(2, '0'), minute.padStart(2, '0')];
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [hour, minute] = splitTime(value);
  const minuteOptions = useMemo(
    () => (MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort()),
    [minute],
  );

  const setPart = (nextHour: string, nextMinute: string) => {
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <Dropdown
      align="start"
      triggerClassName="w-full"
      side="top"
      className="w-[11.5rem] p-2"
      trigger={
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-[10px] border border-line bg-surface px-2.5 text-left text-[0.8125rem] tabular-nums text-ink transition-colors hover:border-line-strong hover:bg-surface-2',
            className,
          )}
        >
          <span>
            {hour}:{minute}
          </span>
          <svg viewBox="0 0 16 16" className="size-3.5 shrink-0 text-ink-subtle" aria-hidden>
            <path
              fill="currentColor"
              d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 3a5 5 0 1 1 0 10A5 5 0 0 1 8 3Zm.5 2h-1v3.2l2.4 1.4.5-.86L8.5 7.4V5Z"
            />
          </svg>
        </button>
      }
    >
      {() => (
        <div className="grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
          <TimeColumn
            label="时"
            options={HOURS}
            selected={hour}
            onSelect={(next) => setPart(next, minute)}
          />
          <TimeColumn
            label="分"
            options={minuteOptions}
            selected={minute}
            onSelect={(next) => setPart(hour, next)}
          />
        </div>
      )}
    </Dropdown>
  );
}

function TimeColumn({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div>
      <p className="px-1 pb-1 text-center text-[0.625rem] text-ink-subtle">{label}</p>
      <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-[10px] bg-surface-2 p-1">
        {options.map((option) => (
          <button
            key={option}
            ref={option === selected ? selectedRef : undefined}
            type="button"
            onClick={() => onSelect(option)}
            className={cn(
              'grid h-7 w-full place-items-center rounded-lg text-[0.8125rem] tabular-nums',
              option === selected
                ? 'bg-primary font-medium text-white'
                : 'text-ink hover:bg-surface',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
