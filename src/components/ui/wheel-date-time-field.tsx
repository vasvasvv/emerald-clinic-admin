import { useEffect, useMemo, useRef } from 'react';
import { Calendar, Clock3 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type WheelFieldMode = 'date' | 'time';

interface WheelDateTimeFieldProps {
  mode: WheelFieldMode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  locale?: string;
  minuteStep?: number;
  className?: string;
  disablePortal?: boolean;
}

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;
const LOOP_COUNT = 101;
const LOOP_MIDDLE = Math.floor(LOOP_COUNT / 2);

const months = Array.from({ length: 12 }, (_, i) => i + 1);
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const years = Array.from({ length: 34 }, (_, i) => 2023 + i);
const hours = Array.from({ length: 24 }, (_, i) => i);

function pad(v: number) {
  return String(v).padStart(2, '0');
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const f = new Date();
    return {
      year: f.getFullYear(),
      month: f.getMonth() + 1,
      day: f.getDate(),
    };
  }

  const [y, m, d] = value.split('-').map(Number);
  const f = new Date();
  const year = y || f.getFullYear();
  const month = m >= 1 && m <= 12 ? m : f.getMonth() + 1;

  return {
    year,
    month,
    day: clampDay(year, month, d || f.getDate()),
  };
}

function parseTime(value: string) {
  const [h, m] = value.split(':').map(Number);
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(day, new Date(year, month, 0).getDate());
}

function WheelColumn({
  values,
  value,
  onChange,
  formatValue,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  formatValue: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof window.setTimeout>>();

  const extended = useMemo(() => {
    return Array.from({ length: LOOP_COUNT }, () => values).flat();
  }, [values]);

  const selectedIndex = useMemo(() => {
    const idx = values.indexOf(value);
    return (idx < 0 ? 0 : idx) + values.length * LOOP_MIDDLE;
  }, [value, values]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: selectedIndex * ITEM_HEIGHT, behavior: 'auto' });
  }, [selectedIndex]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;

    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      const nextIndex = Math.min(extended.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_HEIGHT)));
      const normalized = ((nextIndex % values.length) + values.length) % values.length;
      const nextValue = values[normalized];
      el.scrollTo({ top: nextIndex * ITEM_HEIGHT, behavior: 'smooth' });

      if (nextValue !== value) {
        onChange(nextValue);
      }

      if (nextIndex < values.length * 10 || nextIndex > values.length * (LOOP_COUNT - 10)) {
        window.setTimeout(() => {
          el.scrollTo({ top: (values.length * LOOP_MIDDLE + normalized) * ITEM_HEIGHT, behavior: 'auto' });
        }, 120);
      }
    }, 80);
  };

  return (
    <div className="relative h-44 min-w-0 flex-1 overflow-hidden rounded-2xl bg-black/20 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-10 -translate-y-1/2 border-y border-white/20 bg-white/5" />

      <div
        ref={ref}
        onScroll={onScroll}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ paddingBlock: `${((VISIBLE_ITEMS - 1) / 2) * ITEM_HEIGHT}px` }}
      >
        <div className="flex flex-col items-center">
          {extended.map((item, i) => (
            <div
              key={`${item}-${i}`}
              className={cn(
                'flex h-9 w-full snap-center items-center justify-center text-sm transition-colors duration-150',
                item === value ? 'text-white font-semibold' : 'text-white/40',
              )}
            >
              {formatValue(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WheelDateTimeField({
  mode,
  value,
  onChange,
  placeholder,
  locale = 'uk-UA',
  minuteStep = 5,
  className,
  disablePortal = false,
}: WheelDateTimeFieldProps) {
  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => i * minuteStep);
  const dateValue = parseDate(value);
  const timeValue = parseTime(value);
  const monthDays = useMemo(
    () => Array.from({ length: new Date(dateValue.year, dateValue.month, 0).getDate() }, (_, i) => i + 1),
    [dateValue.year, dateValue.month],
  );

  const Icon = mode === 'date' ? Calendar : Clock3;

  const displayValue =
    mode === 'date'
      ? value
        ? new Intl.DateTimeFormat(locale, {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }).format(new Date(dateValue.year, dateValue.month - 1, dateValue.day))
        : placeholder
      : value || placeholder;

  const setDatePart = (part: 'year' | 'month' | 'day', v: number) => {
    const next = { ...dateValue, [part]: v };
    const day = clampDay(next.year, next.month, next.day);
    onChange(`${next.year}-${pad(next.month)}-${pad(day)}`);
  };

  const setTimePart = (part: 'hour' | 'minute', v: number) => {
    const next = { ...timeValue, [part]: v };
    onChange(`${pad(next.hour)}:${pad(next.minute)}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-11 w-full items-center justify-between rounded-2xl px-4 bg-white/5 backdrop-blur-xl border border-white/10',
            className,
          )}
        >
          <span className={value ? 'text-white' : 'text-white/40'}>{displayValue}</span>
          <Icon className="h-4 w-4 text-white/50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        disablePortal={disablePortal}
        className="w-80 p-4 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl"
      >
        <div className="flex gap-2">
          {mode === 'date' ? (
            <>
              <WheelColumn
                values={monthDays}
                value={dateValue.day}
                onChange={(v) => setDatePart('day', v)}
                formatValue={pad}
              />
              <WheelColumn
                values={months}
                value={dateValue.month}
                onChange={(v) => setDatePart('month', v)}
                formatValue={pad}
              />
              <WheelColumn
                values={years}
                value={dateValue.year}
                onChange={(v) => setDatePart('year', v)}
                formatValue={String}
              />
            </>
          ) : (
            <>
              <WheelColumn
                values={hours}
                value={timeValue.hour}
                onChange={(v) => setTimePart('hour', v)}
                formatValue={pad}
              />
              <WheelColumn
                values={minutes}
                value={timeValue.minute}
                onChange={(v) => setTimePart('minute', v)}
                formatValue={pad}
              />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
