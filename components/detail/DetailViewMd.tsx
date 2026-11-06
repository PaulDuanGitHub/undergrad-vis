'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import Act1Visual from '@/components/detail/acts/Act1/Act1Visual';
import Act2Visual from '@/components/detail/acts/Act2/Act2Visual';
import Act3Visual from '@/components/detail/acts/Act3/Act3Visual';
import Act1NarrativeMd from '@/components/detail/acts/Act1/Act1NarrativeMd';
import Act2NarrativeMd from '@/components/detail/acts/Act2/Act2NarrativeMd';
import Act3NarrativeMd from '@/components/detail/acts/Act3/Act3NarrativeMd';
import Footer from '@/components/detail/Footer';
import { useThemeVariable } from '@/hooks/useThemeVariable';
import { useContainerDim } from '@/hooks/useContainerDim';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// ── Constants ──
const TOTAL_ACTS = 3;
const ACT_MAX_STEPS: Record<number, number> = { 1: 5, 2: 4, 3: 4 };
const TOTAL_STEPS = Object.values(ACT_MAX_STEPS).reduce((a, b) => a + b, 0);
const PULL_THRESHOLD = 120;
const SWIPE_NAV_THRESHOLD = 60;
const PULL_RADIUS = 16;
const PULL_CIRCUMFERENCE = 2 * Math.PI * PULL_RADIUS;

const NARRATIVE_COMPONENTS = {
  1: Act1NarrativeMd,
  2: Act2NarrativeMd,
  3: Act3NarrativeMd,
} as const;

// ── GSAP helper (same logic as DetailView) ──
function animateActTransition(
  charts: HTMLElement[],
  activeIndex: number,
  direction: 'forward' | 'backward',
  /** Reduced motion: land on the final state with no tween. */
  instant = false,
) {
  const slideY = instant ? 0 : direction === 'forward' ? -20 : 20;
  if (!charts[activeIndex]) return;
  // Idempotent for fast switching: kill what's in flight and only fade the
  // NON-active charts out (see the note in DetailView).
  gsap.killTweensOf(charts);
  gsap.set(charts, { pointerEvents: 'none' });
  gsap.set(charts[activeIndex], { pointerEvents: 'auto' });
  if (instant) {
    charts.forEach((chart, i) => {
      gsap.set(chart, { opacity: i === activeIndex ? 1 : 0, y: 0 });
    });
    return;
  }
  charts.forEach((chart, i) => {
    if (i !== activeIndex) gsap.to(chart, { opacity: 0, y: slideY, duration: 0.3 });
  });
  gsap.to(charts[activeIndex], {
    opacity: 1,
    y: 0,
    duration: 0.5,
    delay: 0.18,
    ease: 'power2.out',
  });
}

// ── Props ──
interface DetailViewMdProps {
  isDetailVisible: boolean;
  /** `#actN` deep link: the act the story should open on (null = act 1). */
  initialAct?: 1 | 2 | 3 | null;
  onExit: () => void;
}

