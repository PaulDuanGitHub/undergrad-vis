'use client';
import React, { useRef, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import { Act0Narrative, Act0Visual }from '@/components/detail/acts/Act0';
import { Act1Narrative, Act1Visual }from '@/components/detail/acts/Act1';
import { Act2Narrative, Act2Visual }from '@/components/detail/acts/Act2';
import { Act3Narrative, Act3Visual }from '@/components/detail/acts/Act3';
import { Act4Narrative, Act4Visual }from '@/components/detail/acts/Act4';

gsap.registerPlugin(ScrollTrigger);

const ACTS = [
  { id: 0, narrative: <Act0Narrative />, visual: <Act0Visual /> },
  { id: 1, narrative: <Act1Narrative />, visual: <Act1Visual /> },
  { id: 2, narrative: <Act2Narrative />, visual: <Act2Visual /> },
  { id: 3, narrative: <Act3Narrative />, visual: <Act3Visual /> },
  { id: 4, narrative: <Act4Narrative />, visual: <Act4Visual /> },
];

interface DetailViewProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  isDetailVisible: boolean;
}

export default function DetailView({ scrollRef, isDetailVisible }: DetailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rightChartRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const texts = gsap.utils.toArray<HTMLElement>('.narrative-text');
    const charts = gsap.utils.toArray<HTMLElement>('.chart-layer');

    // Init: hide all charts except the first, dim all texts
    gsap.set(charts.slice(1), { opacity: 0, y: 20 });
    gsap.set(texts, { opacity: 0.2 });

    texts.forEach((text, i) => {
      ScrollTrigger.create({
        trigger: text,
        scroller,
        start: "center center",
        end: "center center",
        onEnter: () => {
          gsap.to(texts, { opacity: 0.2, duration: 0.5 });
          gsap.to(text, { opacity: 1, duration: 0.5 });
          gsap.to(charts, { opacity: 0, y: -20, duration: 0.5, stagger: 0 });
          gsap.to(charts[i], { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", overwrite: true });
        },
        onEnterBack: () => {
          gsap.to(texts, { opacity: 0.2, duration: 0.5 });
          gsap.to(text, { opacity: 1, duration: 0.5 });
          gsap.to(charts, { opacity: 0, y: 20, duration: 0.5, stagger: 0 });
          gsap.to(charts[i], { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", overwrite: true });
        },
      });
    });

    // Pin the right chart column — must specify scroller for non-window scrolling
    ScrollTrigger.create({
      trigger: contentRef.current,
      scroller,
      start: "top top",
      end: "bottom bottom",
      pin: rightChartRef.current,
    });
  }, { scope: scrollRef });

  return (
    <div
      ref={scrollRef}
      className={`absolute inset-0 overflow-y-auto transition-all ease-out ${
        isDetailVisible
          ? "duration-1000 opacity-100 scale-100 z-20"
          : "duration-200 opacity-0 scale-98 pointer-events-none"
      }`}
    >
      <div ref={contentRef} className="flex relative bg-[#FAF8F5] text-amber-950 min-h-full">

        {/* ===== Left: scrollable narrative text ===== */}
        <div className="w-2/5 flex flex-col items-center">
          {ACTS.map((act) => (
            <div
              key={`act-${act.id}-narrative`}
              className="narrative-text h-screen flex flex-col justify-center px-12"
            >
                {act.narrative}
            </div>
          ))}
        </div>

        {/* ===== Right: pinned chart layers ===== */}
        <div className="w-3/5 h-screen relative flex items-center justify-center p-8">
          <div ref={rightChartRef} className="relative w-full h-full flex items-center justify-center">
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act0Visual />
            </div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act1Visual />
            </div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act2Visual />
            </div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act3Visual />
            </div>
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act4Visual />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}