'use client';
import React, { useRef, useState, RefObject, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useThemeVariable } from "@/hooks/useThemeVariable";
import { useReducedMotion } from "@/hooks/useReducedMotion";

import Act1Narrative from '@/components/detail/acts/Act1/Act1Narrative';
import Act1Figure from '@/components/detail/acts/Act1/Act1Figure';
import Act2Narrative from '@/components/detail/acts/Act2/Act2Narrative';
import Act2Figure from '@/components/detail/acts/Act2/Act2Figure';
import Act3Narrative from '@/components/detail/acts/Act3/Act3Narrative';
import Act3Figure from '@/components/detail/acts/Act3/Act3Figure';
import DetailViewMd from '@/components/detail/DetailViewMd';
import { Kicker } from '@/components/detail/narrative/ReportType';
import { EmphasisProvider } from '@/components/detail/narrative/EmphasisContext';
import Footer from './Footer';

gsap.registerPlugin(ScrollTrigger);

// ── Constants ──
const ACTS = [
  { id: 1, narrative: <Act1Narrative /> },
  { id: 2, narrative: <Act2Narrative /> },
  { id: 3, narrative: <Act3Narrative /> },
] as const;

const isDev = process.env.NODE_ENV === 'development';

interface DetailViewProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  isDetailVisible: boolean;
  /** Keep the mobile panel mounted through the open/close transition. */
  isDetailMounted: boolean;
  /** `#actN` deep link: the act the story should open on (null = act 1). */
  initialAct?: 1 | 2 | 3 | null;
  onExit: () => void;
}

// ── Shared helpers ──
function animateActTransition(
  texts: HTMLElement[],
  charts: HTMLElement[],
  activeIndex: number,
  direction: 'forward' | 'backward',
  /** Reduced motion: land on the final state with no tween. */
  instant = false,
) {
  const chartSlideY = instant ? 0 : direction === 'forward' ? -20 : 20;
  if (!charts[activeIndex]) return;
  // A fast scrub fires several of these back-to-back, so it has to be
  // idempotent: kill whatever is still in flight and only ever fade the
  // NON-active charts out. The old version faded EVERY chart out and then faded
  // the incoming one back in, so two tweens owned the incoming chart's opacity
  // and which one won came down to GSAP's render order — which is how Act 2's
  // stream ended up sitting on top of Act 1's cubes.
  gsap.killTweensOf(charts);
  gsap.killTweensOf(texts);
  gsap.set(charts, { pointerEvents: 'none' });
  gsap.set(charts[activeIndex], { pointerEvents: 'auto' });
  if (instant) {
    charts.forEach((chart, i) => {
      gsap.set(chart, { opacity: i === activeIndex ? 1 : 0, y: 0 });
    });
    texts.forEach((text, i) => {
      gsap.set(text, { opacity: i === activeIndex ? 1 : 0.2 });
    });
    return;
  }
  charts.forEach((chart, i) => {
    if (i !== activeIndex) gsap.to(chart, { opacity: 0, y: chartSlideY, duration: 0.3 });
  });
  // The incoming chart starts a beat later so the two never sit at full strength
  // together, and keeps whatever `y` it already has (a fast scrub can catch it
  // mid-fade, and re-seating `y` would make it jump).
  gsap.to(charts[activeIndex], {
    opacity: 1,
    y: 0,
    duration: 0.5,
    delay: 0.18,
    ease: 'power2.out',
  });
  texts.forEach((text, i) => {
    gsap.to(text, { opacity: i === activeIndex ? 1 : 0.2, duration: 0.4 });
  });
}

function createSubstepTriggers(cssSelector: string, datasetKey: string, scroller: HTMLElement, onStepChange: (step: number) => void) {
  const elements = gsap.utils.toArray<HTMLElement>(cssSelector);
  elements.forEach((el) => {
    const step = parseInt(el.dataset[datasetKey] || '0', 10);

    // A pinned substep owns a word-sized runway: its top is the moment the
    // copy starts reading, so the chart has to change there, not at the
    // centre of the (much taller) section. The trigger is active for the
    // whole section; `onToggle` also handles scrolling back into it.
    if (el.classList.contains('narrative-step--pinned')) {
      ScrollTrigger.create({
        id: `substep-${datasetKey}-${step}`,
        trigger: el, scroller, start: 'top top', end: 'bottom top', markers: isDev,
        onToggle: (self) => {
          if (self.isActive) onStepChange(step);
        },
      });
      return;
    }

    ScrollTrigger.create({
      id: `substep-${datasetKey}-${step}`,
      trigger: el, scroller, start: 'center center', end: 'center center', markers: isDev,
      onEnter: () => onStepChange(step), onEnterBack: () => onStepChange(step),
    });
  });
}

