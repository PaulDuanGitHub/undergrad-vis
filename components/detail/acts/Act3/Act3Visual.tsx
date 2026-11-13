"use client";
import React, { useMemo, useRef } from "react";
import { scalePow } from "d3-scale";
import gsap from "gsap";
import { useGSAPStateMachine } from "@/hooks/useGSAPStateMachine";
import { useContainerDim } from "@/hooks/useContainerDim";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
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
  /** Keyword focus: `band:0.5`, `punch:evening`, `punch:weekend`, or `all`. */
  emphasis?: string | null;
  /** Mobile scroll prototype: finish step transitions faster. */
  fast?: boolean;
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
 * other whatever the layer value was, and the six strips never read as six.
 */
const TERM_ORDER = [
  '2021 Fall',
  '2022 Winter',
  '2022 Fall',
  '2023 Winter',
  '2023 Fall',
  '2024 Winter',
  '2025 Fall',
  '2026 Winter',
] as const;

const AXIS_TICKS = [
  { d: 0, label: '0' },
  { d: 0.5, label: '12h' },
  { d: 1, label: '1d' },
  { d: 2, label: '2d' },
  { d: 3, label: '3d' },
  { d: 7, label: '1w' },
  { d: 14, label: '2w' },
  { d: 21, label: '3w' },
  { d: 28, label: '4w' },
] as const;

const BAND_TIERS = [
  { d: 0.5, label: '12h', phrase: '12 hours', alpha: 0.85 },
  { d: 1, label: '1d', phrase: '24 hours', alpha: 0.58 },
  { d: 2, label: '2d', phrase: '2 days', alpha: 0.47 },
  { d: 3, label: '3d', phrase: '3 days', alpha: 0.38 },
  { d: 7, label: '1w', phrase: 'week', alpha: 0.23 },
  { d: 14, label: '2w', phrase: '2 weeks', alpha: 0.12 },
] as const;

/** Height of the band strip, which hangs BELOW the axis line. */
const STRIP_H = 6;

