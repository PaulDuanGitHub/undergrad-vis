'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReadingProgressText from './ReadingProgress';
import {
  isCursorVariant,
  READING_VARIANTS,
  tokenizeReadingText,
  type ReadingVariant,
} from './readingVariants';

/**
 * A scroll bench for the narrative pane.
 *
 * Each step keeps the report's 100svh rhythm, so its copy is centred exactly
 * when its ScrollTrigger would fire in `DetailView`. The read window starts a
 * quarter of the viewport before that moment (`READ_WINDOW_START`) and finishes
 * a quarter of the viewport after it (`READ_WINDOW_END`): the trigger sits at
 * the midpoint of the sweep.
 *
 * Both edges are fractions of the viewport, measured against the step's centre.
 * That makes this bench independent of the actual triggers: the same numbers
 * can be fed to a GSAP ScrollTrigger with `start: 'center 75%'` and
 * `end: 'center 25%'`.
 */
const READ_WINDOW_START = 0.75;
const READ_WINDOW_END = 0.25;
/** Pinned runway per word: the reading head's scroll budget. */
const PINNED_PX_PER_WORD = 44;

interface LabStep {
  id: string;
  text: string;
}

const LAB_STEPS: readonly LabStep[] = [
  {
    id: '01',
    text: `Here lies every single workfile I’ve created across five years of undergraduate courses. In total there are 567 files, each one a cube in this 3D space, and each one an assignment, a report, or a piece of code. Hover over a cube to take a glance at what it holds.`,
  },
  {
    id: '02',
    text: `Watch as the cubes reorganize themselves by academic term, Fall 2021 through Winter 2026, eight semesters in all. The room fills, empties, and fills again, and what looked like a cloud becomes a calendar of deadlines.`,
  },
  {
    id: '03',
    text: `Now the cubes take on the colors of their courses. Thirty-four distinct courses, from first-year calculus to a final capstone, and each hue is a different way of thinking. Some colors dominate a term; others appear for a single week and never return.`,
  },
  {
    id: '04',
    text: `The cubes rise from the plane. Height now encodes version count, so a tall tower marks an assignment revised dozens of times. A low cube was written once, submitted, and left alone. Together they describe effort as much as output.`,
  },
  {
    id: '05',
    text: `Finally, the cubes spread into a true calendar. Each cell is a day, and its warmth shows how many files were born that day. Empty spaces are the gaps: weekends, holidays, the quiet days between bursts of creation.`,
  },
  {
    id: '06',
    text: `What remains is not a ranking of productivity but a portrait of time spent. The bright days are not better than the quiet ones. They are simply the moments when something needed to exist, and did.`,
  },
];

