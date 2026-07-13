'use client';
import React, { useRef, useState, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import Act1Narrative from '@/components/detail/acts/Act1/Act1Narrative';
import Act1Visual from '@/components/detail/acts/Act1/Act1Visual';
import Act2Narrative from '@/components/detail/acts/Act2/Act2Narrative';
import Act2Visual from '@/components/detail/acts/Act2/Act2Visual';
import Act3Narrative from '@/components/detail/acts/Act3/Act3Narrative';
import Act3Visual from '@/components/detail/acts/Act3/Act3Visual';

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
}

// ── Shared helpers ──

/**
 * Animate the act transition: dim all texts/ hide all charts,
 * then highlight the active text and show the corresponding chart.
 * GSAP 3's default `overwrite: "auto"` handles fast-scroll conflicts.
 */
function animateActTransition(
  texts: HTMLElement[],
  charts: HTMLElement[],
  activeIndex: number,
  direction: 'forward' | 'backward',
) {
  const chartSlideY = direction === 'forward' ? -20 : 20;

  // Dim all texts, highlight current
  gsap.to(texts, { opacity: 0.2, duration: 0.5 });
  gsap.to(texts[activeIndex], { opacity: 1, duration: 0.5 });

  // Hide all charts with a directional slide
  gsap.set(charts, { pointerEvents: 'none' });
  gsap.to(charts, { opacity: 0, y: chartSlideY, duration: 0.5 });

  // Reveal the active chart
  gsap.set(charts[activeIndex], { pointerEvents: 'auto' });
  gsap.to(charts[activeIndex], {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power2.out',
  });
}

/**
 * Generic factory for substep ScrollTriggers.
 * Each element matching `cssSelector` reads its step index from `data-${datasetKey}`
 * and calls `onStepChange(step)` when it enters the viewport center.
 */
function createSubstepTriggers(
  cssSelector: string,
  datasetKey: string,
  scroller: HTMLElement,
  onStepChange: (step: number) => void,
) {
  const elements = gsap.utils.toArray<HTMLElement>(cssSelector);
  elements.forEach((el) => {
    const step = parseInt(el.dataset[datasetKey] || '0', 10);
    ScrollTrigger.create({
      id: `substep-${datasetKey}-${step}`,
      trigger: el,
      scroller,
      start: 'center center',
      end: 'center center',
      markers: isDev,
      onEnter: () => onStepChange(step),
      onEnterBack: () => onStepChange(step),
    });
  });
}

// ── Component ──

export default function DetailView({ scrollRef, isDetailVisible }: DetailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rightChartRef = useRef<HTMLDivElement>(null);
  const [act1Step, setAct1Step] = useState(0);
  const [act2Step, setAct2Step] = useState(0);
  const [act3Step, setAct3Step] = useState(0);
  const [activeAct, setActiveAct] = useState(1);

  useGSAP(
    () => {
      const scroller = scrollRef.current;
      if (!scroller) return;

      // Scope DOM queries to the scroller to avoid cross-component leaks
      const texts = gsap.utils.toArray<HTMLElement>('.narrative-text', scroller);
      const charts = gsap.utils.toArray<HTMLElement>('.chart-layer', scroller);

      // Initial state: only first chart visible, all texts dimmed
      gsap.set(charts.slice(1), { opacity: 0, y: 20, pointerEvents: 'none' });
      gsap.set(texts, { opacity: 0.2 });

      // ── Act-level triggers ──
      texts.forEach((text, i) => {
        ScrollTrigger.create({
          id: `act-${i + 1}`,
          trigger: text,
          scroller,
          markers: isDev,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => {
            setActiveAct(i + 1);
            animateActTransition(texts, charts, i, 'forward');
          },
          onEnterBack: () => {
            setActiveAct(i + 1);
            animateActTransition(texts, charts, i, 'backward');
          },
        });
      });

      // ── Substep triggers (one factory call per act) ──
      createSubstepTriggers('.act1-substep', 'act1Step', scroller, setAct1Step);
      createSubstepTriggers('.act2-substep', 'act2Step', scroller, setAct2Step);
      createSubstepTriggers('.act3-substep', 'act3Step', scroller, setAct3Step);
    },
    { scope: scrollRef },
  );

  return (
    <div
      ref={scrollRef}
      className={`absolute inset-0 overflow-y-auto transition-opacity ease-out ${
        isDetailVisible
          ? "duration-1000 opacity-100 pointer-events-auto z-10"
          : "duration-200 opacity-0 pointer-events-none"
      }`}
    >
      <div ref={contentRef} className="flex relative bg-[#FAF8F5] text-amber-950 h-fit">

        {/* ===== Left: scrollable narrative text ===== */}
        <div className="w-[30%] flex flex-col items-center pt-40 px-12 select-text">
          <div className="w-full flex flex-col items-center">
            <h2 className="">My 2021 - 2026</h2>
            <h1 className="text-5xl mb-8">Productivity</h1>
            <h2 className="text-center italic mb-8">
                A visualization of over 600 workfiles created during my undergraduate.
            </h2>
            <p className='text-amber-950/50'>By <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-amber-700 transition-colors">Paul Duan</a></p>
          </div>
          {ACTS.map((act) => (
            <div
              key={`act-${act.id}-narrative`}
              className={`narrative-text flex flex-col`}
            >
              {act.narrative}
            </div>
          ))}
        </div>

        {/* ===== Right: pinned chart layers ===== */}
        <div className="w-[70%] h-screen sticky top-0 flex items-center justify-center p-8">
          <div ref={rightChartRef} className="relative w-full h-full flex items-center justify-center">
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act1Visual step={act1Step} />
            </div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act2Visual 
                isActive={activeAct === 2}
                step={act2Step} />
            </div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act3Visual 
                isActive={activeAct === 3}
                step={act3Step} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}