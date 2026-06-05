'use client';
import React, { useRef, useState, RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import Act0Narrative from '@/components/detail/acts/Act0/Act0Narrative';
import Act0Visual from '@/components/detail/acts/Act0/Act0Visual';
import { Act1Narrative, Act1Visual }from '@/components/detail/acts/Act1';
import { Act2Narrative, Act2Visual }from '@/components/detail/acts/Act2';
import { Act3Narrative, Act3Visual }from '@/components/detail/acts/Act3';
import { Act4Narrative, Act4Visual }from '@/components/detail/acts/Act4';

gsap.registerPlugin(ScrollTrigger);

const ACTS = [
  { id: 0, narrative: <Act0Narrative /> },
  { id: 1, narrative: <Act1Narrative /> },
  { id: 2, narrative: <Act2Narrative /> },
  { id: 3, narrative: <Act3Narrative /> },
  { id: 4, narrative: <Act4Narrative /> },
];

interface DetailViewProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  isDetailVisible: boolean;
}

export default function DetailView({ scrollRef, isDetailVisible }: DetailViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const rightChartRef = useRef<HTMLDivElement>(null);
  const [act0Step, setAct0Step] = useState(0);

  useGSAP(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    const texts = gsap.utils.toArray<HTMLElement>('.narrative-text');
    const charts = gsap.utils.toArray<HTMLElement>('.chart-layer');

    // Init: hide all charts except the first, dim all texts
    gsap.set(charts.slice(1), { opacity: 0, y: 20, pointerEvents: "none" });
    gsap.set(texts, { opacity: 0.2 });

    // ── Act-level triggers (Act 0–4) ──
    texts.forEach((text, i) => {
      ScrollTrigger.create({
        trigger: text,
        scroller,
        start: "top 60%",
        end: "bottom 40%",
        onEnter: () => {
          gsap.to(texts, { opacity: 0.2, duration: 0.5 });
          gsap.to(text, { opacity: 1, duration: 0.5 });
          gsap.set(charts, { pointerEvents: "none" });
          gsap.to(charts, { opacity: 0, y: -20, duration: 0.5, stagger: 0 });
          gsap.set(charts[i], { pointerEvents: "auto" });
          gsap.to(charts[i], { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", overwrite: true });
        },
        onEnterBack: () => {
          gsap.to(texts, { opacity: 0.2, duration: 0.5 });
          gsap.to(text, { opacity: 1, duration: 0.5 });
          gsap.set(charts, { pointerEvents: "none" });
          gsap.to(charts, { opacity: 0, y: 20, duration: 0.5, stagger: 0 });
          gsap.set(charts[i], { pointerEvents: "auto" });
          gsap.to(charts[i], { opacity: 1, y: 0, duration: 0.8, ease: "power2.out", overwrite: true });
        },
      });
    });

    // ── Act0 substep triggers ──
    const act0Substeps = gsap.utils.toArray<HTMLElement>('.act0-substep');
    act0Substeps.forEach((substep) => {
      const step = parseInt(substep.dataset.act0Step || '0', 10);
      ScrollTrigger.create({
        trigger: substep,
        scroller,
        start: "center center",
        end: "center center",
        onEnter: () => setAct0Step(step),
        onEnterBack: () => setAct0Step(step),
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
      className={`absolute inset-0 overflow-y-auto transition-all ease-out z-10 ${
        isDetailVisible
          ? "duration-1000 opacity-100 scale-100 pointer-events-auto"
          : "duration-200 opacity-0 scale-98 pointer-events-none"
      }`}
    >
      <div ref={contentRef} className="flex relative bg-[#FAF8F5] text-amber-950 min-h-full">

        {/* ===== Left: scrollable narrative text ===== */}
        <div className="w-[30%] flex flex-col items-center pt-50 px-12">
          <div className="flex flex-col items-center">
            <h3>My 2021 - 2026</h3>
            <h1 className="text-6xl mb-4">Productivity</h1>
            <h3 className="text-center italic mb-4">
                Reporting & Visualization of My Undergraduate Academic Journey
            </h3>
            <h3>By Paul Duan</h3>
            <hr className="w-full border-t border-amber-900/40 my-4" />
          </div>
          {ACTS.map((act) => (
            <div
              key={`act-${act.id}-narrative`}
              className={`narrative-text flex flex-col ${
                act.id === 0
                  ? 'min-h-[550vh] pt-[10vh]'
                  : 'h-screen justify-center'
              }`}
            >
              {act.narrative}
            </div>
          ))}
        </div>

        {/* ===== Right: pinned chart layers ===== */}
        <div className="w-[70%] h-screen relative flex items-center justify-center p-8">
          <div ref={rightChartRef} className="relative w-full h-full flex items-center justify-center">
            <div className="chart-layer absolute inset-0 flex items-center justify-center">
              <Act0Visual step={act0Step} />
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