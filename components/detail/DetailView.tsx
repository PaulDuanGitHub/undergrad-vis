'use client';
import React, { useRef, useState, RefObject, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useThemeVariable } from "@/hooks/useThemeVariable";

import Act1Narrative from '@/components/detail/acts/Act1/Act1Narrative';
import Act1Visual from '@/components/detail/acts/Act1/Act1Visual';
import Act2Narrative from '@/components/detail/acts/Act2/Act2Narrative';
import Act2Visual from '@/components/detail/acts/Act2/Act2Visual';
import Act3Narrative from '@/components/detail/acts/Act3/Act3Narrative';
import Act3Visual from '@/components/detail/acts/Act3/Act3Visual';
import DetailViewMd from '@/components/detail/DetailViewMd';
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
  onExit: () => void;
}

// ── Shared helpers ──
function animateActTransition(texts: HTMLElement[], charts: HTMLElement[], activeIndex: number, direction: 'forward' | 'backward') {
  const chartSlideY = direction === 'forward' ? -20 : 20;
  gsap.to(texts, { opacity: 0.2, duration: 0.5 });
  gsap.to(texts[activeIndex], { opacity: 1, duration: 0.5 });
  gsap.set(charts, { pointerEvents: 'none' });
  gsap.to(charts, { opacity: 0, y: chartSlideY, duration: 0.5 });
  gsap.set(charts[activeIndex], { pointerEvents: 'auto' });
  gsap.to(charts[activeIndex], { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
}

function createSubstepTriggers(cssSelector: string, datasetKey: string, scroller: HTMLElement, onStepChange: (step: number) => void) {
  const elements = gsap.utils.toArray<HTMLElement>(cssSelector);
  elements.forEach((el) => {
    const step = parseInt(el.dataset[datasetKey] || '0', 10);
    ScrollTrigger.create({
      id: `substep-${datasetKey}-${step}`,
      trigger: el, scroller, start: 'center center', end: 'center center', markers: isDev,
      onEnter: () => onStepChange(step), onEnterBack: () => onStepChange(step),
    });
  });
}

// ── Component ──
export default function DetailView({ scrollRef, isDetailVisible, onExit }: DetailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rightChartRef = useRef<HTMLDivElement>(null);

  const colorBrand = useThemeVariable('--color-brand');

  const [act1Step, setAct1Step] = useState(0);
  const [act2Step, setAct2Step] = useState(0);
  const [act3Step, setAct3Step] = useState(0);
  const [activeAct, setActiveAct] = useState(1);

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

    gsap.set(charts.slice(1), { opacity: 0, y: 20, pointerEvents: 'none' });
    gsap.set(texts, { opacity: 0.2 });

    texts.forEach((text, i) => {
      ScrollTrigger.create({
        id: `act-${i + 1}`, trigger: text, scroller, markers: isDev, start: 'top center', end: 'bottom center',
        onEnter: () => { setActiveAct(i + 1); animateActTransition(texts, charts, i, 'forward'); },
        onEnterBack: () => { setActiveAct(i + 1); animateActTransition(texts, charts, i, 'backward'); },
      });
    });

    createSubstepTriggers('.act1-substep', 'act1Step', scroller, setAct1Step);
    createSubstepTriggers('.act2-substep', 'act2Step', scroller, setAct2Step);
    createSubstepTriggers('.act3-substep', 'act3Step', scroller, setAct3Step);

  }, { scope: scrollRef });

  // ── sm / md: use DetailViewMd ──
  if (isMdDown) {
    return <DetailViewMd isDetailVisible={isDetailVisible} onExit={onExit} />;
  }

  return (
    <div
      ref={scrollRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStartPull}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndPull}
      className={`absolute inset-0 overflow-y-auto overscroll-contain transition-opacity ease-out ${
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

        {/* Left: scrollable narrative text */}
        <div className="w-[35%] flex flex-col items-center pt-40 px-8 select-text">
          <div className="w-full flex flex-col items-center">
            <h2 className="mb-2">My 2021 - 2026</h2>
            <h1 className="text-4xl lg:text-5xl mb-8">Productivity</h1>
            <h2 className="text-center italic mb-8 text-sm lg:text-base">
                A visualization of over 600 workfiles created during my undergraduate.
            </h2>
            <p className='text-text-secondary text-sm'>By <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">Paul Duan</a></p>
          </div>
          {ACTS.map((act) => (
            <div key={`act-${act.id}-narrative`} className="narrative-text flex flex-col">
              {act.narrative}
            </div>
          ))}
        </div>

        {/* Right: pinned chart layers */}
        <div className="w-[65%] h-screen sticky top-0 flex items-center justify-center p-8">
          <div ref={rightChartRef} className="relative w-full h-full flex items-center justify-center">
            <div className="chart-layer absolute inset-0 flex items-center justify-center"><Act1Visual step={act1Step} /></div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center"><Act2Visual isActive={activeAct === 2} step={act2Step} /></div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center"><Act3Visual isActive={activeAct === 3} step={act3Step} /></div>
          </div>
        </div>
      </div>

      <Footer onExit={onExit}/>
    </div>
  );
}