'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import gsap from 'gsap';
import Act1Visual from '@/components/detail/acts/Act1/Act1Visual';
import Act2Visual from '@/components/detail/acts/Act2/Act2Visual';
import Act3Visual from '@/components/detail/acts/Act3/Act3Visual';
import Act1NarrativeMd from '@/components/detail/acts/Act1/Act1NarrativeMd';
import Act2NarrativeMd from '@/components/detail/acts/Act2/Act2NarrativeMd';
import Act3NarrativeMd from '@/components/detail/acts/Act3/Act3NarrativeMd';
import { useThemeVariable } from '@/hooks/useThemeVariable';

// ── Constants ──
const TOTAL_ACTS = 3;
const ACT_MAX_STEPS: Record<number, number> = { 1: 5, 2: 4, 3: 4 };
const TOTAL_STEPS = Object.values(ACT_MAX_STEPS).reduce((a, b) => a + b, 0);

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
) {
  const slideY = direction === 'forward' ? -20 : 20;
  gsap.set(charts, { pointerEvents: 'none' });
  gsap.to(charts, { opacity: 0, y: slideY, duration: 0.5 });
  gsap.set(charts[activeIndex], { pointerEvents: 'auto' });
  gsap.to(charts[activeIndex], {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power2.out',
  });
}

// ── Props ──
interface DetailViewMdProps {
  isDetailVisible: boolean;
  onExit: () => void;
}

export default function DetailViewMd({ isDetailVisible, onExit }: DetailViewMdProps) {
  const visualRef = useRef<HTMLDivElement>(null);
  const prevActRef = useRef(1);

  const colorBrand = useThemeVariable('--color-brand');

  // ── State ──
  const [activeAct, setActiveAct] = useState(1);
  const [act1Step, setAct1Step] = useState(0);
  const [act2Step, setAct2Step] = useState(0);
  const [act3Step, setAct3Step] = useState(0);

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
    gsap.set(charts.slice(1), { opacity: 0, y: 20, pointerEvents: 'none' });
  }, []);

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
    animateActTransition(charts, activeAct - 1, dir);
  }, [activeAct]);

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (currentStep < maxStep - 1) {
      setStepForAct(activeAct, currentStep + 1);
    } else if (activeAct < TOTAL_ACTS) {
      setActiveAct(activeAct + 1);
      setStepForAct(activeAct + 1, 0);
    }
  }, [activeAct, currentStep, maxStep, setStepForAct]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setStepForAct(activeAct, currentStep - 1);
    } else if (activeAct > 1) {
      const prev = activeAct - 1;
      setActiveAct(prev);
      setStepForAct(prev, ACT_MAX_STEPS[prev] - 1);
    }
  }, [activeAct, currentStep, setStepForAct]);

  const canGoNext = !(
    activeAct === TOTAL_ACTS && currentStep >= ACT_MAX_STEPS[TOTAL_ACTS] - 1
  );
  const canGoPrev = !(activeAct === 1 && currentStep === 0);

  // ── Pull-to-exit & horizontal swipe navigation ──
  const [pullProgress, setPullProgress] = useState(0);
  const PULL_THRESHOLD = 120;
  const SWIPE_NAV_THRESHOLD = 60; // min px for horizontal swipe nav
  const touchStartRef = useRef({ x: 0, y: 0 });
  const swipeHandledRef = useRef(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      swipeHandledRef.current = false;
    },
    [],
  );

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
        setPullProgress(0);
        if (dx > 0 && canGoNext) {
          goNext();
        } else if (dx < 0 && canGoPrev) {
          goPrev();
        }
        return;
      }

      // Vertical swipe dominates → pull-to-exit
      if (dy > 0 && absDy > absDx) {
        setPullProgress(dy);
        if (dy >= PULL_THRESHOLD) {
          onExit();
          setPullProgress(0);
          swipeHandledRef.current = true;
        }
      }
    },
    [goNext, goPrev, canGoNext, canGoPrev, onExit],
  );

  const handleTouchEnd = useCallback(() => {
    setPullProgress(0);
    swipeHandledRef.current = false;
  }, []);

  // ── Narrative component ──
  const NarrativeComponent = NARRATIVE_COMPONENTS[
    activeAct as keyof typeof NARRATIVE_COMPONENTS
  ];

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference -
    Math.min(pullProgress / PULL_THRESHOLD, 1) * circumference;

  return (
    <div
      className={`fixed inset-0 z-10 flex flex-col bg-surface transition-opacity duration-1000 ${
        isDetailVisible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* ── Pull-to-exit indicator ── */}
      <div
        className="fixed top-4 left-1/2 z-50 flex flex-col items-center pointer-events-none transition-all duration-300"
        style={{
          opacity: pullProgress > 0 ? 1 : 0,
          transform: `translate(-50%, ${Math.min(pullProgress / 8, 16)}px)`,
        }}
      >
        <svg width="40" height="40" className="transform -rotate-90">
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="3"
            fill="transparent"
          />
          <circle
            cx="20"
            cy="20"
            r={radius}
            stroke={colorBrand}
            strokeWidth="3"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-out"
          />
        </svg>
      </div>

      {/* ── Visual Area (top 65vh) ── */}
      <div
        ref={visualRef}
        className="relative h-[65vh] w-full flex items-center justify-center border-b border-slate-100 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        data-touch-lock
      >
        <div className="chart-layer absolute inset-0 flex items-center justify-center">
          <Act1Visual step={act1Step} />
        </div>
        <div className="chart-layer absolute inset-0 flex items-center justify-center">
          <Act2Visual isActive={activeAct === 2} step={act2Step} compact />
        </div>
        <div className="chart-layer absolute inset-0 flex items-center justify-center">
          <Act3Visual isActive={activeAct === 3} step={act3Step} compact />
        </div>
      </div>

      {/* ── Narrative Area (bottom 35vh) ── */}
      <div className="h-[35vh] w-full flex flex-col bg-surface">
        {/* Navigation bar */}
        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-default transition-colors"
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
            <div className="flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className={`block w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                    i === globalStep ? 'bg-brand' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 tracking-widest font-serif tabular-nums">
              {globalStep + 1}/{TOTAL_STEPS}
            </span>
          </div>

          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-default transition-colors"
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
        </div>

        {/* Narrative text */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-4">
          <NarrativeComponent step={currentStep} />
        </div>
      </div>
    </div>
  );
}