// ── Component ──
export default function DetailView({ scrollRef, isDetailVisible, isDetailMounted, initialAct = null, onExit }: DetailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rightChartRef = useRef<HTMLDivElement>(null);

  const colorBrand = useThemeVariable('--color-brand');
  const reducedMotion = useReducedMotion();
  // The ScrollTriggers are built once (see `useGSAP` below), so the reduced
  // motion branch reads a ref instead of forcing the context to rebuild.
  const reducedMotionRef = useRef(reducedMotion);
  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  const [act1Step, setAct1Step] = useState(0);
  const [act2Step, setAct2Step] = useState(0);
  const [act3Step, setAct3Step] = useState(0);
  const [activeAct, setActiveAct] = useState(1);
  /** False on the introduction: the Act I plate/notes belong to the act proper. */
  const [act1Started, setAct1Started] = useState(false);

  // ── Breakpoint detection ──
  const [isMdDown, setIsMdDown] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMdDown(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ── Pull-to-exit state & logic ──
  const [pullProgress, setPullProgress] = useState(0);
  const PULL_THRESHOLD = 800;
  const touchPullStartRef = useRef(0);

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    
    // Only accumulate progress when at the very top and scrolling upward
    if (scrollRef.current.scrollTop <= 0 && e.deltaY < 0) {
      setPullProgress((prev) => {
        const next = prev - e.deltaY;
        if (next >= PULL_THRESHOLD) {
          onExit();
          return 0;
        }
        return next;
      });
    } else {
      setPullProgress(0);
    }
  };

  // Spring-reset pull progress after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (pullProgress > 0 && pullProgress < PULL_THRESHOLD) {
      timeout = setTimeout(() => {
        setPullProgress(0);
      }, 1000);
    }
    return () => clearTimeout(timeout);
  }, [pullProgress]);

  // ── Touch pull-to-exit (for touchscreen laptops / desktop touch) ──
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    const dy = e.touches[0].clientY - touchPullStartRef.current;
    // Only activate when at the very top and pulling down (dy > 0)
    if (scrollRef.current.scrollTop <= 0 && dy > 0) {
      setPullProgress(dy);
      if (dy >= PULL_THRESHOLD) {
        onExit();
        setPullProgress(0);
      }
    } else {
      setPullProgress(0);
    }
  };

  const handleTouchStartPull = (e: React.TouchEvent) => {
    touchPullStartRef.current = e.touches[0].clientY;
  };

  const handleTouchEndPull = () => {
    setPullProgress(0);
    touchPullStartRef.current = 0;
  };

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(pullProgress / PULL_THRESHOLD, 1) * circumference);

  useGSAP(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const texts = gsap.utils.toArray<HTMLElement>('.narrative-text', scroller);
    const charts = gsap.utils.toArray<HTMLElement>('.chart-layer', scroller);
    // The acts switch on their chapter openers, not on the wrapper's top: the
    // opener's copy is vertically centred, so `center center` puts the act
    // title at the viewport's centre exactly when the chart changes.
    // The introduction borrows the opener's typography but is not an act.
    const openers = gsap.utils
      .toArray<HTMLElement>('.narrative-act', scroller)
      .filter((el) => !el.classList.contains('narrative-intro'));

    gsap.set(charts.slice(1), { opacity: 0, y: reducedMotionRef.current ? 0 : 20, pointerEvents: 'none' });
    gsap.set(texts, { opacity: 0.2 });
    // Act 1 is live from the first frame; its wrapper starts at the Act I opener.
    if (texts[0]) gsap.set(texts[0], { opacity: 1 });

    openers.forEach((opener, i) => {
      ScrollTrigger.create({
        id: `act-${i + 1}`, trigger: opener, scroller, markers: isDev, start: 'center center', end: 'center center',
        onEnter: () => {
          setActiveAct(i + 1);
          if (i === 0) setAct1Started(true);
          animateActTransition(texts, charts, i, 'forward', reducedMotionRef.current);
        },
        onEnterBack: () => {
          setActiveAct(i + 1);
          if (i === 0) setAct1Started(true);
          animateActTransition(texts, charts, i, 'backward', reducedMotionRef.current);
        },
        // A zero-length opener trigger has no "end" to cross when scrolling
        // back up: leaving it backwards means we are entering the PREVIOUS
        // act's content (or the introduction, for Act I).
        onLeaveBack: () => {
          if (i === 0) {
            setAct1Started(false);
            return;
          }
          setActiveAct(i);
          animateActTransition(texts, charts, i - 1, 'backward', reducedMotionRef.current);
        },
      });
    });

    createSubstepTriggers('.act1-substep', 'act1Step', scroller, setAct1Step);
    createSubstepTriggers('.act2-substep', 'act2Step', scroller, setAct2Step);
    createSubstepTriggers('.act3-substep', 'act3Step', scroller, setAct3Step);

    // The report faces swap in after first paint. Re-measure once they are
    // in, so every act/substep trigger still lands on the copy it belongs to.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

  }, { scope: scrollRef });

  // ── Keyboard: focus the scroller so ↑/↓, PageUp/PageDown, Home/End scroll the
  // story natively (the browser owns the step distances; ScrollTrigger follows
  // the scroll position, so acts still change as they would with a wheel).
  useEffect(() => {
    if (!isDetailVisible || isMdDown) return;
    scrollRef.current?.focus({ preventScroll: true });
  }, [isDetailVisible, isMdDown, scrollRef]);

  // ── sm / md: use DetailViewMd ──
  if (isMdDown) {
    return isDetailMounted ? <DetailViewMd isDetailVisible={isDetailVisible} initialAct={initialAct} onExit={onExit} /> : null;
  }

  // The step the reader is actually in. Only this step may publish a reading
  // focus to the figure; off-screen pinned sections must not clear it when the
  // reader scrolls back into an earlier act.
  const activeEmphasisStep =
    activeAct === 1
      ? { act: 1 as const, step: act1Step }
      : activeAct === 2
        ? { act: 2 as const, step: act2Step }
        : { act: 3 as const, step: act3Step };

  return (
    <EmphasisProvider activeStep={activeEmphasisStep}>
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStartPull}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndPull}
      role="region"
      aria-label="Data story"
      aria-hidden={!isDetailVisible}
      inert={!isDetailVisible}
      tabIndex={-1}
      data-detail-scroller
      data-report
      className={`absolute inset-0 overflow-y-auto overscroll-contain scroll-smooth transition-opacity ease-out ${
        isDetailVisible
          ? "duration-1000 opacity-100 pointer-events-auto z-10"
          : "duration-200 opacity-0 pointer-events-none"
      }`}
    >
      {/* Pull-to-Exit Indicator */}
      <div 
        className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none transition-all duration-300"
        style={{ 
          opacity: pullProgress > 0 ? 1 : 0, 
          transform: `translate(-50%, ${Math.min(pullProgress / 10, 20)}px)`
        }}
      >
        <svg width="40" height="40" className="transform -rotate-90">
          <circle cx="20" cy="20" r={radius} stroke="#e5e7eb" strokeWidth="3" fill="transparent" />
          <circle 
            cx="20" cy="20" r={radius} 
            stroke={colorBrand} strokeWidth="3" fill="transparent" 
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-150 ease-out"
          />
        </svg>
      </div>

      <div ref={contentRef} className="flex relative bg-surface text-text-primary h-fit">

        {/* Left: scrollable narrative text, set like a printed report */}
        <div className="w-[35%] flex flex-col items-center pt-40 px-8 select-text">
          <div className="w-full flex flex-col items-center">
            {/* Masthead — the report's title block. */}
            <header className="narrative-act narrative-act--statement narrative-intro">
              <Kicker accent>Introduction</Kicker>
              <p className="t-statement">
                An undergraduate degree is built, block by block.
              </p>
              <p className="t-deck t-deck--left">
                Five years of coursework, translated into data, geometry, and color.
              </p>
            </header>
            {ACTS.map((act) => (
              <div key={`act-${act.id}-narrative`} className="narrative-text flex flex-col w-full">
                {act.narrative}
              </div>
            ))}
          </div>
        </div>

        {/* Right: pinned chart layers */}
        <div className="w-[65%] h-dvh sticky top-0 flex items-center justify-center p-8">
          <div ref={rightChartRef} className="relative w-full h-full flex items-center justify-center">
            <div className="chart-layer absolute inset-0 flex items-center justify-center"><Act1Figure step={act1Step} isActive={activeAct === 1} visible={isDetailVisible} started={act1Started} /></div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center"><Act2Figure isActive={activeAct === 2} step={act2Step} /></div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center"><Act3Figure isActive={activeAct === 3} step={act3Step} /></div>
          </div>
        </div>
      </div>

      <Footer onExit={onExit}/>
    </div>
    </EmphasisProvider>
  );
}