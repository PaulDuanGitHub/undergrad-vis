"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { scaleLinear } from "d3-scale";
import gsap from "gsap";
import { useGSAPStateMachine } from "@/hooks/useGSAPStateMachine";
import { useContainerDim } from "@/hooks/useContainerDim";
import heavy_assignments_commits from "@/data/heavy_assignment_commits.json";
import PunchcardHeatmap from "@/components/detail/acts/Act3/PunchcardHeatmap";
import day_hour_counts from "@/data/day_hour_counts.json";
import { useThemeVariable } from "@/hooks/useThemeVariable";

interface Act3VisualProps {
  step: number;
  isActive: boolean;
  compact?: boolean;
  /** Height of the visual pane; compact charts use it to avoid letterboxing. */
  availableHeight?: number;
}

const ASPECT_RATIO = 650 / 900; // height / width
const W_TRACK_RATIO = 600 / 900; // track width ratio

/**
 * Cumulative "time left before the deadline" cut-offs in the axis' own unit
 * (days — the axis used to tick every 12 h and every day). Each tier paints the
 * strip between its own cut-off and the previous one, i.e. 0.5 | 1-0.5 | 3-1 |
 * 7-3 | 14-7, and each one selects its FULL cumulative window ("1 day" means
 * 0-1 day, not 0.5-1).
 *
 * `alpha` is set by hand rather than by stacking translucent layers: stacked
 * alpha saturates, so the two innermost steps kept landing within ~0.05 of each
 * other whatever the layer value was, and the five strips never read as five.
 */
const BAND_TIERS = [
  { d: 0.5, label: '12h', phrase: '12 hours', alpha: 0.85 },
  { d: 1, label: '1d', phrase: '24 hours', alpha: 0.58 },
  { d: 3, label: '3d', phrase: '3 days', alpha: 0.38 },
  { d: 7, label: '1w', phrase: 'week', alpha: 0.23 },
  { d: 14, label: '2w', phrase: '2 weeks', alpha: 0.12 },
] as const;

/** Height of the band strip, which hangs BELOW the axis line. */
const STRIP_H = 6;

