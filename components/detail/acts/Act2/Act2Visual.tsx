'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  stack,
  stackOffsetWiggle,
  stackOrderInsideOut,
  area,
  curveBasis,
} from 'd3-shape';
import { scaleLinear } from 'd3-scale';
import { min, max } from 'd3-array';
import gsap from 'gsap';
import { useGSAPStateMachine } from '@/hooks/useGSAPStateMachine';
import { useContainerDim } from '@/hooks/useContainerDim';
import term_extensions from '@/data/term_extensions.json';
import ext_courses from '@/data/ext_courses.json';
import { extension } from '@/constants/extension';
import { useThemeVariable } from '@/hooks/useThemeVariable';
import ExtensionLabels from './ExtensionLabels';
import { buildLabelLayout, GROUPED_KEYS, BADGE_W, STREAM_INSET } from './act2Layout';

// --- Types ---
export interface StreamData {
  term: string;
  term_index: number;
  [key: string]: string | number;
}

interface Act2VisualProps {
  step: number;
  isActive: boolean;
  compact?: boolean;
  /** Height of the visual pane; compact charts use it to avoid a letterboxed 46%. */
  availableHeight?: number;
  /** Keyword focus: `format:.tex`, `course:NLP`, or `all`. */
  emphasis?: string | null;
}

const ASPECT_RATIO = 550 / 850; // height / width

/** The shared label layer's mode for each Act 2 substep. */
const MODES = ['glossary', 'parallel', 'bars', 'legend'] as const;

const extToCoursesMapping = ext_courses as Record<string, string[]>;
const data = term_extensions['data'] as StreamData[];
const keys = term_extensions['keys'] as string[];

/**
 * Visual row of each extension in the glossary. The chips are rendered in RANK
 * order (`rankedKeys.map`) but the glossary lays them out in GROUPED order, so
 * an index-based stagger lights the 16 badges up in a scrambled sequence that
 * doesn't match the description panels beside them. `stagger` accepts a
 * function whose return is the child's position in seconds, so we can order by
 * the row the viewer actually sees.
 */
const GLOSSARY_ROW = new Map(GROUPED_KEYS.map((k, i) => [k, i]));
const GLOSSARY_LAST = GROUPED_KEYS.length - 1;
/**
 * Stagger position (seconds) ordered by the glossary's visual row, so the chip,
 * its text and its indicator all sweep top-to-bottom together. `reverse` runs
 * bottom-to-top (0→1 leaves the glossary, 1→0 unwinds back into it). Reads the
 * key off the enclosing `.ext-label` because only the button carries `data-key`.
 */
const staggerByGlossaryRow =
  (each = 0.025, reverse = false) =>
  (i: number, el: Element) => {
    const chip = el.closest('.ext-label') as HTMLElement | null;
    const row = GLOSSARY_ROW.get(chip?.dataset.key || '') ?? 0;
    return (reverse ? GLOSSARY_LAST - row : row) * each;
  };

