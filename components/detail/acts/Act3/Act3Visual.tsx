"use client";
import React, { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import gsap from "gsap";
import { useGSAPStateMachine } from "@/hooks/useGSAPStateMachine";
import { useContainerWidth } from "@/hooks/useContainerWidth";
import heavy_assignments_commits from "@/data/heavy_assignment_commits.json";
import PunchcardHeatmap from "@/components/detail/acts/Act3/PunchcardHeatmap";
import day_hour_counts from "@/data/day_hour_counts.json";
import { useThemeVariable } from "@/hooks/useThemeVariable";

interface Act3VisualProps {
  step: number;
  isActive: boolean;
}

const ASPECT_RATIO = 650 / 900; // height / width
const W_TRACK_RATIO = 600 / 900; // track width ratio

export default function Act3Visual({ step, isActive }: Act3VisualProps) {
  const { ref: svgRef, width: svgWidth } = useContainerWidth<HTMLDivElement>(900);
  const svgHeight = Math.round(svgWidth * ASPECT_RATIO);

  const COLOR_GRAY = useThemeVariable("--color-brand-light");
  const COLOR_BRAND = useThemeVariable("--color-brand");

  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // ==========================================
  // Data-Driven Math Engine
  // ==========================================
  const { processedData, axes } = useMemo(() => {
    const allData = heavy_assignments_commits;

    const isFreshman = (term: string) => ["2021 Fall", "2022 Winter"].includes(term);
    const isSenior = (term: string) => ["2025 Fall", "2026 Winter"].includes(term);

    const freshData = allData.filter((d) => isFreshman(d.term));
    const senData = allData.filter((d) => isSenior(d.term));

    const maxFresh = Math.max(...freshData.flatMap(d => d.commits.map(c => c[0])), 1);
    const maxSen = Math.max(...senData.flatMap(d => d.commits.map(c => c[0])), 1);
    const maxAll = Math.max(...allData.flatMap(d => d.commits.map(c => c[0])), 1);

    const W_TRACK = Math.round(svgWidth * W_TRACK_RATIO);

    const scaleFresh = scaleLinear().domain([maxFresh, 0]).range([0, W_TRACK]);
    const scaleSen = scaleLinear().domain([maxSen, 0]).range([0, W_TRACK]);
    const scaleAll = scaleLinear().domain([maxAll, 0]).range([0, W_TRACK]);

    const ROW_H_FOCUS = 30;
    const ROW_H_GRID = 9;

    const freshStartY = (svgHeight - freshData.length * ROW_H_FOCUS) / 2;
    const senStartY = (svgHeight - senData.length * ROW_H_FOCUS) / 2;

    const allStartY = (svgHeight - allData.length * ROW_H_GRID) / 2;

    const TRACK_X = (svgWidth - W_TRACK) / 2;

    const pData = allData.map((d, i) => {
      const isF = isFreshman(d.term);
      const isS = isSenior(d.term);
      const fIdx = freshData.indexOf(d);
      const sIdx = senData.indexOf(d);

      const t0 = {
        x: TRACK_X,
        y: isF ? freshStartY + fIdx * ROW_H_FOCUS : (isS ? -100 : 800),
        w: W_TRACK, op: isF ? 1 : 0
      };

      const t1 = {
        x: TRACK_X,
        y: isS ? senStartY + sIdx * ROW_H_FOCUS : (isF ? 800 : 800),
        w: W_TRACK, op: isS ? 1 : 0
      };

      const t2 = {
        x: TRACK_X,
        y: allStartY + i * ROW_H_GRID,
        w: W_TRACK, op: 1
      };

      const bubbles = d.commits.map((c) => ({
        day: c[0],
        count: c[1],
        radius: Math.max(1, Math.sqrt(c[1]) * 1.5),
        cx0: scaleFresh(c[0]),
        cx1: scaleSen(c[0]),
        cx2: scaleAll(c[0])
      }));

      const maxDay = Math.max(...d.commits.map(c => c[0]), 0);
      const lx0 = scaleFresh(maxDay);
      const lx1 = scaleSen(maxDay);
      const lx2 = scaleAll(maxDay);

      return { ...d, id: `${d.term}_${i}`, isF, isS, t0, t1, t2, bubbles, lx0, lx1, lx2 };
    });

    const generateTicks = (maxD: number) => {
      const ticks = [];
      for (let i = 0; i <= Math.ceil(maxD); i += 0.5) { if (i <= maxD) ticks.push(i); }
      return ticks;
    };

    const axes = {
      fresh: { ticks: generateTicks(maxFresh), scale: scaleFresh, x: TRACK_X, y: freshStartY + freshData.length * ROW_H_FOCUS + 10, w: W_TRACK },
      sen: { ticks: generateTicks(maxSen), scale: scaleSen, x: TRACK_X, y: senStartY + senData.length * ROW_H_FOCUS + 10, w: W_TRACK },
      all: { ticks: generateTicks(maxAll), scale: scaleAll, x: TRACK_X, y: allStartY + allData.length * ROW_H_GRID + 10, w: W_TRACK }
    };

    return { processedData: pData, axes };
  }, [svgWidth, svgHeight]);

  // ==========================================
  // GSAP Animation State Machine
  // ==========================================
  const dur = 1.0;
  const ease = "power3.inOut";

  /** Bubbles and tracks states for step (0/1/2) */
  const setTrackStep = (s: number) => {
    gsap.set(".track-group", {
      x: (i, el) => el.dataset[`x${s}`],
      y: (i, el) => el.dataset[`y${s}`],
      opacity: (i, el) => el.dataset[`op${s}`],
    });
    gsap.set(".track-line", {
      attr: { x2: (i, el) => el.dataset[`w${s}`], x1: (i, el) => el.dataset[`lx${s}`] },
    });
    gsap.set(".commit-bubble", { attr: { cx: (i, el) => el.dataset[`cx${s}`] } });
    gsap.set(".punchcard-container", { opacity: 0, zIndex: -1 });
    gsap.set(".axis-0", { opacity: s === 0 ? 1 : 0 });
    gsap.set(".axis-1", { opacity: s === 1 ? 1 : 0 });
    gsap.set(".axis-2", { opacity: s === 2 ? 1 : 0 });
  };

  /** Animate bubbles and tracks to step (0/1/2) */
  const animateToTrackStep = (s: number) => {
    gsap.to(".punchcard-container", { opacity: 0, duration: 0.2, zIndex: -1 });
    gsap.to(".track-group", {
      x: (i, el) => Number(el.dataset[`x${s}`]),
      y: (i, el) => Number(el.dataset[`y${s}`]),
      opacity: (i, el) => Number(el.dataset[`op${s}`]),
      scale: 1,
      duration: dur,
      ease,
    });
    gsap.to(".track-line", {
      attr: { x2: (i, el) => el.dataset[`w${s}`], x1: (i, el) => el.dataset[`lx${s}`] },
      duration: dur,
      ease,
    });
    gsap.to(".commit-bubble", {
      attr: { cx: (i, el) => el.dataset[`cx${s}`] },
      duration: dur,
      ease,
    });
    gsap.to(".axis-0", { opacity: s === 0 ? 1 : 0, duration: 0.5 });
    gsap.to(".axis-1", { opacity: s === 1 ? 1 : 0, duration: 0.5 });
    gsap.to(".axis-2", { opacity: s === 2 ? 1 : 0, duration: 0.5 });
  };

  useGSAPStateMachine({
    step,
    isActive,

    onInactive: () => {
      gsap.set(".track-group", { opacity: 0 });
      gsap.set(".axis-group", { opacity: 0 });
      gsap.set(".punchcard-container", { opacity: 0, zIndex: -1 });
    },

    states: {
      0: () => setTrackStep(0),
      1: () => setTrackStep(1),
      2: () => setTrackStep(2),
      3: () => {
        gsap.set(".track-group, .axis-group", { opacity: 0 });
        console.log("进入 Punchcard Step 3");
        gsap.set(".punchcard-container", { opacity: 1, zIndex: 10 });
      },
    },

    transitions: {
      "0->1": () => animateToTrackStep(1),
      "1->0": () => animateToTrackStep(0),
      "1->2": () => animateToTrackStep(2),
      "2->1": () => animateToTrackStep(1),
      "2->3": () => {
        gsap.killTweensOf(".track-group, .axis-group, .track-line, .commit-bubble, .axis-0, .axis-1, .axis-2");
        gsap.to(".track-group, .axis-group", { opacity: 0, duration: 0.5 });
        gsap.to(".punchcard-container", { opacity: 1, zIndex: 10, duration: 0.5 });
      },
      "3->2": () => animateToTrackStep(2),
    },
  });

  const renderAxis = (axisDef: any, stepIndex: number | number[], className: string) => {
    const isVisible = Array.isArray(stepIndex) ? stepIndex.includes(step) : step === stepIndex;
    const { ticks, scale, x, y, w } = axisDef;

    return (
      <g className={`axis-group ${className}`} transform={`translate(${x}, ${y})`} opacity={isVisible ? 1 : 0}>
        <line x1={0} x2={w} y1={0} y2={0} stroke={COLOR_BRAND} strokeOpacity={0.3} />
        {ticks.map((t: number) => {
          const isInteger = t % 1 === 0;
          const cx = scale(t);
          const rectW = Math.abs(scale(0.5) - scale(0));

          return (
            <g key={t} transform={`translate(${cx}, 0)`}>
              <line y1={0} y2={isInteger ? 5 : 3} stroke={COLOR_BRAND} strokeOpacity={isInteger ? 0.8 : 0.4} />
              {isInteger && (
                <text y={15} textAnchor="middle" className={`font-serif text-[12px] ${t === 0 ? 'fill-brand-700 font-bold' : 'fill-slate-500'}`}>
                  {t === 0 ? 'DL' : t}
                </text>
              )}
              <rect
                x={-rectW / 2} y={-20} width={rectW} height={40} fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredDay(t)}
                onMouseLeave={() => setHoveredDay(null)}
              />
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div
      ref={svgRef}
      className="w-full flex items-center justify-center"
    >
      <svg width={svgWidth} height={svgHeight} className="overflow-visible">
        <g>
          {processedData.map((d) => {
            const isHoveredTrack = hoveredTrack === d.id;

            return (
              <g
                key={d.id}
                className="track-group"
                data-x0={d.t0.x} data-y0={d.t0.y} data-op0={d.t0.op}
                data-x1={d.t1.x} data-y1={d.t1.y} data-op1={d.t1.op}
                data-x2={d.t2.x} data-y2={d.t2.y} data-op2={d.t2.op}
                onMouseEnter={() => setHoveredTrack(d.id)}
                onMouseLeave={() => setHoveredTrack(null)}
              >
                <line
                  className="track-line"
                  x1={0} y1={0} y2={0}
                  data-w0={d.t0.w} data-lx0={d.lx0}
                  data-w1={d.t1.w} data-lx1={d.lx1}
                  data-w2={d.t2.w} data-lx2={d.lx2}
                  stroke={isHoveredTrack ? COLOR_BRAND : COLOR_BRAND}
                  strokeOpacity={isHoveredTrack ? 0.4 : 0.15}
                  strokeWidth={isHoveredTrack ? 2 : 1}
                />

                <g>
                  {d.bubbles.map((b, idx) => {
                    const isTarget = isHoveredTrack || hoveredDay === b.day;
                    const isFaded = (hoveredTrack || hoveredDay !== null) && !isTarget;

                    return (
                      <circle
                        key={idx}
                        className="commit-bubble transition-opacity duration-300"
                        data-cx0={b.cx0} data-cx1={b.cx1} data-cx2={b.cx2}
                        cy={0}
                        r={b.radius}
                        fill={isTarget ? COLOR_BRAND : COLOR_GRAY}
                        opacity={isFaded ? 0.1 : 0.8}
                      />
                    );
                  })}
                </g>
              </g>
            );
          })}
        </g>

        {renderAxis(axes.fresh, 0, "axis-0")}
        {renderAxis(axes.sen, 1, "axis-1")}
        {renderAxis(axes.all, 2, "axis-2")}

      </svg>

      <div className="punchcard-container w-full h-full flex items-center justify-center absolute top-0 left-0 opacity-0">
        <PunchcardHeatmap data={day_hour_counts} width={svgWidth} />
      </div>
    </div>
  );
}