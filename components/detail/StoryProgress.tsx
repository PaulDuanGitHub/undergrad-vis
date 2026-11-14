'use client';

import { ACT_META } from '@/components/detail/narrative/ReportType';

/**
 * The story's only navigation: one thin bar at the top, split into the three
 * acts. A finished act is full, the act being read fills with its substeps,
 * and the acts still ahead stay empty — so the bar answers "how far in am I?"
 * and doubles as the way back to a chapter.
 *
 * The track stays 3px; the hit area is the full height of the wrapper (20px),
 * and each segment carries its act name for the pointer and the screen reader.
 */
export default function StoryProgress({
  act,
  step,
  actSteps,
  className = '',
  onSelect,
}: {
  /** Act currently being read (1-based). */
  act: 1 | 2 | 3;
  /** Substeps in `act`. Pass -1 before the act has started. */
  step: number;
  /** Substeps per act, in order. */
  actSteps: readonly number[];
  className?: string;
  /** Jump to an act's opener. When omitted the bar is decorative. */
  onSelect?: (act: 1 | 2 | 3) => void;
}) {
  const interactive = Boolean(onSelect);

  return (
    <div
      className={`flex gap-[3px] ${className}`}
      role={interactive ? 'navigation' : undefined}
      aria-label={interactive ? 'Story sections' : undefined}
      aria-hidden={interactive ? undefined : true}
    >
      {actSteps.map((count, index) => {
        const number = (index + 1) as 1 | 2 | 3;
        const fill =
          number < act
            ? 1
            : number > act
              ? 0
              : Math.max(0, Math.min(1, (step + 1) / count));
        const meta = ACT_META[number];
        const label = `Act ${meta.numeral} — ${meta.title}`;

        const track = (
          <span
            aria-hidden
            className="absolute inset-x-0 top-0 block h-[3px] overflow-hidden bg-slate-200/80 transition-colors duration-300 group-hover:bg-slate-300/90"
          >
            <span
              className="block h-full bg-brand transition-[width] duration-500 ease-out"
              style={{ width: `${fill * 100}%` }}
            />
          </span>
        );

        if (!interactive) {
          return (
            <span key={number} className="relative h-full flex-1">
              {track}
            </span>
          );
        }

        return (
          <button
            key={number}
            type="button"
            onClick={() => onSelect?.(number)}
            aria-label={`Go to ${label}`}
            aria-current={number === act ? 'true' : undefined}
            className="group relative h-full flex-1 cursor-pointer text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {track}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[9px] -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.18em] text-text-secondary/0 transition-colors duration-200 group-hover:text-text-secondary/80 group-focus-visible:text-text-secondary/80"
            >
              {`Act ${meta.numeral}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