export default function Act2Visual({
  step,
  isActive,
  compact = false,
  availableHeight,
  emphasis = null,
}: Act2VisualProps) {
  const { ref: svgRef, width: svgWidth, height: containerHeight } = useContainerDim<HTMLDivElement>(850);
  const aspectHeight = Math.round(svgWidth * ASPECT_RATIO);
  const svgHeight = Math.min(
    compact ? Math.round(svgWidth * 1.08) : aspectHeight,
    // Only the bar/stream steps draw semester ticks below the SVG; reserve room
    // for them there so the ticks stay inside the visual pane. The glossary and
    // parallel steps use the full pane.
    Math.max(160, (availableHeight ?? Infinity) - (compact && step >= 2 ? 76 : 0)),
    containerHeight || Infinity,
  );

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Touch taps are followed by emulated mouse events, so hover handlers are
  // ignored briefly after a touch; the click handler owns selection there.
  const touchRef = useRef(false);
  const markTouch = () => {
    touchRef.current = true;
    window.setTimeout(() => { touchRef.current = false; }, 700);
  };
  const fromTouch = () => touchRef.current;
  const handleHover = (key: string | null) => {
    if (!fromTouch()) setHoveredKey(key);
  };
  const selectKey = (key: string) => {
    const toggle = fromTouch();
    setHoveredKey((prev) => (toggle ? (prev === key ? null : key) : key));
  };

  // A selection from the previous stage must not survive into the next one.
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot reset when the substep changes */
  useEffect(() => {
    setHoveredKey(null);
  }, [step]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * The keyword focus, expressed in the same vocabulary as pointer hover:
   * a format key or a course name. `effectiveKey` lets a pointer override the
   * keyword for a moment, then fall back to it; `null` means no filter.
   */
  const focusKey = useMemo(() => {
    if (!emphasis || emphasis === 'all') return null;
    if (emphasis.startsWith('format:')) return emphasis.slice(7);
    if (emphasis.startsWith('course:')) return emphasis.slice(7);
    return null;
  }, [emphasis]);
  const effectiveKey = hoveredKey ?? focusKey;

  // ── Theme colors ──
  const brand50 = useThemeVariable('--color-brand-50') || '#FEF6F5';
  const brand500 = useThemeVariable('--color-brand-500') || '#E7604A';
  const brand600 = useThemeVariable('--color-brand-600') || '#D4442E';
  const surface = useThemeVariable('--color-surface') || '#FFFFFF';
  const textPrimary = useThemeVariable('--color-text-primary') || '#292524';

  // ── Counts and rank order (hoisted so the shared labels reuse them) ──
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    keys.forEach((k) => (c[k] = 0));
    data.forEach((d) => keys.forEach((k) => (c[k] += Number(d[k]) || 0)));
    return c;
  }, []);

  const rankedKeys = useMemo(
    () => [...keys].sort((a, b) => counts[b] - counts[a]),
    [counts],
  );

  // Steps 2-3 stay in the grey family — no hue-encoding of the formats — but a
  // cool → warm temperature drift down the ranking keeps the bars / stream from
  // reading as one flat wash: the most-used formats are a cool slate, the
  // least-used ones a warm off-white.
  const colorByKey = useMemo(() => {
    const n = rankedKeys.length;
    const ramp = scaleLinear<string>()
      .domain([0, (n - 1) / 2, Math.max(1, n - 1)])
      .range(['#a2a6ab', '#b2bac3']);
    return Object.fromEntries(
      rankedKeys.map((k, i) => [k, ramp(i)]),
    ) as Record<string, string>;
  }, [rankedKeys]);

  // Shared geometry for the label layer, the parallel-set links and the bars.
  const layout = useMemo(
    () => buildLabelLayout(rankedKeys, svgWidth, svgHeight, compact),
    [rankedKeys, svgWidth, svgHeight, compact],
  );

  // ── D3 Math Engine (layout computation only; animation is handled by GSAP) ──
  const { pathsData, streamXScale, streamTop } = useMemo(() => {
    const N = data.length;

    const maxVal = Math.max(...rankedKeys.map((k) => counts[k]));
    const barXScale = scaleLinear()
      .domain([0, maxVal])
      .range([0, svgWidth - layout.chartX0 - 24]);
    const rankIndex = Object.fromEntries(
      rankedKeys.map((k, i) => [k, i]),
    ) as Record<string, number>;
    const barH = compact ? 9 : 14;

    const stackGenerator = stack<StreamData>()
      .keys(keys)
      .offset(stackOffsetWiggle)
      .order(stackOrderInsideOut);
    const series = stackGenerator(data);
    const streamXScale = scaleLinear()
      .domain([0, N - 1])
      .range([STREAM_INSET, svgWidth - STREAM_INSET]);

    // Step 3 overlays the 16 legend chips at the top; start the river below
    // them instead of letting the two share the same pixels.
    const streamTop = Math.min(
      layout.legendBottom + (compact ? 10 : 14),
      svgHeight - 60,
    );

    const yMin = min(series, (layer) => min(layer, (d) => d[0])) || 0;
    const yMax = max(series, (layer) => max(layer, (d) => d[1])) || 0;
    const streamYScale = scaleLinear()
      .domain([yMin * 1.2, yMax * 1.2])
      .range([svgHeight, streamTop]);

    const streamArea = area<any>()
      .x((d, i) => streamXScale(i))
      .y0((d) => streamYScale(d[0]))
      .y1((d) => streamYScale(d[1]))
      .curve(curveBasis);

    const pathsData = series.map((layer) => {
      const key = layer.key;
      const barW = barXScale(counts[key]);
      // the bar sits on ITS OWN label row, so label + value + bar are one line
      const yTop = layout.evenCenterY(rankIndex[key]) - barH / 2;
      const barArea = area<any>()
        .x((d, i) => layout.chartX0 + (i / (N - 1)) * barW)
        .y0(yTop + barH)
        .y1(yTop)
        .curve(curveBasis);

      return {
        key,
        color: colorByKey[key],
        pathBar: barArea(layer) || '',
        pathStream: streamArea(layer) || '',
        clipId: `clip-${key.substring(1)}`,
        // the reveal rect covers the bar's run from the label column, not from x=0
        clipW: layout.chartX0 + barW + 12,
      };
    });

    return { pathsData, streamXScale, streamTop };
  }, [rankedKeys, counts, colorByKey, layout, svgWidth, svgHeight, compact]);

  // ── Parallel Sets: unified layout engine ──
  // The left-hand labels are the shared ExtensionLabels; this only lays out the
  // courses (right nodes) and the links from the label column into them.
  const PS = useMemo(() => {
    const PAD_Y = compact ? 20 : 30;

    const RIGHT_X = svgWidth - 120;
    const LINK_END_X = RIGHT_X - 15;

    const INDICATOR_W = compact ? 3 : 6;
    const INDICATOR_H = compact ? 4 : 8;
    const INDICATOR_GAP = 5;

    const CLIP_OVERFLOW = 100;

    const rightNodes = Array.from(
      new Set(Object.values(extToCoursesMapping).flat())
    ).sort();

    const rightY = (i: number) =>
      rightNodes.length <= 1
        ? svgHeight / 2
        : PAD_Y + i * ((svgHeight - PAD_Y * 2) / (rightNodes.length - 1));

    const rightNodeData = rightNodes.map((course, i) => ({ course, y: rightY(i) }));

    // Link data: the y1 anchor is the shared label's parallel-mode row.
    const links: { ext: string; course: string; y1: number; y2: number }[] = [];
    GROUPED_KEYS.forEach((ext, i) => {
      const courses = extToCoursesMapping[ext] || [];
      const y1 = layout.evenCenterY(i);
      courses.forEach((course) => {
        const rIdx = rightNodes.indexOf(course);
        if (rIdx !== -1) links.push({ ext, course, y1, y2: rightY(rIdx) });
      });
    });

    return {
      rightNodeData,
      links,
      RIGHT_X,
      LINK_END_X,
      INDICATOR_W,
      INDICATOR_H,
      INDICATOR_GAP,
      CLIP_OVERFLOW,
    };
  }, [svgWidth, svgHeight, compact, layout]);

  const drawCurve = (x1: number, y1: number, x2: number, y2: number) => {
    const cpX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${x2} ${y2}`;
  };

  // Reverse mapping: course → extensions (for bidirectional highlight)
  const courseToExtsMapping = useMemo(() => {
    const mapping: Record<string, string[]> = {};
    for (const [ext, courses] of Object.entries(extToCoursesMapping)) {
      for (const course of courses) {
        if (!mapping[course]) mapping[course] = [];
        mapping[course].push(ext);
      }
    }
    return mapping;
  }, []);

  // Compute which extensions and courses should be highlighted based on hoveredKey
  const { highlightedExts, highlightedCourses } = useMemo(() => {
    const empty = {
      highlightedExts: new Set<string>(),
      highlightedCourses: new Set<string>(),
    };
    if (!effectiveKey) return empty;

    const exts = new Set<string>();
    const courses = new Set<string>();

    // Hovering on an extension (left node)
    if (extToCoursesMapping[effectiveKey]) {
      exts.add(effectiveKey);
      (extToCoursesMapping[effectiveKey] || []).forEach((c) => courses.add(c));
      return { highlightedExts: exts, highlightedCourses: courses };
    }

    // Hovering on a course (right node)
    const linkedExts = courseToExtsMapping[effectiveKey];
    if (linkedExts) {
      courses.add(effectiveKey);
      linkedExts.forEach((e) => exts.add(e));
      return { highlightedExts: exts, highlightedCourses: courses };
    }

    return empty;
  }, [effectiveKey, courseToExtsMapping, extToCoursesMapping]);

  // ── GSAP State Machine ──

  /** Deferred second half of a jump cross-fade; killed if the state moves on. */
  const jumpRef = useRef<gsap.core.Tween | null>(null);

  /** Kill all in-flight tweens on animated elements to prevent overlap on fast scrubbing */
  const killAll = () => {
    jumpRef.current?.kill();
    jumpRef.current = null;
    gsap.killTweensOf(
      '.layer-glossary, .layer-parallel, .layer-bar-stream, .desc-container, .desc-text, .parallel-clip-rect, .parallel-right-node, .morph-path, .path-clip-rect, .stream-label, .ext-label, .lbl-fill, .lbl-text, .lbl-ind, .lbl-count'
    );
  };

  // ── The shared labels: geometry + chrome per step ──
  // `x`/`y` are deltas on top of each chip's React-rendered base (the ranked
  // even grid), so a mode is fully described by the data attributes set in
  // ExtensionLabels (g*/p*/l*). 'bars' IS the base, hence x/y = 0.
  //
  // The label TEXT's horizontal inset is GSAP's too — the chip's flex box is
  // constant, so 'glossary' tucks the text inside the badge plate, 'parallel'
  // right-aligns it at the link fan, and 'bars'/'legend' use the column pad.
  // Animating it with the movement is what stops those realignments snapping.
  const TEXT_PAD = compact ? 8 : 10;
  const PAR_PAD_R = compact ? 10 : 14;
  const labelTextX =
    (mode: 'glossary' | 'parallel' | 'bars' | 'legend') =>
    (i: number, el: Element) => {
      const chip = el.parentElement as HTMLElement | null;
      const w = chip ? chip.clientWidth : 0;
      if (mode === 'glossary') return (w - BADGE_W) / 2 + (compact ? 6 : 8);
      if (mode === 'parallel') return w - PAR_PAD_R - (el as HTMLElement).offsetWidth;
      return TEXT_PAD;
    };
  const labelIndX =
    (mode: 'glossary' | 'parallel' | 'bars' | 'legend') =>
    (i: number, el: Element) => {
      if (mode !== 'parallel') return 0;
      const chip = el.parentElement as HTMLElement | null;
      return (chip ? chip.clientWidth : 0) - 6;
    };

  const setLabelState = (mode: 'glossary' | 'parallel' | 'bars' | 'legend') => {
    // `opacity: 1` as well: the transitions duck the chip mid-flight, so a step
    // jump that kills such a tween would otherwise leave the labels part-dim.
    gsap.set('.ext-label', {
      x: (i, el) =>
        mode === 'bars' ? 0 : Number((el as HTMLElement).dataset[`${mode[0]}x`]),
      y: (i, el) =>
        mode === 'bars' ? 0 : Number((el as HTMLElement).dataset[`${mode[0]}y`]),
      opacity: 1,
    });
    gsap.set('.lbl-text', { x: labelTextX(mode) });
    gsap.set('.lbl-fill', { opacity: mode === 'glossary' ? 1 : 0 });
    gsap.set('.lbl-ind', {
      x: labelIndX(mode),
      opacity: mode === 'glossary' || mode === 'bars' ? 0 : 1,
    });
    gsap.set('.lbl-count', { opacity: mode === 'bars' ? 1 : 0 });
  };

  // ── Static state setters (instant) ──
  const setGlossaryState = (active: boolean) => {
    gsap.set('.layer-glossary', {
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'auto' : 'none',
      zIndex: active ? 10 : 0,
    });
    gsap.set('.desc-container', {
      width: active ? layout.descW : 0,
      paddingLeft: active ? 8 : 0,
      paddingRight: active ? 8 : 0,
    });
    gsap.set('.desc-text', { opacity: active ? 1 : 0 });
  };

  const setParallelState = (active: boolean) => {
    gsap.set('.layer-parallel', {
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'auto' : 'none',
      zIndex: active ? 10 : 0,
    });
    gsap.set('.parallel-clip-rect', { attr: { width: active ? svgWidth : 0 } });
    gsap.set('.parallel-right-node', { x: 0, opacity: active ? 1 : 0 });
  };

  const setBarStreamState = (mode: 'hidden' | 'bar' | 'stream') => {
    const active = mode !== 'hidden';
    gsap.set('.layer-bar-stream', {
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'auto' : 'none',
      zIndex: active ? 10 : 0,
    });

    if (!active) {
      gsap.set('.path-clip-rect', { attr: { width: 0 } });
      gsap.set('.stream-label', { opacity: 0, y: 10 });
      return;
    }

    gsap.set('.morph-path', {
      attr: {
        d: (i, el) => (mode === 'bar' ? el.dataset.dbar : el.dataset.dstream) || '',
      },
    });
    gsap.set('.path-clip-rect', {
      attr: { width: mode === 'bar' ? (i, el) => Number(el.dataset.w) : svgWidth },
    });
    gsap.set('.stream-label', {
      opacity: mode === 'stream' ? 1 : 0,
      y: mode === 'stream' ? 0 : 10,
    });
  };

  // ── Dynamic transition functions (timelines) ──
  const transition0To0 = () => {
    killAll();
    setParallelState(false);
    setBarStreamState('hidden');
    setLabelState('glossary');
    gsap.set('.layer-glossary', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });
    gsap.set('.desc-container', { width: 0, paddingLeft: 0, paddingRight: 0 });
    gsap.set('.desc-text', { opacity: 1 });

    const tl = gsap.timeline();
    tl.fromTo(
      '.ext-label',
      { x: (i, el) => Number((el as HTMLElement).dataset.gx) - 24, opacity: 0 },
      {
        x: (i, el) => Number((el as HTMLElement).dataset.gx),
        opacity: 1,
        duration: 0.35,
        stagger: staggerByGlossaryRow(0.025),
        ease: 'power2.out',
      },
    ).to(
      '.desc-container',
      {
        width: layout.descW,
        paddingLeft: 8,
        paddingRight: 8,
        duration: 0.6,
        stagger: 0.02,
        ease: 'power2.out',
      },
      '-=0.35',
    );
  };

  /**
   * 0 -> 1: the descriptions retract and the labels leave the glossary — the
   * badge plates deflate into bare labels while the 16 travel from the centred
   * glossary column into the evenly-spaced left column. Only then do the links
   * draw out of the settled column. (Order is unchanged: still grouped.)
   */
  const transition0To1 = () => {
    killAll();
    // Seat the step we're leaving: a step jump can cancel a tween half-way, and
    // every tween below would then animate OUT of that half-applied state.
    setLabelState('glossary');
    setBarStreamState('hidden');
    gsap.set('.layer-parallel', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });

    const tl = gsap.timeline();
    tl.to(
      '.desc-text',
      { opacity: 0, duration: 0.2, stagger: { each: 0.012, from: 'end' } },
      0,
    )
      .to(
        '.desc-container',
        {
          width: 0,
          paddingLeft: 0,
          paddingRight: 0,
          duration: 0.35,
          ease: 'power2.in',
          stagger: { each: 0.015, from: 'end' },
        },
        0.05,
      )
      .to('.layer-glossary', { opacity: 0, duration: 0.2 }, 0.4)
      .set('.layer-glossary', { pointerEvents: 'none', zIndex: 0 }, 0.6)
      // the labels travel + reshape, top-to-bottom in their glossary row order
      .to(
        '.ext-label',
        {
          x: (i, el) => Number((el as HTMLElement).dataset.px),
          y: (i, el) => Number((el as HTMLElement).dataset.py),
          duration: 0.7,
          ease: 'power3.inOut',
          stagger: staggerByGlossaryRow(0.02),
        },
        0.15,
      )
      .to('.lbl-fill', { opacity: 0, duration: 0.4 }, 0.2)
      .to(
        '.lbl-text',
        {
          x: labelTextX('parallel'),
          duration: 0.7,
          ease: 'power3.inOut',
          stagger: staggerByGlossaryRow(0.02),
        },
        0.15,
      )
      .to(
        '.lbl-ind',
        {
          x: labelIndX('parallel'),
          opacity: 1,
          duration: 0.6,
          ease: 'power3.inOut',
          stagger: staggerByGlossaryRow(0.02),
        },
        0.35,
      )
      // No opacity dip on the way out of the glossary: the row order doesn't
      // change, so dimming the chips and bringing them back just reads as a
      // flicker. This only guarantees they land fully opaque if an interrupted
      // entrance left them part-way.
      .to(
        '.ext-label',
        { opacity: 1, duration: 0.25, stagger: staggerByGlossaryRow(0.015) },
        0.15,
      )
      .fromTo(
        '.parallel-clip-rect',
        { attr: { width: 0 } },
        { attr: { width: svgWidth }, duration: 0.8, ease: 'power3.out' },
        0.6,
      )
      .fromTo(
        '.parallel-right-node',
        { opacity: 0 },
        { opacity: 1, duration: 0.35, stagger: 0.01 },
        1.0,
      );
  };

  const transition1To0 = () => {
    killAll();
    setLabelState('parallel');
    setBarStreamState('hidden');
    gsap.set('.layer-glossary', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });
    gsap.set('.desc-container', { width: 0, paddingLeft: 0, paddingRight: 0 });
    gsap.set('.desc-text', { opacity: 0 });

    const tl = gsap.timeline();
    tl.to('.parallel-clip-rect', { attr: { width: 0 }, duration: 0.5, ease: 'power2.in' }, 0)
      .to('.parallel-right-node', { opacity: 0, duration: 0.25 }, 0)
      .set('.layer-parallel', { opacity: 0, pointerEvents: 'none', zIndex: 0 }, 0.55)
      .to(
        '.ext-label',
        {
          x: (i, el) => Number((el as HTMLElement).dataset.gx),
          y: (i, el) => Number((el as HTMLElement).dataset.gy),
          duration: 0.7,
          ease: 'power3.inOut',
          stagger: staggerByGlossaryRow(0.02, true),
        },
        0.35,
      )
      .to(
        '.lbl-text',
        {
          x: labelTextX('glossary'),
          duration: 0.7,
          ease: 'power3.inOut',
          stagger: staggerByGlossaryRow(0.02, true),
        },
        0.35,
      )
      .to('.lbl-fill', { opacity: 1, duration: 0.4 }, 0.4)
      .to(
        '.lbl-ind',
        {
          x: labelIndX('glossary'),
          opacity: 0,
          duration: 0.4,
          stagger: staggerByGlossaryRow(0.02, true),
        },
        0.4,
      )
      // Mirrors 0→1: no dip, just settle any half-finished state to opaque.
      .to(
        '.ext-label',
        { opacity: 1, duration: 0.25, stagger: staggerByGlossaryRow(0.015, true) },
        0.35,
      )
      .to(
        '.desc-container',
        {
          width: layout.descW,
          paddingLeft: 8,
          paddingRight: 8,
          duration: 0.45,
          stagger: 0.02,
          ease: 'power2.out',
        },
        1.0,
      )
      .to('.desc-text', { opacity: 1, duration: 0.25, stagger: 0.02 }, 1.25);
  };

  /**
   * 1 -> 2: the links retract, the labels SORT into volume-rank order, and only
   * once they settle do the bars grow out of the column — the totals appear in
   * the column beside each label. This is the act's one re-order.
   */
  const transition1To2 = () => {
    killAll();
    setGlossaryState(false);
    setLabelState('parallel');
    gsap.set('.layer-parallel', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });
    gsap.set('.layer-bar-stream', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });
    gsap.set('.morph-path', { attr: { d: (i, el) => (el as SVGPathElement).dataset.dbar || '' } });

    const tl = gsap.timeline();
    tl.to('.parallel-clip-rect', { attr: { width: 0 }, duration: 0.45, ease: 'power2.in' }, 0)
      .to('.parallel-right-node', { opacity: 0, duration: 0.25 }, 0)
      .set('.layer-parallel', { opacity: 0, pointerEvents: 'none', zIndex: 0 }, 0.5)
      .to('.lbl-ind', { x: labelIndX('bars'), opacity: 0, duration: 0.25 }, 0.1)
      // the sort — grouped order -> ranked order
      .to(
        '.ext-label',
        {
          x: 0,
          y: 0,
          duration: 0.65,
          ease: 'power3.inOut',
          stagger: { each: 0.025, from: 'start' },
        },
        0.3,
      )
      .to(
        '.lbl-text',
        {
          x: labelTextX('bars'),
          duration: 0.65,
          ease: 'power3.inOut',
          stagger: { each: 0.025, from: 'start' },
        },
        0.3,
      )
      .to(
        '.ext-label',
        { opacity: 0.3, duration: 0.15, stagger: { each: 0.025, from: 'start' } },
        0.3,
      )
      .to(
        '.ext-label',
        { opacity: 1, duration: 0.25, stagger: { each: 0.025, from: 'start' } },
        0.85,
      )
      // the bars grow from the settled column, counts appear alongside
      .fromTo(
        '.path-clip-rect',
        { attr: { width: 0 } },
        {
          attr: { width: (i, el) => Number((el as SVGRectElement).dataset.w) },
          duration: 0.7,
          ease: 'back.out(1.2)',
          stagger: 0.028,
        },
        1.0,
      )
      .fromTo('.lbl-count', { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.028 }, 1.0);
  };

  const transition2To1 = () => {
    killAll();
    setGlossaryState(false);
    setLabelState('bars');
    // Keep the bars on screen and re-seat them at full width so the timeline can
    // RETRACT them into the column. This used to call setBarStreamState('hidden'),
    // which zeroed every clip rect in the same tick — the bars just vanished and
    // the shrink tween below had nothing left to animate.
    gsap.set('.layer-bar-stream', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });
    gsap.set('.morph-path', {
      attr: { d: (i, el) => (el as SVGPathElement).dataset.dbar || '' },
    });
    gsap.set('.path-clip-rect', {
      attr: { width: (i, el) => Number((el as SVGRectElement).dataset.w) },
    });
    gsap.set('.layer-parallel', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });

    const tl = gsap.timeline();
    tl.to('.lbl-count', { opacity: 0, duration: 0.2 }, 0)
      // The bars retract into the column FIRST: they are anchored to the bar
      // rows, so the labels must not start travelling until they are gone.
      .to(
        '.path-clip-rect',
        { attr: { width: 0 }, duration: 0.4, ease: 'power2.in', stagger: 0.015 },
        0,
      )
      .set('.layer-bar-stream', { opacity: 0, pointerEvents: 'none', zIndex: 0 }, 0.64)
      .to(
        '.ext-label',
        {
          y: (i, el) => Number((el as HTMLElement).dataset.py),
          duration: 0.6,
          ease: 'power3.inOut',
          stagger: { each: 0.025, from: 'end' },
        },
        0.6,
      )
      .to(
        '.lbl-text',
        {
          x: labelTextX('parallel'),
          duration: 0.6,
          ease: 'power3.inOut',
          stagger: { each: 0.025, from: 'end' },
        },
        0.6,
      )
      .to('.lbl-ind', { x: labelIndX('parallel'), opacity: 1, duration: 0.4 }, 0.95)
      .fromTo(
        '.parallel-clip-rect',
        { attr: { width: 0 } },
        { attr: { width: svgWidth }, duration: 0.7, ease: 'power2.inOut' },
        1.05,
      )
      .fromTo(
        '.parallel-right-node',
        { opacity: 0 },
        { opacity: 1, duration: 0.35, stagger: 0.01 },
        1.25,
      );
  };

  /**
   * 2 <-> 3: the paths morph bars <-> stream as before; the labels fly between
   * the column and the top legend grid, the indicator becoming the legend swatch
   * and the totals leaving ("But totals flatten time").
   */
  const morphTo = (type: 'bar' | 'stream') => {
    killAll();
    setGlossaryState(false);
    setParallelState(false);
    // Seat the step we're leaving (bars when morphing INTO the stream, legend on
    // the way back) so a cancelled jump can't leave a half-applied label state.
    setLabelState(type === 'stream' ? 'bars' : 'legend');
    gsap.set('.layer-bar-stream', { opacity: 1, pointerEvents: 'auto', zIndex: 10 });

    const toLegend = type === 'stream';
    const tl = gsap.timeline();

    tl.to(
      '.ext-label',
      {
        x: (i, el) =>
          toLegend ? Number((el as HTMLElement).dataset.lx) : 0,
        y: (i, el) =>
          toLegend ? Number((el as HTMLElement).dataset.ly) : 0,
        duration: 1.0,
        ease: 'power3.inOut',
        stagger: { each: 0.02, from: 'start' },
      },
      0.05,
    )
      .to(
        '.ext-label',
        { opacity: 0.3, duration: 0.15, stagger: { each: 0.02, from: 'start' } },
        0.05,
      )
      .to(
        '.ext-label',
        { opacity: 1, duration: 0.28, stagger: { each: 0.02, from: 'start' } },
        0.6,
      );

    tl.to(
      '.path-clip-rect',
      {
        attr: {
          width: (i, el) =>
            toLegend ? svgWidth : Number((el as SVGRectElement).dataset.w),
        },
        duration: 1.2,
        ease: 'power3.inOut',
      },
      0,
    ).to(
      '.morph-path',
      {
        attr: {
          d: (i, el) =>
            (toLegend
              ? (el as SVGPathElement).dataset.dstream
              : (el as SVGPathElement).dataset.dbar) || '',
        },
        duration: 1.2,
        ease: 'power3.inOut',
      },
      0,
    );

    if (toLegend) {
      tl.to('.lbl-count', { opacity: 0, duration: 0.3, stagger: 0.02 }, 0)
        .to('.lbl-ind', { x: labelIndX('legend'), opacity: 1, duration: 0.4 }, 0.2)
        .to('.stream-label', { opacity: 1, y: 0, duration: 0.5, stagger: 0.03 }, 0.6);
    } else {
      tl.to('.stream-label', { opacity: 0, y: 10, duration: 0.3, stagger: 0.02 }, 0)
        .to('.lbl-ind', { x: labelIndX('bars'), opacity: 0, duration: 0.3 }, 0.2)
        .to('.lbl-count', { opacity: 1, duration: 0.5, stagger: 0.028 }, 0.5);
    }
  };

  // ── Static state setters (instant) ──
  const states: Record<number, () => void> = {
    0: () => {
      setLabelState('glossary');
      setGlossaryState(true);
      setParallelState(false);
      setBarStreamState('hidden');
    },
    1: () => {
      setLabelState('parallel');
      setGlossaryState(false);
      setParallelState(true);
      setBarStreamState('hidden');
    },
    2: () => {
      setLabelState('bars');
      setGlossaryState(false);
      setParallelState(false);
      setBarStreamState('bar');
    },
    3: () => {
      setLabelState('legend');
      setGlossaryState(false);
      setParallelState(false);
      setBarStreamState('stream');
    },
  };

  // ── Non-adjacent jump (fast scrub crossing several substeps at once) ──
  // Deliver a cross-fade instead of the hard cut `states[to]` alone produces.
  const onJump = (from: number, to: number) => {
    killAll();
    const layerOf = (s: number) =>
      s === 0 ? '.layer-glossary' : s === 1 ? '.layer-parallel' : '.layer-bar-stream';
    const outgoing = layerOf(from);
    const incoming = layerOf(to);

    gsap.to(outgoing, { opacity: 0, duration: 0.25, ease: 'power2.in' });
    jumpRef.current = gsap.delayedCall(0.3, () => {
      jumpRef.current = null;
      // Every state setter sets all three layers explicitly, so this both shows
      // `incoming` and clears whatever the skipped step had left behind.
      states[to]();
      // `fromTo` renders its `from` immediately, so the opacity `states[to]`
      // just wrote never gets a frame of paint.
      gsap.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    });
  };

  useGSAPStateMachine({
    step,
    isActive,

    onInactive: () => {
      // Nothing VISIBLE is reset here: DetailView cross-fades the whole
      // `.chart-layer`, so any state re-seated at this moment only flashes for
      // the length of that fade. `setLabelState('glossary')` used to sit here and
      // was exactly that bug — it snapped the 16 chips out of the legend and back
      // into their step-0 badge plates as Act 2 left for Act 3. Re-entry re-seats
      // every layer through `states[step]`, so the only thing that has to change
      // while inactive is the pointer events.
      killAll();
      gsap.set('.layer-glossary, .layer-parallel, .layer-bar-stream', {
        pointerEvents: 'none',
      });
    },

    states,

    onJump,

    transitions: {
      // Entrance animation on first activation of Step 0
      '0->0': () => transition0To0(),
      // Adjacent step transitions
      '0->1': () => transition0To1(),
      '1->0': () => transition1To0(),
      '1->2': () => transition1To2(),
      '2->1': () => transition2To1(),
      '2->3': () => morphTo('stream'),
      '3->2': () => morphTo('bar'),
    },
  });

  // ── Render Layer ──
  return (
    <div
      ref={svgRef}
      className="relative w-full h-full flex flex-col items-center justify-center"
      onMouseLeave={() => handleHover(null)}
      onTouchStart={markTouch}
    >
      {/* Layer 0: Glossary — the description panels; the labels live in ExtensionLabels */}
      <div className="layer-glossary absolute inset-0 flex items-center justify-center">
        <div className="relative overflow-visible mt-6" style={{ width: svgWidth, height: svgHeight }}>
          {GROUPED_KEYS.map((key) => {
            const gSpot = layout.spot('glossary', key, rankedKeys.indexOf(key));
            const isHovered = effectiveKey === key;
            const isDimmed =
              effectiveKey !== null &&
              !isHovered &&
              !highlightedExts.has(key);
            return (
              <div
                key={key}
                className="desc-row absolute flex items-center"
                style={{
                  top: gSpot.y - layout.rowH / 2,
                  left: layout.badgeX + BADGE_W,
                  height: layout.rowH,
                  opacity: isDimmed ? 0.2 : 1,
                  transition: 'opacity 0.3s ease',
                }}
                onMouseEnter={() => handleHover(key)}
              >
                <div
                  className="desc-container flex-none h-full flex items-center overflow-hidden transition-colors duration-200"
                  style={{
                    backgroundColor: isHovered ? brand50 : '#F1F5F9',
                    color: isHovered ? textPrimary : '#64748B',
                  }}
                >
                  <p
                    className={`desc-text font-normal whitespace-nowrap overflow-hidden text-ellipsis ${
                      compact ? 'leading-snug' : 'leading-relaxed'
                    }`}
                    style={{ fontSize: compact ? (layout.rowH < 17 ? 10.5 : 11) : 12 }}
                  >
                    {extension[key as keyof typeof extension]?.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Layer 1: Parallel Sets */}
      <div className="layer-parallel absolute inset-0 flex items-center justify-center">
        <svg width={svgWidth} height={svgHeight} className="overflow-visible mt-6" aria-hidden="true" focusable="false">
          <defs>
            <clipPath id="parallel-clip">
              <rect
                className="parallel-clip-rect"
                x="0"
                y={-PS.CLIP_OVERFLOW / 2}
                width="0"
                height={svgHeight + PS.CLIP_OVERFLOW}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#parallel-clip)">
            {PS.links.map((link, idx) => {
              const isLinkHighlighted =
                highlightedExts.has(link.ext) &&
                highlightedCourses.has(link.course);
              const anyHovered = effectiveKey !== null;
              const strokeColor = isLinkHighlighted ? brand500 : '#CBD5E1';
              const strokeOpacity = !anyHovered
                ? 0.3
                : isLinkHighlighted
                  ? 1
                  : 0.05;

              return (
                <path
                  key={`${link.ext}-${link.course}-${idx}`}
                  d={drawCurve(layout.chartX0, link.y1, PS.LINK_END_X, link.y2)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isLinkHighlighted ? PS.INDICATOR_H : PS.INDICATOR_H * 0.5}
                  opacity={strokeOpacity}
                  className="transition-all duration-200 cursor-crosshair"
                  onMouseEnter={() => handleHover(link.ext)}
                  onMouseLeave={() => handleHover(null)}
                  onClick={() => selectKey(link.ext)}
                />
              );
            })}
          </g>

          {/* ── Right nodes (courses) ── */}
          <g>
            {PS.rightNodeData.map(({ course, y }) => {
              const isCourseHighlighted = highlightedCourses.has(course);
              const anyHovered = effectiveKey !== null;
              const opacity = !anyHovered ? 0.8 : isCourseHighlighted ? 1 : 0.2;

              return (
                <g
                  key={course}
                  transform={`translate(${PS.RIGHT_X}, ${y})`}
                  className="cursor-crosshair"
                  onMouseEnter={() => handleHover(course)}
                  onMouseLeave={() => handleHover(null)}
                  onClick={() => selectKey(course)}
                >
                  <g
                    style={{ opacity }}
                    className="parallel-right-node transition-opacity duration-300"
                  >
                    <rect
                      x={-(PS.INDICATOR_GAP + PS.INDICATOR_W)}
                      y={-PS.INDICATOR_H / 2}
                      width={PS.INDICATOR_W}
                      height={PS.INDICATOR_H}
                      fill={isCourseHighlighted ? brand600 : '#CBD5E1'}
                    />
                    <text
                      textAnchor="start"
                      dominantBaseline="central"
                      className={`font-serif tracking-wide ${compact ? 'text-[9px]' : 'text-[10px]'}`}
                      fill={isCourseHighlighted ? brand600 : '#64748B'}
                    >
                      {course}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Layer 2 & 3: Bar Chart & Streamgraph */}
      <div className="layer-bar-stream absolute inset-0 flex flex-col items-center justify-center">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="overflow-visible mt-6"
          role="img"
          aria-label="Course extension totals per semester, first as bars and then as a stream graph. The 16 extensions are listed as a legend beside the chart; tap a legend entry to highlight its stream."
        >
          <defs>
            {pathsData.map((d) => (
              <clipPath id={d.clipId} key={d.clipId}>
                <rect
                  className="path-clip-rect"
                  x="-10"
                  y="-100"
                  width="0"
                  height={svgHeight + 200}
                  data-w={d.clipW}
                />
              </clipPath>
            ))}
          </defs>
          <g>
            {pathsData.map(({ key, pathBar, pathStream, color, clipId }) => {
              const isHovered = effectiveKey === key;
              const isFaded = effectiveKey !== null && effectiveKey !== key;

              return (
                <path
                  key={key}
                  clipPath={`url(#${clipId})`}
                  className="morph-path transition-[fill,opacity] duration-300 cursor-crosshair stroke-white stroke-[0.5px]"
                  data-dbar={pathBar}
                  data-dstream={pathStream}
                  d={pathBar}
                  fill={isHovered ? brand500 : color}
                  opacity={isFaded ? 0.25 : 0.95}
                  onMouseEnter={() => handleHover(key)}
                  onMouseLeave={() => handleHover(null)}
                  onClick={() => selectKey(key)}
                />
              );
            })}
          </g>
          {/* ── Vertical guidelines (stream mode) ── */}
          <g
            className="stream-guide"
            style={{
              opacity: step === 3 && effectiveKey ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          >
            {data.map((d) => (
              <line
                key={d.term_index}
                x1={streamXScale(d.term_index)}
                x2={streamXScale(d.term_index)}
                y1={streamTop}
                y2={svgHeight}
                stroke="#CBD5E1"
                strokeWidth={0.5}
                strokeDasharray="3 3"
              />
            ))}
          </g>
          <g className={`font-serif fill-slate-500 uppercase tracking-widest ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {data.map((d) => {
              const parts = String(d.term).split(' ');
              return (
                <text
                  key={d.term_index}
                  x={streamXScale(d.term_index)}
                  y={compact ? svgHeight + 12 : svgHeight + 20}
                  textAnchor="middle"
                  className="stream-label"
                >
                  {compact ? (
                    <>
                      <tspan x={streamXScale(d.term_index)} dy="0">
                        {parts[0]}
                      </tspan>
                      <tspan
                        x={streamXScale(d.term_index)}
                        dy="1.2em"
                      >
                        {parts.slice(1).join(' ')}
                      </tspan>
                    </>
                  ) : (
                    d.term
                  )}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* The spine: the 16 labels, drawn once and moved/restyled per step. */}
      <ExtensionLabels
        rankedKeys={rankedKeys}
        counts={counts}
        colors={colorByKey}
        layout={layout}
        svgWidth={svgWidth}
        svgHeight={svgHeight}
        compact={compact}
        mode={MODES[step] ?? 'glossary'}
        hoveredKey={effectiveKey}
        highlightedKeys={highlightedExts}
        onHover={handleHover}
        onSelect={selectKey}
        brand500={brand500}
        brand600={brand600}
        surface={surface}
      />
    </div>
  );
}
