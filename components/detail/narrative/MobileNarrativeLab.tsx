'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReadingProgressText from './ReadingProgress';
import { LAB_STEPS } from './NarrativeLab';
import {
  isCursorVariant,
  READING_VARIANTS,
  tokenizeReadingText,
  type ReadingVariant,
} from './readingVariants';

/** Mobile pinned runway. Shorter than the desktop bench's 44px/word. */
const MOBILE_PX_PER_WORD = 22;

/**
 * Mobile bench for the narrative pane.
 *
 * Same six substeps and ten reading mechanisms as `/narrative-lab`, but the
 * progress UI is deliberately different: instead of six per-step bars, this
 * bench has one continuous word-based rail. The fill is total read words /
 * total words; the six notches mark each substep's token boundary; tapping a
 * notch jumps to that substep.
 */
export default function MobileNarrativeLab({
  initialVariant = 'bar',
}: {
  initialVariant?: ReadingVariant;
}) {
  const [variant, setVariant] = useState<ReadingVariant>(initialVariant);
  const [pinned, setPinned] = useState(true);
  const [smooth, setSmooth] = useState(true);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [readCounts, setReadCounts] = useState<number[]>(() =>
    LAB_STEPS.map(() => 0),
  );
  const [activeStep, setActiveStep] = useState(0);

  const stepEls = useRef<(HTMLElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const tokenCounts = useMemo(
    () => LAB_STEPS.map((step) => tokenizeReadingText(step.text).length),
    [],
  );
  const totalTokens = useMemo(
    () => tokenCounts.reduce((sum, count) => sum + count, 0),
    [tokenCounts],
  );
  const readTokens = useMemo(
    () => readCounts.reduce((sum, count) => sum + count, 0),
    [readCounts],
  );
  const overall = totalTokens > 0 ? Math.min(1, readTokens / totalTokens) : 0;

  /** Start of each step as a fraction of the whole word count. */
  const boundaries = useMemo(() => {
    let cursor = 0;
    return tokenCounts.map((count) => {
      const start = totalTokens > 0 ? cursor / totalTokens : 0;
      cursor += count;
      return start;
    });
  }, [tokenCounts, totalTokens]);

  const activeVariant =
    READING_VARIANTS.find((item) => item.id === variant) ??
    READING_VARIANTS[0];

  const sync = useCallback(() => {
    const viewportHeight = window.innerHeight;
    const startY = viewportHeight * 0.75;
    const endY = viewportHeight * 0.25;
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

  const jumpToStep = useCallback((index: number) => {
    const element = document.getElementById(`mobile-lab-step-${index + 1}`);
    if (!element) return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    element.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const togglePinned = useCallback(() => {
    const step = activeStep;
    setPinned((value) => !value);
    window.setTimeout(() => {
      document
        .getElementById(`mobile-lab-step-${step + 1}`)
        ?.scrollIntoView({ behavior: 'auto', block: 'start' });
    }, 80);
  }, [activeStep]);

  const seek = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rail = railRef.current;
      if (!rail) return;
      const rect = rail.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width),
      );
      const target = ratio * totalTokens;
      let targetStep = 0;
      boundaries.forEach((start, index) => {
        if (target >= start * totalTokens) targetStep = index;
      });
      jumpToStep(targetStep);
    },
    [boundaries, jumpToStep, totalTokens],
  );

  const currentStep = Math.min(activeStep, LAB_STEPS.length - 1);
  const currentTotal = tokenCounts[currentStep] || 1;
  const currentRead = Math.min(readCounts[currentStep] ?? 0, currentTotal);
  const currentPercent = Math.round((currentRead / currentTotal) * 100);

  return (
    <div data-mobile-lab className="min-h-dvh bg-background pb-[calc(9rem+env(safe-area-inset-bottom))] text-text-primary">
      <header
        className="fixed inset-x-0 top-0 z-40 border-b border-stone-200/80 bg-background/92 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-brand">
              Narrative Lab
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-text-secondary">
              Mobile
            </span>
          </div>
          <button
            type="button"
            onClick={() => setVariantsOpen(true)}
            className="rounded-sm border border-stone-300 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-secondary transition-colors hover:border-brand hover:text-brand"
          >
            {activeVariant.index} · {activeVariant.short}
          </button>
        </div>
      </header>

      <main className="pt-[4.5rem]">
        <section className="px-5 pb-20 pt-12 text-center">
          <p className="t-kicker t-kicker--accent">
            <span className="t-kicker__rule" />
            <span className="t-kicker__text">Mobile bench</span>
          </p>
          <h1 className="t-masthead mt-5">Reading, in motion</h1>
          <p className="t-deck mt-5">
            One continuous word-based rail instead of six step bars. The fill is
            total read words; the six notches are the substep boundaries.
          </p>
          <p className="mt-6 font-mono text-[10px] uppercase leading-relaxed tracking-[0.18em] text-text-secondary">
            Scroll slowly — the rail fills word by word.
            <br />
            Tap a notch to jump.
          </p>
        </section>

        {LAB_STEPS.map((step, index) => {
          const total = tokenCounts[index] || 1;
          const read = Math.min(readCounts[index] ?? 0, total);
          const percent = Math.round((read / total) * 100);
          const isActive = index === activeStep;
          const runway = Math.max(total * MOBILE_PX_PER_WORD, 240);

          return (
            <section
              key={step.id}
              id={`mobile-lab-step-${index + 1}`}
              ref={(element) => {
                stepEls.current[index] = element;
              }}
              className="relative"
              style={pinned ? { height: `calc(100dvh + ${runway}px)` } : undefined}
            >
              <div
                className={
                  pinned
                    ? 'sticky top-0 flex h-dvh items-center justify-center px-5'
                    : 'flex min-h-svh items-center justify-center px-5 py-24'
                }
              >
                <article className="w-full max-w-[26rem]">
                  <div className="mb-5 flex items-baseline justify-between border-b border-stone-200 pb-2 font-mono text-[10px] uppercase tracking-[0.2em]">
                    <span
                      className={
                        isActive ? 'text-brand' : 'text-text-secondary'
                      }
                    >
                      Substep {step.id}
                    </span>
                    <span className="tabular-nums text-text-secondary">
                      {percent}% read
                    </span>
                  </div>

                  <ReadingProgressText
                    text={step.text}
                    readCount={read}
                    variant={variant}
                    smooth={smooth}
                  />

                  <div className="mt-7 flex items-center gap-3" aria-hidden>
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

                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-text-secondary/60">
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

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200/80 bg-surface/95 px-4 pt-2.5 backdrop-blur-md"
        style={{ paddingBottom: 'calc(0.65rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-text-secondary">
          <span>
            Step {String(currentStep + 1).padStart(2, '0')} /{' '}
            {String(LAB_STEPS.length).padStart(2, '0')}
          </span>
          <span className="tabular-nums">
            {readTokens.toLocaleString()} / {totalTokens.toLocaleString()} words
            · {Math.round(overall * 100)}%
          </span>
        </div>

        <div
          ref={railRef}
          role="slider"
          aria-label="Narrative lab progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(overall * 100)}
          tabIndex={0}
          onPointerDown={seek}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') jumpToStep(Math.min(LAB_STEPS.length - 1, activeStep + 1));
            if (event.key === 'ArrowLeft') jumpToStep(Math.max(0, activeStep - 1));
          }}
          className="relative mt-2 h-8 touch-none select-none"
        >
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-150"
              style={{ width: `${overall * 100}%` }}
            />
          </div>

          {boundaries.map((start, index) => (
            <span
              key={LAB_STEPS[index].id}
              className={`absolute top-1/2 h-3 w-px -translate-y-1/2 ${
                index <= activeStep ? 'bg-brand/70' : 'bg-stone-300'
              }`}
              style={{ left: `${start * 100}%` }}
            />
          ))}

          <span
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-brand shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            style={{ left: `${overall * 100}%` }}
          />
        </div>

        <div className="mt-0.5 flex justify-between">
          {LAB_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => jumpToStep(index)}
              aria-label={`Jump to substep ${step.id}`}
              className={`font-mono text-[9px] tabular-nums tracking-[0.1em] transition-colors ${
                index === activeStep
                  ? 'text-brand'
                  : 'text-text-secondary/60 hover:text-brand'
              }`}
            >
              {step.id}
            </button>
          ))}
        </div>

        <div className="mt-1.5 flex items-center justify-between border-t border-stone-200/70 pt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-text-secondary">
          <span>
            {activeVariant.index} · {activeVariant.short}
          </span>
          <span className="tabular-nums">
            {currentPercent}% · {pinned ? `${MOBILE_PX_PER_WORD}px / word` : 'window'}
          </span>
        </div>
      </div>

      {variantsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/25"
          onClick={() => setVariantsOpen(false)}
        >
          <div
            className="max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-text-secondary">
                  Reading mechanism
                </p>
                <p className="mt-1 font-serif text-[20px] leading-tight">
                  {activeVariant.index} · {activeVariant.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariantsOpen(false)}
                aria-label="Close variants"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 text-text-secondary"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-stone-200 bg-stone-200">
              {READING_VARIANTS.map((item) => {
                const selected = item.id === variant;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setVariant(item.id);
                      setVariantsOpen(false);
                    }}
                    className={`flex items-start justify-between gap-3 px-3 py-2.5 text-left ${
                      selected ? 'bg-brand-50' : 'bg-surface'
                    }`}
                  >
                    <span>
                      <span
                        className={`block font-mono text-[9px] uppercase tracking-[0.16em] ${
                          selected ? 'text-brand' : 'text-text-secondary'
                        }`}
                      >
                        {item.index} · {item.short}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-text-secondary">
                        {item.description}
                      </span>
                    </span>
                    {selected && <span className="text-brand">✓</span>}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={togglePinned}
                className={`rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
                  pinned
                    ? 'border-brand bg-brand text-white'
                    : 'border-stone-300 text-text-secondary'
                }`}
              >
                Pinned
              </button>
              <button
                type="button"
                onClick={() => setSmooth((value) => !value)}
                className={`rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
                  smooth
                    ? 'border-brand/50 text-brand'
                    : 'border-stone-300 text-text-secondary'
                }`}
              >
                Smooth
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