export default function Act3Visual({ step, isActive, compact = false, availableHeight }: Act3VisualProps) {
  const { ref: svgRef, width: svgWidth, height: containerHeight } = useContainerDim<HTMLDivElement>(900);
  const svgHeight = Math.min(
    compact ? Math.round(svgWidth * 0.9) : Math.round(svgWidth * ASPECT_RATIO),
    availableHeight ?? Infinity,
    containerHeight || Infinity,
  );
  // The punchcard is drawn in its own absolutely-filled box, so measure that
  // box rather than deriving its height from the width alone.
  const { ref: punchRef, height: punchHeight } = useContainerDim<HTMLDivElement>(svgWidth, svgHeight);
  // Reserve the readout line (h-6 + mb-2) that sits above the heatmap.
  const punchChartHeight = Math.max(120, punchHeight - 32);

  const COLOR_GRAY = useThemeVariable("--color-brand-light");
  const COLOR_BRAND = useThemeVariable("--color-brand");

  /** Cut-off (axis units, days) of the hovered deadline band; null = none. */
  const [hoveredBand, setHoveredBand] = useState<number | null>(null);

  // Touch taps are followed by emulated mouse events; ignore hover for a beat
  // and let the click handle pinning (tap the same band again to clear).
  const touchRef = useRef(false);
  const markTouch = () => {
    touchRef.current = true;
    window.setTimeout(() => { touchRef.current = false; }, 700);
  };
  const fromTouch = () => touchRef.current;
  const handleBandHover = (d: number | null) => {
    if (!fromTouch()) setHoveredBand(d);
  };
  const selectBand = (d: number) => {
    const toggle = fromTouch();
    setHoveredBand((prev) => (toggle ? (prev === d ? null : d) : d));
  };

  // Changing substep drops the hover: the strip under the pointer disappears
  // with its axis, so we never get the matching mouseleave.
  useEffect(() => {
    setHoveredBand(null);
  }, [step]);
  // ── Data computation ──

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

    const ROW_H_FOCUS = compact ? 18 : 30;
    // The "all" step stacks every term (58 tracks). On compact screens a 7px
    // pitch overflowed the chart, so tighten it to 5px (4px gaps) to fit all of
    // them inside the pane.
    const ROW_H_GRID = compact ? 5 : 9;

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

    // Cumulative share of commits landing inside a "time left" window, per
    // subset. Same source as the bubbles, so the readout can never drift from
    // the marks it describes.
    const cumulativeShare = (rows: typeof allData, t: number) => {
      let hit = 0;
      let total = 0;
      rows.forEach((d) =>
        d.commits.forEach((c) => {
          total += c[1];
          if (c[0] <= t) hit += c[1];
        }),
      );
      return total ? hit / total : 0;
    };
    const sharesOf = (rows: typeof allData) =>
      BAND_TIERS.map((tier) => cumulativeShare(rows, tier.d));

    const axes = {
      fresh: { scale: scaleFresh, x: TRACK_X, y: freshStartY + freshData.length * ROW_H_FOCUS + 10, w: W_TRACK, shares: sharesOf(freshData) },
      sen: { scale: scaleSen, x: TRACK_X, y: senStartY + senData.length * ROW_H_FOCUS + 10, w: W_TRACK, shares: sharesOf(senData) },
      all: { scale: scaleAll, x: TRACK_X, y: allStartY + allData.length * ROW_H_GRID + 10, w: W_TRACK, shares: sharesOf(allData) }
    };

    return { processedData: pData, axes };
  }, [svgWidth, svgHeight, compact]);

  // ── GSAP animation state machine ──
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

  // ── Non-adjacent jump (fast scrub crossing several substeps at once) ──
  const states: Record<number, () => void> = {
    0: () => setTrackStep(0),
    1: () => setTrackStep(1),
    2: () => setTrackStep(2),
    3: () => {
      gsap.set(".track-group, .axis-group", { opacity: 0 });
      gsap.set(".punchcard-container", { opacity: 1, zIndex: 10 });
    },
  };

  const onJump = (from: number, to: number) => {
    if (to === 3) {
      gsap.killTweensOf(".track-group, .axis-group, .track-line, .commit-bubble, .axis-0, .axis-1, .axis-2");
      gsap.to(".track-group, .axis-group", { opacity: 0, duration: 0.4 });
      gsap.fromTo(
        ".punchcard-container",
        { opacity: 0 },
        { opacity: 1, zIndex: 10, duration: 0.5 },
      );
      return;
    }
    // `animateToTrackStep` restores the per-track opacities from their datasets,
    // so arriving from the punchcard (which flattened them to 0) animates back.
    animateToTrackStep(to);
    if (from === 3) gsap.set(".punchcard-container", { zIndex: -1 });
  };

  useGSAPStateMachine({
    step,
    isActive,

    onInactive: () => {
      gsap.set(".track-group", { opacity: 0 });
      gsap.set(".axis-group", { opacity: 0 });
      gsap.set(".punchcard-container", { opacity: 0, zIndex: -1 });
    },

    states,

    onJump,

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

  /**
   * The five bands, painted as five adjoining strips hanging UNDER the axis line
   * (the line is the top edge of the strip). Each tier owns the span between its
   * own cut-off and the previous one, with a hand-set tone so the five read
   * apart. Hovering a tier flattens its whole cumulative window to that tier's
   * tone, leaving one flat colour from the deadline back to the hovered cut-off.
   */
  const printBands = (toX: (t: number) => number) => {
    const hoveredIdx = hoveredBand === null ? -1 : BAND_TIERS.findIndex((t) => t.d === hoveredBand);

    return (
      <g className="band-strip">
        {BAND_TIERS.map((tier, i) => {
          const bx = toX(tier.d);
          const px = toX(i === 0 ? 0 : BAND_TIERS[i - 1].d);
          const alpha = i <= hoveredIdx ? BAND_TIERS[hoveredIdx].alpha : tier.alpha;
          return (
            <rect
              key={`band-${tier.d}`}
              x={bx}
              y={0}
              width={Math.max(0, px - bx)}
              height={STRIP_H}
              fill={COLOR_BRAND}
              fillOpacity={alpha}
              style={{ transition: 'fill-opacity 200ms ease' }}
            />
          );
        })}
        {/* Hit zones: the same five strips, each one selecting its cumulative
            window (2 weeks, 1 week, 3 days, 24 h, 12 h). */}
        {BAND_TIERS.map((tier, i) => {
          const lo = i === 0 ? 0 : BAND_TIERS[i - 1].d;
          const bx = toX(tier.d);
          const px = toX(lo);
          return (
            <rect
              key={`band-hit-${tier.d}`}
              x={bx}
              y={0}
              width={Math.max(0, px - bx)}
              height={STRIP_H + 5}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => handleBandHover(tier.d)}
              onMouseLeave={() => handleBandHover(null)}
              onClick={() => selectBand(tier.d)}
            />
          );
        })}
      </g>
    );
  };

  /**
   * Horizontal key sitting under the axis. It is right-aligned to the deadline
   * edge and ordered the same way as the strip (2 weeks on the left, the last
   * 12 h on the right), so the swatches can be matched to the strip by tone. It
   * doubles as the hover target: the 12 h strip is only a few pixels wide on the
   * senior/all axes, so picking a band must not depend on hitting it.
   */
  const printBandKey = (deadlineX: number) => {
    const slot = 44;
    const rowY = STRIP_H + 11;
    return (
      <g className="band-key">
        {BAND_TIERS.map((tier, i) => {
          const x = deadlineX - (i + 1) * slot;
          const on = hoveredBand === tier.d;
          return (
            <g
              key={`band-key-${tier.d}`}
              className="cursor-pointer"
              onMouseEnter={() => handleBandHover(tier.d)}
              onMouseLeave={() => handleBandHover(null)}
              onClick={() => selectBand(tier.d)}
            >
              <rect x={x - 4} y={rowY - 16} width={slot} height={26} fill="transparent" />
              <rect x={x} y={rowY - 8} width={8} height={7} fill={COLOR_BRAND} fillOpacity={tier.alpha} />
              <text
                x={x + 12}
                y={rowY}
                className={`font-mono text-[10px] uppercase tracking-[0.1em] ${on ? 'fill-brand-700' : 'fill-slate-500'}`}
              >
                {tier.label}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  /**
   * The percentages, as a sentence. Rendered inside the axis group (so it fades
   * with its axis and steps out of the way for the punchcard) and pinned to the
   * top margin of the chart, where nothing else is drawn.
   */
  const printBandReadout = (axisY: number, w: number, shares: number[]) => {
    const idx = hoveredBand === null ? -1 : BAND_TIERS.findIndex((t) => t.d === hoveredBand);
    return (
      <g
        className="band-readout"
        opacity={idx >= 0 ? 1 : 0}
        style={{ transition: 'opacity 200ms ease' }}
        pointerEvents="none"
      >
        <text
          x={w / 2}
          y={14 - axisY}
          textAnchor="middle"
          className={`font-serif fill-slate-900 ${compact ? 'text-[11px] tracking-wide' : 'text-[13px] tracking-widest'}`}
        >
          {idx >= 0 && (compact ? (
            <>
              <tspan x={w / 2}>
                <tspan className="fill-brand font-semibold">{Math.round(shares[idx] * 100)}%</tspan>
                {` of commits landed in the last ${BAND_TIERS[idx].phrase}`}
              </tspan>
              <tspan x={w / 2} dy="1.35em">before the deadline</tspan>
            </>
          ) : (
            <>
              <tspan className="fill-brand font-semibold">{Math.round(shares[idx] * 100)}%</tspan>
              {` of commits landed in the last ${BAND_TIERS[idx].phrase} before the deadline`}
            </>
          ))}
        </text>
      </g>
    );
  };

  const renderAxis = (axisDef: any, stepIndex: number | number[], className: string) => {
    const isVisible = Array.isArray(stepIndex) ? stepIndex.includes(step) : step === stepIndex;
    const { scale, x, y, w, shares } = axisDef;
    const toX = (t: number) => Math.max(0, Math.min(w, scale(t)));
    const deadlineX = toX(0);

    return (
      <g
        className={`axis-group ${className}`}
        transform={`translate(${x}, ${y})`}
        opacity={isVisible ? 1 : 0}
        pointerEvents={isVisible ? 'auto' : 'none'}
      >
        <line x1={0} x2={w} y1={0} y2={0} stroke={COLOR_BRAND} strokeOpacity={0.3} />
        {printBands(toX)}
        {printBandKey(deadlineX)}
        {printBandReadout(y, w, shares)}
      </g>
    );
  };

  return (
    <div
      ref={svgRef}
      className="w-full flex items-center justify-center"
      onTouchStart={markTouch}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        className="overflow-visible"
        role="img"
        aria-label="File saves across five deadline bands, drawn as tracks of bubbles with a punchcard heatmap. Tap a band or a punchcard cell to see how many files landed in that window."
      >
        <g>
          {processedData.map((d) => {
            return (
              <g
                key={d.id}
                className="track-group"
                data-x0={d.t0.x} data-y0={d.t0.y} data-op0={d.t0.op}
                data-x1={d.t1.x} data-y1={d.t1.y} data-op1={d.t1.op}
                data-x2={d.t2.x} data-y2={d.t2.y} data-op2={d.t2.op}
              >
                <line
                  className="track-line"
                  x1={0} y1={0} y2={0}
                  data-w0={d.t0.w} data-lx0={d.lx0}
                  data-w1={d.t1.w} data-lx1={d.lx1}
                  data-w2={d.t2.w} data-lx2={d.lx2}
                  stroke={COLOR_BRAND}
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />

                <g>
                  {d.bubbles.map((b, idx) => {
                    // A hovered band keeps only the bubbles inside its window.
                    const inBand = hoveredBand !== null && b.day <= hoveredBand;
                    const isFaded = hoveredBand !== null && !inBand;

                    return (
                      <circle
                        key={idx}
                        className="commit-bubble transition-opacity duration-300"
                        data-cx0={b.cx0} data-cx1={b.cx1} data-cx2={b.cx2}
                        cy={0}
                        r={b.radius}
                        fill={inBand ? COLOR_BRAND : COLOR_GRAY}
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

      <div ref={punchRef} className="punchcard-container w-full h-full flex items-center justify-center absolute top-0 left-0 opacity-0">
        <PunchcardHeatmap data={day_hour_counts} width={svgWidth} height={punchChartHeight} flip={compact} />
      </div>
    </div>
  );
}