export default function Act3Visual({ step, isActive, compact = false, availableHeight, emphasis = null, fast = false }: Act3VisualProps) {
  const { ref: svgRef, width: svgWidth, height: containerHeight, measured } =
    useContainerDim<HTMLDivElement>(900);
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

  /**
   * The keyword focus. There are no interactive bands any more: the readout
   * and the shading are driven only by the keyword / note that is focused.
   */
  const focusBand = useMemo(() => {
    if (!emphasis || !emphasis.startsWith('band:')) return null;
    const value = Number(emphasis.slice(5));
    return Number.isFinite(value) ? value : null;
  }, [emphasis]);
  const effectiveBand = focusBand;
  /** A slice (not a cumulative band), e.g. the 12–24h window. */
  const focusSlice = useMemo(() => {
    if (!emphasis || !emphasis.startsWith('slice:')) return null;
    const [lo, hi] = emphasis.slice(6).split('-').map(Number);
    return Number.isFinite(lo) && Number.isFinite(hi) && hi > lo
      ? { lo, hi }
      : null;
  }, [emphasis]);
  const focusWindow =
    focusSlice ?? (effectiveBand !== null ? { lo: 0, hi: effectiveBand } : null);
  const punchFocus =
    emphasis === 'punch:evening'
      ? 'evening'
      : emphasis === 'punch:weekend'
        ? 'weekend'
        : null;
  // ── Data computation ──

  const { processedData, axes, allGroupLabels, trackX, trackWidth, timeScale } = useMemo(() => {
    const allData = heavy_assignments_commits;

    const isFreshman = (term: string) => ["2021 Fall", "2022 Winter"].includes(term);
    const isSenior = (term: string) => ["2025 Fall", "2026 Winter"].includes(term);

    const freshData = allData.filter((d) => isFreshman(d.term));
    const senData = allData.filter((d) => isSenior(d.term));

    const W_TRACK = Math.round(svgWidth * W_TRACK_RATIO);
    const maxTime = Math.max(...allData.flatMap((d) => d.commits.map((c) => c[0])), 1);
    const maxCount = Math.max(...allData.flatMap((d) => d.commits.map((c) => c[1])), 1);

    // One domain for every step, with a square-root scale: the last 12 hours
    // get more room than the long tail, while Freshman, Senior and All keep the
    // same deadline geometry.
    const scale = scalePow().exponent(0.5).domain([0, maxTime]).range([W_TRACK, 0]);
    const radiusFocus = scalePow()
      .exponent(0.5)
      .domain([0, maxCount])
      .range([1, 9]);
    const radiusAll = scalePow()
      .exponent(0.5)
      .domain([0, maxCount])
      .range([0.8, 5]);

    const ROW_H_FOCUS = compact ? 18 : 30;
    // The focused steps (freshman / senior) have different track counts, so a
    // fixed 30px pitch makes the busier year overflow the chart pane. Cap the
    // pitch per step at what the measured height can actually hold.
    const focusAxisReserve = compact ? 38 : 54;
    const freshRowH = Math.min(
      ROW_H_FOCUS,
      (svgHeight - focusAxisReserve) / Math.max(freshData.length, 1),
    );
    const senRowH = Math.min(
      ROW_H_FOCUS,
      (svgHeight - focusAxisReserve) / Math.max(senData.length, 1),
    );
    // The all-assignments step has to fit inside the chart pane at the
    // two-column minimum (960×640, where the SVG is ~386px tall). Derive the
    // row pitch from the measured height instead of assuming a tall desktop.
    const ALL_GROUP_GAP = compact ? 5 : 6;
    const ALL_ROW_H = compact
      ? Math.max(
          3.8,
          Math.min(
            5,
            (svgHeight - 80 - (TERM_ORDER.length - 1) * ALL_GROUP_GAP) /
              allData.length,
          ),
        )
      : Math.max(
          4.4,
          Math.min(
            8,
            (svgHeight - 90 - (TERM_ORDER.length - 1) * ALL_GROUP_GAP) /
              allData.length,
          ),
        );

    const freshStartY = (svgHeight - freshData.length * freshRowH) / 2;
    const senStartY = (svgHeight - senData.length * senRowH) / 2;
    const TRACK_X = (svgWidth - W_TRACK) / 2;

    // The all-assignments step is grouped by term instead of one flat stack.
    const allGroups = TERM_ORDER.map((term) => ({
      term,
      rows: allData.filter((d) => d.term === term),
    }));
    const allLocalIndex = new Map<(typeof allData)[number], number>();
    allGroups.forEach((group) =>
      group.rows.forEach((row, i) => allLocalIndex.set(row, i)),
    );
    const allTotalH =
      allData.length * ALL_ROW_H + (allGroups.length - 1) * ALL_GROUP_GAP;
    const allStartY = (svgHeight - allTotalH) / 2;
    const allGroupStart = new Map<string, number>();
    const allGroupLabels: { term: string; y: number; top: number; bottom: number }[] = [];
    let allCursor = allStartY;
    allGroups.forEach((group) => {
      const groupTop = allCursor;
      const groupBottom = groupTop + group.rows.length * ALL_ROW_H;
      allGroupStart.set(group.term, allCursor);
      allGroupLabels.push({
        term: group.term,
        y: (groupTop + groupBottom) / 2,
        top: groupTop,
        bottom: groupBottom,
      });
      allCursor += group.rows.length * ALL_ROW_H + ALL_GROUP_GAP;
    });

    const pData = allData.map((d, i) => {
      const isF = isFreshman(d.term);
      const isS = isSenior(d.term);
      const fIdx = freshData.indexOf(d);
      const sIdx = senData.indexOf(d);

      const t0 = {
        x: TRACK_X,
        y: isF ? freshStartY + fIdx * freshRowH : (isS ? -100 : 800),
        w: W_TRACK, op: isF ? 1 : 0
      };

      const t1 = {
        x: TRACK_X,
        y: isS ? senStartY + sIdx * senRowH : (isF ? 800 : 800),
        w: W_TRACK, op: isS ? 1 : 0
      };

      const t2 = {
        x: TRACK_X,
        y:
          (allGroupStart.get(d.term) ?? allStartY) +
          (allLocalIndex.get(d) ?? 0) * ALL_ROW_H,
        w: W_TRACK, op: 1
      };

      const bubbles = d.commits.map((c) => ({
        day: c[0],
        count: c[1],
        r0: radiusFocus(c[1]),
        r1: radiusFocus(c[1]),
        r2: radiusAll(c[1]),
        cx0: scale(c[0]),
        cx1: scale(c[0]),
        cx2: scale(c[0]),
      }));

      const maxDay = Math.max(...d.commits.map((c) => c[0]), 0);
      const lx0 = scale(maxDay);
      const lx1 = scale(maxDay);
      const lx2 = scale(maxDay);

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
      fresh: { scale, x: TRACK_X, y: freshStartY + freshData.length * freshRowH + 10, w: W_TRACK, shares: sharesOf(freshData) },
      sen: { scale, x: TRACK_X, y: senStartY + senData.length * senRowH + 10, w: W_TRACK, shares: sharesOf(senData) },
      all: { scale, x: TRACK_X, y: allStartY + allTotalH + 10, w: W_TRACK, shares: sharesOf(allData) }
    };

    return {
      processedData: pData,
      axes,
      allGroupLabels,
      trackX: TRACK_X,
      trackWidth: W_TRACK,
      timeScale: scale,
    };
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
    gsap.set(".commit-bubble", {
      attr: {
        cx: (i, el) => el.dataset[`cx${s}`],
        r: (i, el) => el.dataset[`r${s}`],
      },
    });
    gsap.set(".punchcard-container", { opacity: 0, zIndex: -1 });
    gsap.set(".axis-0", { opacity: s === 0 ? 1 : 0 });
    gsap.set(".axis-1", { opacity: s === 1 ? 1 : 0 });
    gsap.set(".axis-2", { opacity: s === 2 ? 1 : 0 });
    gsap.set(".all-group-label-layer", { opacity: s === 2 ? 1 : 0 });
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
      attr: {
        cx: (i, el) => el.dataset[`cx${s}`],
        r: (i, el) => Number(el.dataset[`r${s}`]),
      },
      duration: dur,
      ease,
    });
    gsap.to(".axis-0", { opacity: s === 0 ? 1 : 0, duration: 0.5 });
    gsap.to(".axis-1", { opacity: s === 1 ? 1 : 0, duration: 0.5 });
    gsap.to(".axis-2", { opacity: s === 2 ? 1 : 0, duration: 0.5 });
    gsap.to(".all-group-label-layer", {
      opacity: s === 2 ? 1 : 0,
      duration: 0.5,
    });
  };

  // ── Non-adjacent jump (fast scrub crossing several substeps at once) ──
  const states: Record<number, () => void> = {
    0: () => setTrackStep(0),
    1: () => setTrackStep(1),
    2: () => setTrackStep(2),
    3: () => {
      gsap.set(".track-group, .axis-group, .all-group-label-layer", { opacity: 0 });
      gsap.set(".punchcard-container", { opacity: 1, zIndex: 10 });
    },
  };

  const onJump = (from: number, to: number) => {
    if (to === 3) {
      gsap.killTweensOf(".track-group, .axis-group, .track-line, .commit-bubble, .axis-0, .axis-1, .axis-2, .all-group-label-layer");
      gsap.to(".track-group, .axis-group, .all-group-label-layer", { opacity: 0, duration: 0.4 });
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

  // ── Re-seat when the pane is measured / resized ──
  // Tracks, bubbles and the axis are placed by GSAP from pixel offsets derived
  // from `svgWidth`/`svgHeight`. The figure is first rendered on the fallback
  // 900×585 box, so without this the tracks keep their old x offset while the
  // SVG shrinks to the phone width — the whole track stack slides off the right
  // edge (the step-0 "tracks pushed right" bug). A later resize has the same
  // failure mode, so the measured geometry is the trigger, not the step.
  const geometryKey = `${Math.round(svgWidth)}x${Math.round(svgHeight)}x${compact ? 'c' : 'f'}`;
  const lastGeometry = useRef<string | null>(null);
  useIsomorphicLayoutEffect(() => {
    // Before measurement the state machine is held back (see below), so its
    // first seat already uses the real box; there is nothing to repair yet.
    if (!measured) return;
    if (lastGeometry.current === null) {
      lastGeometry.current = geometryKey;
      return;
    }
    if (lastGeometry.current === geometryKey) return;
    lastGeometry.current = geometryKey;
    if (!isActive) return;
    gsap.killTweensOf(
      ".track-group, .axis-group, .track-line, .commit-bubble, .axis-0, .axis-1, .axis-2, .all-group-label-layer, .punchcard-container",
    );
    states[step]?.();
    // Intentionally keyed on the geometry alone: `step`/`isActive` flips are
    // the state machine's job, this effect only repairs a stale measurement.
  }, [geometryKey, measured, isActive, step]);

  useGSAPStateMachine({
    step,
    // Hold the first seat until the pane has a real size (see Act2Visual).
    isActive: isActive && measured,
    speed: fast ? 1.6 : 1,

    onInactive: () => {
      gsap.set(".track-group", { opacity: 0 });
      gsap.set(".axis-group", { opacity: 0 });
      gsap.set(".all-group-label-layer", { opacity: 0 });
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
        gsap.killTweensOf(".track-group, .axis-group, .track-line, .commit-bubble, .axis-0, .axis-1, .axis-2, .all-group-label-layer");
        gsap.to(".track-group, .axis-group, .all-group-label-layer", { opacity: 0, duration: 0.5 });
        gsap.to(".punchcard-container", { opacity: 1, zIndex: 10, duration: 0.5 });
      },
      "3->2": () => animateToTrackStep(2),
    },
  });

  /**
   * The percentages, as a sentence. Rendered inside the axis group (so it fades
   * with its axis and steps out of the way for the punchcard) and pinned to the
   * top margin of the chart, where nothing else is drawn.
   */
  const printBandReadout = (axisY: number, w: number, shares: number[]) => {
    const idx = effectiveBand === null ? -1 : BAND_TIERS.findIndex((t) => t.d === effectiveBand);
    const active = focusSlice !== null || idx >= 0;
    const value = focusSlice
      ? Math.max(0, (shares[1] ?? 0) - (shares[0] ?? 0))
      : idx >= 0
        ? shares[idx]
        : 0;
    const lead =
      focusSlice !== null
        ? ' of commits landed in the 12–24 hour window'
        : idx >= 0
          ? ` of commits landed in the last ${BAND_TIERS[idx].phrase}`
          : '';

    return (
      <g
        className="band-readout"
        opacity={active ? 1 : 0}
        style={{ transition: 'opacity 200ms ease' }}
        pointerEvents="none"
      >
        <text
          x={w / 2}
          y={14 - axisY}
          textAnchor="middle"
          className={`font-serif fill-slate-900 ${compact ? 'text-[11px] tracking-wide' : 'text-[13px] tracking-widest'}`}
        >
          {active && (compact ? (
            <>
              <tspan x={w / 2}>
                <tspan className="fill-brand font-semibold">{Math.floor(value * 100)}%</tspan>
                {lead}
              </tspan>
              <tspan x={w / 2} dy="1.35em">before the deadline</tspan>
            </>
          ) : (
            <>
              <tspan className="fill-brand font-semibold">{Math.floor(value * 100)}%</tspan>
              {`${lead} before the deadline`}
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
    const ticks = AXIS_TICKS;

    return (
      <g
        className={`axis-group ${className}`}
        transform={`translate(${x}, ${y})`}
        opacity={isVisible ? 1 : 0}
        pointerEvents="none"
      >
        <line x1={0} x2={w} y1={0} y2={0} stroke={COLOR_BRAND} strokeOpacity={0.3} />
        {ticks.map(({ d, label }, index) => {
          const tx = toX(d);
          return (
            <g key={d} transform={`translate(${tx}, 0)`}>
              <line y1={0} y2={5} stroke="#94A3B8" strokeWidth={0.75} />
              <text
                y={17 + (index % 2) * 12}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[9px] tracking-[0.08em]"
              >
                {label}
              </text>
            </g>
          );
        })}
        <text
          x={0}
          y={46}
          textAnchor="start"
          className="fill-slate-500 font-mono text-[9px] uppercase tracking-[0.12em]"
        >
          time before deadline · √ scale
        </text>
        {printBandReadout(y, w, shares)}
      </g>
    );
  };

  return (
    <div
      ref={svgRef}
      className="relative w-full h-full flex items-center justify-center"
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        className="overflow-visible"
        role="img"
        aria-label="File saves across time before each deadline, drawn as tracks of bubbles with a punchcard heatmap. The shading marks the focused deadline window; tap a punchcard cell to see how many files landed in that hour."
      >
        <g className="axis-grid" opacity={step < 3 ? 1 : 0} pointerEvents="none">
          {AXIS_TICKS.map(({ d }) => {
            const gx = trackX + timeScale(d);
            return (
              <line
                key={d}
                x1={gx}
                x2={gx}
                y1={0}
                y2={svgHeight}
                stroke="#E2E8F0"
                strokeWidth={0.5}
                strokeOpacity={0.8}
              />
            );
          })}
        </g>
        {focusWindow !== null && step !== 3 && (
          <g
            key={`${focusWindow.lo}-${focusWindow.hi}`}
            className="twelve-hour-shade"
            pointerEvents="none"
          >
            <rect
              x={trackX + timeScale(focusWindow.hi)}
              y={0}
              width={Math.max(
                0,
                timeScale(focusWindow.lo) - timeScale(focusWindow.hi),
              )}
              height={svgHeight}
              fill={COLOR_BRAND}
              fillOpacity={0.07}
            />
            {[focusWindow.lo, focusWindow.hi].map((edge) => (
              <line
                key={edge}
                x1={trackX + timeScale(edge)}
                x2={trackX + timeScale(edge)}
                y1={0}
                y2={svgHeight}
                stroke={COLOR_BRAND}
                strokeOpacity={0.2}
                strokeDasharray="2 4"
              />
            ))}
          </g>
        )}

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
                    // A focused window keeps only the bubbles inside it. A
                    // slice (12–24h) excludes its near edge, so the boundary
                    // dots stay with the preceding 12h window.
                    const inBand =
                      focusWindow !== null &&
                      (focusSlice
                        ? b.day > focusWindow.lo && b.day <= focusWindow.hi
                        : b.day <= focusWindow.hi);
                    const isFaded = focusWindow !== null && !inBand;

                    return (
                      <circle
                        key={idx}
                        className="commit-bubble transition-opacity duration-300"
                        data-cx0={b.cx0} data-cx1={b.cx1} data-cx2={b.cx2}
                        data-r0={b.r0} data-r1={b.r1} data-r2={b.r2}
                        cy={0}
                        r={b.r0}
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

        <g className="all-group-label-layer" aria-hidden="true">
          {allGroupLabels.map(({ term, y, top, bottom }) => (
            <g key={term}>
              <line
                x1={trackX - 5}
                x2={trackX - 5}
                y1={top}
                y2={bottom}
                stroke="#CBD5E1"
                strokeWidth={1}
                strokeOpacity={0.75}
              />
              <text
                x={trackX - 12}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-slate-600 font-serif uppercase tracking-widest"
                style={{ fontSize: compact ? 8 : 10 }}
              >
                {term}
              </text>
            </g>
          ))}
        </g>

        {renderAxis(axes.fresh, 0, "axis-0")}
        {renderAxis(axes.sen, 1, "axis-1")}
        {renderAxis(axes.all, 2, "axis-2")}

      </svg>

      <div ref={punchRef} className="punchcard-container w-full h-full flex items-center justify-center absolute top-0 left-0 opacity-0">
        <PunchcardHeatmap data={day_hour_counts} width={svgWidth} height={punchChartHeight} flip={compact} focus={punchFocus} />
      </div>
    </div>
  );
}