export default function DetailViewMd({ isDetailVisible, initialAct = null, onExit }: DetailViewMdProps) {
  // Measure the visual pane so the charts can use its actual height instead of
  // a width-derived aspect ratio (which only used ~46% of a phone screen).
  const { ref: visualRef, height: visualHeight } = useContainerDim<HTMLDivElement>(390);
  const prevActRef = useRef(1);

  const colorBrand = useThemeVariable('--color-brand');
  const reducedMotion = useReducedMotion();

  // ── State ──
  const [activeAct, setActiveAct] = useState(1);
  const [act1Step, setAct1Step] = useState(0);
  const [act2Step, setAct2Step] = useState(0);
  const [act3Step, setAct3Step] = useState(0);
  const [showFooter, setShowFooter] = useState(false);

  const currentStep =
    activeAct === 1 ? act1Step : activeAct === 2 ? act2Step : act3Step;
  const maxStep = ACT_MAX_STEPS[activeAct];

  // Global step index for progress display
  const globalStep =
    activeAct === 1
      ? act1Step
      : activeAct === 2
        ? ACT_MAX_STEPS[1] + act2Step
        : ACT_MAX_STEPS[1] + ACT_MAX_STEPS[2] + act3Step;

  const setStepForAct = useCallback(
    (act: number, step: number) => {
      if (act === 1) setAct1Step(step);
      else if (act === 2) setAct2Step(step);
      else setAct3Step(step);
    },
    [],
  );

  // ── Initialize chart layers ──
  useEffect(() => {
    const charts = gsap.utils.toArray<HTMLElement>(
      '.chart-layer',
      visualRef.current,
    );
    gsap.set(charts.slice(1), { opacity: 0, y: reducedMotion ? 0 : 20, pointerEvents: 'none' });
  }, [visualRef, reducedMotion]);

  // ── Act change → animate charts ──
  useEffect(() => {
    const prev = prevActRef.current;
    if (prev === activeAct) return;
    prevActRef.current = activeAct;

    const charts = gsap.utils.toArray<HTMLElement>(
      '.chart-layer',
      visualRef.current,
    );
    const dir = activeAct > prev ? 'forward' : 'backward';
    animateActTransition(charts, activeAct - 1, dir, reducedMotion);
  }, [activeAct, visualRef, reducedMotion]);

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (showFooter) return;
    if (currentStep < maxStep - 1) {
      setStepForAct(activeAct, currentStep + 1);
    } else if (activeAct < TOTAL_ACTS) {
      setActiveAct(activeAct + 1);
      setStepForAct(activeAct + 1, 0);
    } else {
      // Last step of last act → show footer
      setShowFooter(true);
    }
  }, [activeAct, currentStep, maxStep, setStepForAct, showFooter]);

  const goPrev = useCallback(() => {
    if (showFooter) {
      setShowFooter(false);
      return;
    }
    if (currentStep > 0) {
      setStepForAct(activeAct, currentStep - 1);
    } else if (activeAct > 1) {
      const prev = activeAct - 1;
      setActiveAct(prev);
      setStepForAct(prev, ACT_MAX_STEPS[prev] - 1);
    }
  }, [activeAct, currentStep, setStepForAct, showFooter]);

  const canGoNext = !showFooter;
  const canGoPrev = showFooter || !(activeAct === 1 && currentStep === 0);

  const narrativeRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // ── Pull-to-exit ──
  // The progress ring is written straight to the DOM: a per-frame setState here
  // would re-render Act1's canvas and Act2's hundreds of SVG nodes while the
  // finger is moving.
  const pullRef = useRef(0);
  const pullIndicatorRef = useRef<HTMLDivElement>(null);
  const pullRingRef = useRef<SVGCircleElement>(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const swipeHandledRef = useRef(false);
  const navTouchRef = useRef({ x: 0, y: 0 });

  const applyPull = useCallback((value: number) => {
    pullRef.current = value;
    const fill = Math.min(value / PULL_THRESHOLD, 1);
    if (pullIndicatorRef.current) {
      pullIndicatorRef.current.style.opacity = value > 0 ? '1' : '0';
      pullIndicatorRef.current.style.transform = `translate(-50%, ${Math.min(value / 8, 16)}px)`;
    }
    if (pullRingRef.current) {
      pullRingRef.current.style.strokeDashoffset = String(
        PULL_CIRCUMFERENCE - fill * PULL_CIRCUMFERENCE,
      );
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeHandledRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (swipeHandledRef.current) return;
      const dx = touchStartRef.current.x - e.touches[0].clientX;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      // Horizontal swipe dominates → navigation
      if (absDx > absDy && absDx > SWIPE_NAV_THRESHOLD) {
        swipeHandledRef.current = true;
        applyPull(0);
        if (dx > 0 && canGoNext) {
          goNext();
        } else if (dx < 0 && canGoPrev) {
          goPrev();
        }
        return;
      }

      // Vertical swipe dominates → pull-to-exit
      if (dy > 0 && absDy > absDx) {
        applyPull(dy);
        if (dy >= PULL_THRESHOLD) {
          onExit();
          applyPull(0);
          swipeHandledRef.current = true;
        }
      }
    },
    [applyPull, goNext, goPrev, canGoNext, canGoPrev, onExit],
  );

  const handleTouchEnd = useCallback(() => {
    applyPull(0);
    swipeHandledRef.current = false;
  }, [applyPull]);

  // Horizontal swipe over the narrative works too; vertical stays native scroll.
  const handleNarrativeTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    navTouchRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const handleNarrativeTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = navTouchRef.current.x - t.clientX;
      const dy = navTouchRef.current.y - t.clientY;
      if (Math.abs(dx) > SWIPE_NAV_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0 && canGoNext) {
          goNext();
        } else if (dx < 0 && canGoPrev) {
          goPrev();
        }
      }
    },
    [goNext, goPrev, canGoNext, canGoPrev],
  );

  // Opening the panel always starts a fresh run; closing it keeps nothing that
  // would strand the next visit on the footer or mid-step.
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot reset on the
     open transition; it cannot loop because it only runs when the prop flips */
  useEffect(() => {
    if (!isDetailVisible) return;
    const startAct = initialAct ?? 1;
    // Seed `prevAct` too, so opening straight into act 2 or 3 does not play act
    // 1's chart fade as an entry animation.
    prevActRef.current = startAct;
    setActiveAct(startAct);
    setAct1Step(0);
    setAct2Step(0);
    setAct3Step(0);
    setShowFooter(false);
    applyPull(0);
    if (narrativeRef.current) narrativeRef.current.scrollTop = 0;
    rootRef.current?.focus({ preventScroll: true });
  }, [isDetailVisible, initialAct, applyPull]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Never inherit the previous substep's scroll offset: the pane is only
  // ~140-240px tall on phones, so a carried offset hides the start of the copy.
  useEffect(() => {
    if (narrativeRef.current) narrativeRef.current.scrollTop = 0;
  }, [activeAct, act1Step, act2Step, act3Step, showFooter]);

  // ── Keyboard ──
  // The phone layout has no scrolling to step through, so the arrow keys drive
  // the steps directly: ↓/→/PageDown forward, ↑/←/PageUp back, Home to the
  // first step, End to the last one. Esc is handled globally in Landing.
  useEffect(() => {
    if (!isDetailVisible) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          goPrev();
          break;
        case 'Home':
          e.preventDefault();
          setShowFooter(false);
          setActiveAct(1);
          setAct1Step(0);
          break;
        case 'End':
          e.preventDefault();
          setShowFooter(false);
          setActiveAct(TOTAL_ACTS);
          setStepForAct(TOTAL_ACTS, ACT_MAX_STEPS[TOTAL_ACTS] - 1);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDetailVisible, goNext, goPrev, setStepForAct]);

  // ── Narrative component ──
  const NarrativeComponent = NARRATIVE_COMPONENTS[
    activeAct as keyof typeof NARRATIVE_COMPONENTS
  ];

  return (
    <div
      ref={rootRef}
      role="region"
      aria-label="Data story"
      aria-hidden={!isDetailVisible}
      inert={!isDetailVisible}
      tabIndex={-1}
      data-report
      className={`fixed inset-0 z-0 flex flex-col overflow-hidden bg-surface transition-opacity duration-1000 ${
        isDetailVisible
          ? 'opacity-100 pointer-events-auto z-10'
          : 'opacity-0 pointer-events-none'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* ── Pull-to-exit indicator ── */}
      <div
        ref={pullIndicatorRef}
        className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 z-50 flex flex-col items-center pointer-events-none transition-all duration-300"
        style={{ opacity: 0, transform: 'translate(-50%, 0px)' }}
      >
        <svg width="40" height="40" className="transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={PULL_RADIUS}
            stroke="#e5e7eb"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            ref={pullRingRef}
            cx="20"
            cy="20"
            r={PULL_RADIUS}
            stroke={colorBrand}
            strokeWidth="3"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={PULL_CIRCUMFERENCE}
            strokeDashoffset={PULL_CIRCUMFERENCE}
            className="transition-all duration-150 ease-out"
          />
        </svg>
      </div>

      {/* ── Visual Area (fills the height left by the narrative pane) ── */}
      <div
        ref={visualRef}
        className="relative flex-1 min-h-0 w-full flex items-center justify-center border-b border-slate-100 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-touch-lock
      >
        <div className="chart-layer absolute inset-0 flex items-center justify-center">
          <Act1Visual step={act1Step} isActive={activeAct === 1} compact visible={isDetailVisible} />
        </div>
        <div className="chart-layer absolute inset-0 flex items-center justify-center">
          <Act2Visual isActive={activeAct === 2} step={act2Step} compact availableHeight={visualHeight} />
        </div>
        <div className="chart-layer absolute inset-0 flex items-center justify-center">
          <Act3Visual isActive={activeAct === 3} step={act3Step} compact availableHeight={visualHeight} />
        </div>
      </div>

      {/* ── Narrative Area (35dvh, at least 180px) ── */}
      <div
        className="h-[35vh] min-h-[180px] w-full shrink-0 flex flex-col bg-surface"
        style={{ height: '35dvh' }}
        onTouchStart={handleNarrativeTouchStart}
        onTouchEnd={handleNarrativeTouchEnd}
      >
        {/* Navigation bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-default transition-colors"
            aria-label="Previous step"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>

          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="hidden min-[380px]:flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    i === globalStep ? 'bg-brand' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-text-secondary tracking-[0.18em] font-mono tabular-nums">
              {globalStep + 1}/{TOTAL_STEPS}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-default transition-colors"
              aria-label="Next step"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>

            <button
              onClick={onExit}
              className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-brand hover:text-brand transition-colors"
              aria-label="Close details"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Narrative text or Footer */}
        <div ref={narrativeRef} className="flex-1 overflow-y-auto overscroll-contain px-6 pb-4 select-text" aria-live="polite">
          {showFooter ? (
            <div className="pt-8">
              <Footer onExit={onExit} compact />
            </div>
          ) : (
            <NarrativeComponent step={currentStep} />
          )}
        </div>
      </div>
    </div>
  );
}