export default function NarrativeLab({
  initialVariant = 'bar',
}: {
  initialVariant?: ReadingVariant;
}) {
  const [variant, setVariant] = useState<ReadingVariant>(initialVariant);
  const [showGuides, setShowGuides] = useState(true);
  const [smooth, setSmooth] = useState(true);
  const [pinned, setPinned] = useState(true);
  const [readCounts, setReadCounts] = useState<number[]>(() =>
    LAB_STEPS.map(() => 0),
  );
  const [activeStep, setActiveStep] = useState(0);

  const stepEls = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const tokenCounts = useMemo(
    () => LAB_STEPS.map((step) => tokenizeReadingText(step.text).length),
    [],
  );

  const activeVariant =
    READING_VARIANTS.find((item) => item.id === variant) ??
    READING_VARIANTS[0];

  /**
   * One rAF-throttled pass over the six steps. A step's read count is derived
   * from where its centre sits between the two guide lines; the state only
   * changes when a word boundary is crossed, so scrolling does not re-render
   * the paint on every frame.
   */
  const sync = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const startY = viewportHeight * READ_WINDOW_START;
    const endY = viewportHeight * READ_WINDOW_END;
    const span = Math.max(startY - endY, 1);

    let nearestStep = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    let coverStep = -1;
    const nextCounts = stepEls.current.map((element, index) => {
      if (!element) return 0;

      const rect = element.getBoundingClientRect();
      const centreY = rect.top + rect.height / 2;
      const distanceToCentre = Math.abs(centreY - viewportHeight / 2);
      if (distanceToCentre < nearestDistance) {
        nearestDistance = distanceToCentre;
        nearestStep = index;
      }

      if (pinned) {
        // Pinned stage: the section's sticky travel is the runway. Progress is
        // the scroll distance into that travel, so the copy stays still while
        // the head moves.
        const runway = Math.max(rect.height - viewportHeight, 1);
        const progress = Math.min(1, Math.max(0, -rect.top / runway));
        if (
          rect.top <= viewportHeight / 2 &&
          rect.bottom >= viewportHeight / 2
        ) {
          coverStep = index;
        }
        return Math.round(progress * (tokenCounts[index] ?? 0));
      }

      const progress = Math.min(1, Math.max(0, (startY - centreY) / span));
      return Math.round(progress * (tokenCounts[index] ?? 0));
    });

    setActiveStep((previous) => {
      const next = pinned && coverStep >= 0 ? coverStep : nearestStep;
      return previous === next ? previous : next;
    });
    setReadCounts((previous) =>
      previous.length === nextCounts.length &&
      previous.every((count, index) => count === nextCounts[index])
        ? previous
        : nextCounts,
    );
  }, [pinned, tokenCounts]);

  useEffect(() => {
    const schedule = () => {
      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        sync();
      });
    };

    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    // Webfonts change line breaks, and therefore the geometry the paint reads.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) sync();
    });
    const settle = window.setTimeout(sync, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(settle);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [sync]);

  const togglePinned = useCallback(() => {
    const step = activeStep;
    const current = document.getElementById(`lab-step-${step + 1}`);
    const rect = current?.getBoundingClientRect();
    const restore = !!rect && rect.top < window.innerHeight && rect.bottom > 0;
    setPinned((value) => !value);
    if (!restore) return;
    // The section/article anchor swaps between modes and the page length
    // changes; keep the reader on the same substep.
    window.setTimeout(() => {
      const element = document.getElementById(`lab-step-${step + 1}`);
      element?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 80);
  }, [activeStep]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      const index = event.key === '0' ? 10 : Number(event.key);
      if (Number.isInteger(index) && index >= 1 && index <= READING_VARIANTS.length) {
        setVariant(READING_VARIANTS[index - 1].id);
        return;
      }
      if (event.key.toLowerCase() === 'g') {
        setShowGuides((visible) => !visible);
        return;
      }
      if (event.key.toLowerCase() === 's') {
        setSmooth((value) => !value);
        return;
      }
      if (event.key.toLowerCase() === 'p') {
        togglePinned();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePinned]);

  const jumpToStep = useCallback((index: number) => {
    const element = document.getElementById(`lab-step-${index + 1}`);
    if (!element) return;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    element.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="mr-auto flex items-baseline gap-2.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-brand">
                Narrative Lab
              </span>
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-text-secondary sm:inline">
                Reading progress
              </span>
            </div>

            <div
              className="flex flex-wrap items-center gap-px sm:gap-1"
              role="group"
              aria-label="Reading progress mechanism"
            >
              {READING_VARIANTS.map((item) => {
                const selected = item.id === variant;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVariant(item.id)}
                    aria-pressed={selected}
                    title={item.description}
                    className={`flex items-baseline gap-1.5 rounded-sm border px-1 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors sm:px-2 sm:tracking-[0.12em] ${
                      selected
                        ? 'border-brand bg-brand text-white'
                        : 'border-stone-300 text-text-secondary hover:border-brand hover:text-brand'
                    }`}
                  >
                    <span
                      className={`hidden tabular-nums sm:inline ${
                        selected ? 'opacity-60' : 'opacity-40'
                      }`}
                    >
                      {item.index}
                    </span>
                    {item.short}
                  </button>
                );
              })}
            </div>

            {!pinned && (
              <button
                type="button"
                onClick={() => setShowGuides((visible) => !visible)}
                aria-pressed={showGuides}
                className={`hidden rounded-sm border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors md:inline-block ${
                  showGuides
                    ? 'border-brand/40 text-brand'
                    : 'border-stone-300 text-text-secondary hover:border-brand hover:text-brand'
                }`}
              >
                Guides
              </button>
            )}

            <button
              type="button"
              onClick={() => setSmooth((value) => !value)}
              aria-pressed={smooth}
              title="Smooth word-block follower (04)"
              className={`hidden rounded-sm border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors md:inline-block ${
                smooth
                  ? 'border-brand/40 text-brand'
                  : 'border-stone-300 text-text-secondary hover:border-brand hover:text-brand'
              }`}
            >
              Smooth
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-text-primary">
              {activeVariant.index} · {activeVariant.label}
            </span>
            <span
              className="hidden max-w-[34rem] truncate font-mono text-[10px] tracking-[0.02em] text-text-secondary lg:block"
              title={activeVariant.description}
            >
              {activeVariant.description}
            </span>
            <div
              className="ml-auto flex min-w-[11rem] flex-1 items-center gap-1.5 sm:max-w-[22rem]"
              aria-hidden
            >
              {LAB_STEPS.map((step, index) => {
                const total = tokenCounts[index] || 1;
                const read = readCounts[index] ?? 0;
                const percent = Math.min(100, Math.round((read / total) * 100));
                return (
                  <span
                    key={step.id}
                    className="relative block h-[3px] flex-1 overflow-hidden rounded-full bg-stone-200"
                  >
                    <span
                      className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-150 ${
                        index === activeStep ? 'bg-brand' : 'bg-brand/40'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={pinned}
              title="Pin the copy and give every word a scroll runway"
              className={`hidden rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors md:inline-block ${
                pinned
                  ? 'border-brand/40 text-brand'
                  : 'border-stone-300 text-text-secondary hover:border-brand hover:text-brand'
              }`}
            >
              Pinned
            </button>

            <span className="hidden whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary md:inline">
              {pinned
                ? `Pinned · ${PINNED_PX_PER_WORD}px / word`
                : `Window ${Math.round(READ_WINDOW_START * 100)}vh → ${Math.round(READ_WINDOW_END * 100)}vh`}
            </span>
          </div>
        </div>
      </header>

      {showGuides && !pinned && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-30 hidden md:block"
        >
          <div
            className="absolute inset-x-0 flex items-center gap-3 -translate-y-1/2"
            style={{ top: `${READ_WINDOW_START * 100}vh` }}
          >
            <span className="ml-3 shrink-0 rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brand/60">
              Read start · {Math.round(READ_WINDOW_START * 100)}vh
            </span>
            <span className="h-px flex-1 border-t border-dashed border-brand/25" />
          </div>
          <div
            className="absolute inset-x-0 flex items-center gap-3 -translate-y-1/2"
            style={{ top: `${READ_WINDOW_END * 100}vh` }}
          >
            <span className="ml-3 shrink-0 rounded-sm bg-background/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-brand/60">
              Read end · {Math.round(READ_WINDOW_END * 100)}vh
            </span>
            <span className="h-px flex-1 bg-brand/20" />
          </div>
        </div>
      )}

      <main>
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-[24vh] pt-[14vh] text-center">
          <p className="t-kicker t-kicker--accent">
            <span className="t-kicker__rule" />
            <span className="t-kicker__text">Narrative Lab</span>
          </p>
          <h1 className="t-masthead mt-6">Reading, in motion</h1>
          <p className="t-deck mt-6 max-w-[38rem]">
            Ten ways to show a substep being read while it scrolls.{' '}
            {pinned
              ? `Each substep pins its copy and gives every word ${PINNED_PX_PER_WORD}px of scroll; the head advances while the text stays still.`
              : 'Each mechanism uses the 75vh → 25vh window: progress starts before the trigger and finishes after it.'}
          </p>

          <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-sm border border-stone-200 bg-stone-200 sm:grid-cols-2">
            {READING_VARIANTS.map((item, index) => {
              const selected = item.id === variant;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVariant(item.id)}
                  aria-pressed={selected}
                  className={`flex flex-col items-start gap-1 px-4 py-3 text-left transition-colors ${
                    READING_VARIANTS.length % 2 === 1 &&
                    index === READING_VARIANTS.length - 1
                      ? 'sm:col-span-2'
                      : ''
                  } ${
                    selected
                      ? 'bg-brand-50'
                      : 'bg-surface hover:bg-brand-50/60'
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                      selected ? 'text-brand' : 'text-text-secondary'
                    }`}
                  >
                    {item.index} · {item.label}
                  </span>
                  <span className="text-[13px] leading-snug text-text-secondary">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-6 max-w-[38rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-text-secondary">
            Scroll slowly — the sweep ticks once per word.
            <span className="hidden md:inline">
              {' '}
              Keys 1–9 · 0 = 10; S smooth · P pin
              {!pinned ? ' · G guides' : ''}.
            </span>
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            {LAB_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => jumpToStep(index)}
                aria-label={`Jump to substep ${step.id}`}
                className="rounded-sm border border-stone-300 px-2.5 py-1 font-mono text-[10px] tabular-nums tracking-[0.12em] text-text-secondary transition-colors hover:border-brand hover:text-brand"
              >
                {step.id}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia(
                    '(prefers-reduced-motion: reduce)',
                  ).matches
                    ? 'auto'
                    : 'smooth',
                })
              }
              className="rounded-sm px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary transition-colors hover:text-brand"
            >
              Top
            </button>
          </div>
        </section>

        {LAB_STEPS.map((step, index) => {
          const total = tokenCounts[index] || 0;
          const read = Math.min(readCounts[index] ?? 0, total);
          const percent = total > 0 ? Math.round((read / total) * 100) : 0;
          const isActive = index === activeStep;

          const runway = Math.max(total * PINNED_PX_PER_WORD, 240);
          const anchorId = `lab-step-${index + 1}`;

          return (
            <section
              key={step.id}
              id={pinned ? anchorId : undefined}
              ref={(element) => {
                stepEls.current[index] = element;
              }}
              className="relative"
              style={
                pinned
                  ? { height: `calc(100dvh + ${runway}px)` }
                  : undefined
              }
            >
              <div
                className={
                  pinned
                    ? 'sticky top-0 flex h-dvh items-center justify-center px-6'
                    : 'flex min-h-svh items-center justify-center px-6 py-20'
                }
              >
                <article
                  id={pinned ? undefined : anchorId}
                  className="w-full max-w-[27rem]"
                  style={{ scrollMarginTop: pinned ? '0px' : '50vh' }}
                >
                <div className="mb-5 flex items-baseline justify-between border-b border-stone-200 pb-2 font-mono text-[10px] uppercase tracking-[0.2em]">
                  <span className={isActive ? 'text-brand' : 'text-text-secondary'}>
                    Substep {step.id}
                  </span>
                  <span className="tabular-nums text-text-secondary">
                    {percent}%{' '}
                    {smooth && variant === 'word-block' ? 'target' : 'read'}
                  </span>
                </div>

                <ReadingProgressText
                  text={step.text}
                  readCount={read}
                  variant={variant}
                  smooth={smooth}
                />

                <div className="mt-8 flex items-center gap-3" aria-hidden>
                  <span className="relative block h-px flex-1 bg-stone-200">
                    <span
                      className="absolute inset-y-0 left-0 bg-brand transition-[width] duration-150"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap font-mono text-[10px] tabular-nums tracking-[0.06em] text-text-secondary">
                    {read} / {total} words
                  </span>
                </div>

                <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-text-secondary/60">
                  {isCursorVariant(variant)
                    ? 'Read ink 100% · unread ink 26%'
                    : variant === 'reverse'
                      ? 'Read: kraft reverse · current: red band'
                      : variant === 'rising-current'
                        ? 'Read: kraft rise · current: coral rise'
                        : 'Ink constant · progress carried by the mark'}
                </p>
                </article>
              </div>
            </section>
          );
        })}

        <div className="h-[55vh]" aria-hidden />
      </main>
    </div>
  );
}
