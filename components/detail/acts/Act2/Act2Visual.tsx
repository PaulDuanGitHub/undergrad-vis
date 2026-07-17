'use client';

import React, { useMemo, useState } from 'react';
import {
  stack,
  stackOffsetWiggle,
  stackOrderInsideOut,
  area,
  curveBasis,
} from 'd3-shape';
import { scaleLinear, scaleBand, scaleOrdinal } from 'd3-scale';
import { min, max } from 'd3-array';
import gsap from 'gsap';
import { useGSAPStateMachine } from '@/hooks/useGSAPStateMachine';
import { useContainerWidth } from '@/hooks/useContainerWidth';
import term_extensions from '@/data/term_extensions.json';
import ext_courses from '@/data/ext_courses.json';
import { extension, groupedExtensions } from '@/constants/extension';
import { useThemeVariable } from '@/hooks/useThemeVariable';

// --- Types ---
export interface StreamData {
  term: string;
  term_index: number;
  [key: string]: string | number;
}

interface Act2VisualProps {
  step: number;
  isActive: boolean;
}

const ASPECT_RATIO = 550 / 850; // height / width

const extToCoursesMapping = ext_courses as Record<string, string[]>;
const data = term_extensions['data'];
const keys = term_extensions['keys'];

export default function Act2Visual({
  step,
  isActive,
}: Act2VisualProps) {
  const { ref: svgRef, width: svgWidth } = useContainerWidth<HTMLDivElement>(850);
  const svgHeight = Math.round(svgWidth * ASPECT_RATIO);

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // --- 主题色 ---
  const brand50 = useThemeVariable('--color-brand-50') || '#FEF6F5';
  const brand100 = useThemeVariable('--color-brand-100') || '#FDECE9';
  const brand200 = useThemeVariable('--color-brand-200') || '#FBD5CD';
  const brand300 = useThemeVariable('--color-brand-300') || '#F7B4A7';
  const brand400 = useThemeVariable('--color-brand-400') || '#F08B79';
  const brand500 = useThemeVariable('--color-brand-500') || '#E7604A';
  const brand600 = useThemeVariable('--color-brand-600') || '#D4442E';
  const brand700 = useThemeVariable('--color-brand-700') || '#B23321';
  const surface = useThemeVariable('--color-surface') || '#FFFFFF';
  const textPrimary = useThemeVariable('--color-text-primary') || '#292524';

  const themeColorsKey = [
    brand50,
    brand100,
    brand200,
    brand300,
    brand400,
    brand500,
    brand600,
    brand700,
  ].join(',');

  // ==========================================
  // 1. D3 双重空间数学引擎 (仅负责计算，不负责动画)
  // ==========================================
  const { pathsData, streamXScale, counts } = useMemo(() => {
    const N = data.length;
    const counts: Record<string, number> = {};
    keys.forEach((k) => (counts[k] = 0));
    data.forEach((d) => keys.forEach((k) => (counts[k] += Number(d[k]) || 0)));
    const sortedKeys = [...keys].sort((a, b) => counts[b] - counts[a]);
    const themeColors = themeColorsKey.split(',');
    const colorScale = scaleOrdinal<string>()
      .domain(sortedKeys)
      .range(themeColors);

    const maxVal = Math.max(...Object.values(counts));
    const barXScale = scaleLinear()
      .domain([0, maxVal])
      .range([0, svgWidth - 150]);
    const barYScale = scaleBand()
      .domain(sortedKeys)
      .range([50, svgHeight - 50])
      .padding(0.3);

    const stackGenerator = stack<StreamData>()
      .keys(keys)
      .offset(stackOffsetWiggle)
      .order(stackOrderInsideOut);
    const series = stackGenerator(data);
    const streamXScale = scaleLinear()
      .domain([0, N - 1])
      .range([0, svgWidth]);

    const yMin = min(series, (layer) => min(layer, (d) => d[0])) || 0;
    const yMax = max(series, (layer) => max(layer, (d) => d[1])) || 0;
    const streamYScale = scaleLinear()
      .domain([yMin * 1.2, yMax * 1.2])
      .range([svgHeight, 0]);

    const streamArea = area<any>()
      .x((d, i) => streamXScale(i))
      .y0((d) => streamYScale(d[0]))
      .y1((d) => streamYScale(d[1]))
      .curve(curveBasis);

    const pathsData = series.map((layer) => {
      const key = layer.key;
      const barW = barXScale(counts[key]);
      const barY = barYScale(key)!;
      const barH = barYScale.bandwidth();
      const barArea = area<any>()
        .x((d, i) => (i / (N - 1)) * barW)
        .y0(barY + barH)
        .y1(barY)
        .curve(curveBasis);

      return {
        key,
        color: colorScale(key),
        pathBar: barArea(layer) || '',
        pathStream: streamArea(layer) || '',
        barW,
        barY,
        barH,
        clipId: `clip-${key.substring(1)}`,
      };
    });

    return { pathsData, streamXScale, counts };
  }, [svgWidth, svgHeight, themeColorsKey]);

  // ==========================================
  // 1.5 平行集 (Parallel Sets) — 统一布局引擎
  // 所有坐标、间距在此计算，渲染层零魔数
  // ==========================================
  const PS = useMemo(() => {
    // ── 布局常量（唯一需要调整的地方）──
    const PAD_Y = 30;                // 节点列上/下留白
    const INNER_H = svgHeight - PAD_Y * 2;

    const LEFT_X = 0;              // 左列节点 <g> 的 translate X
    const RIGHT_X = svgWidth - 300;  // 右列节点 <g> 的 translate X

    const LINK_START_X = 15;         // 贝塞尔曲线起点 X
    const LINK_END_X = RIGHT_X - 15; // 贝塞尔曲线终点 X

    const INDICATOR_W = 6;           // 颜色标记矩形宽
    const INDICATOR_H = 8;           // 颜色标记矩形高
    const INDICATOR_GAP = 5;         // 文字与标记间距

    const CLIP_OVERFLOW = 100;       // clip rect 超出 SVG 的高度（GSAP 动画用）

    // ── 节点列表 ──
    const leftNodes = keys;
    const rightNodes = Array.from(
      new Set(Object.values(extToCoursesMapping).flat())
    ).sort();

    // ── 单例安全 Y 轴分布 ──
    const leftY = (i: number) =>
      leftNodes.length <= 1
        ? svgHeight / 2
        : PAD_Y + i * (INNER_H / (leftNodes.length - 1));

    const rightY = (i: number) =>
      rightNodes.length <= 1
        ? svgHeight / 2
        : PAD_Y + i * (INNER_H / (rightNodes.length - 1));

    // ── 节点数据 ──
    const leftNodeData = leftNodes.map((ext, i) => ({ ext, y: leftY(i) }));
    const rightNodeData = rightNodes.map((course, i) => ({ course, y: rightY(i) }));

    // ── 连线数据 ──
    const links: { ext: string; course: string; y1: number; y2: number }[] = [];
    leftNodes.forEach((ext, lIdx) => {
      const courses = extToCoursesMapping[ext] || [];
      const y1 = leftY(lIdx);
      courses.forEach((course) => {
        const rIdx = rightNodes.indexOf(course);
        if (rIdx !== -1) links.push({ ext, course, y1, y2: rightY(rIdx) });
      });
    });

    return {
      leftNodeData,
      rightNodeData,
      links,
      LEFT_X,
      RIGHT_X,
      LINK_START_X,
      LINK_END_X,
      INDICATOR_W,
      INDICATOR_H,
      INDICATOR_GAP,
      CLIP_OVERFLOW,
    };
  }, [svgWidth, svgHeight]);

  const drawCurve = (x1: number, y1: number, x2: number, y2: number) => {
    const cpX = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${x2} ${y2}`;
  };

  // --- 反向映射：course → extensions (用于双向高亮) ---
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

  // --- 根据 hoveredKey 计算应高亮的 extensions 和 courses ---
  const { highlightedExts, highlightedCourses } = useMemo(() => {
    const empty = {
      highlightedExts: new Set<string>(),
      highlightedCourses: new Set<string>(),
    };
    if (!hoveredKey) return empty;

    const exts = new Set<string>();
    const courses = new Set<string>();

    // 悬停的是 extension（左侧节点）
    if (extToCoursesMapping[hoveredKey]) {
      exts.add(hoveredKey);
      (extToCoursesMapping[hoveredKey] || []).forEach((c) => courses.add(c));
      return { highlightedExts: exts, highlightedCourses: courses };
    }

    // 悬停的是 course（右侧节点）
    const linkedExts = courseToExtsMapping[hoveredKey];
    if (linkedExts) {
      courses.add(hoveredKey);
      linkedExts.forEach((e) => exts.add(e));
      return { highlightedExts: exts, highlightedCourses: courses };
    }

    return empty;
  }, [hoveredKey, courseToExtsMapping]);

  // ==========================================
  // 2. GSAP 状态机动画 (基于 useGSAPStateMachine)
  // ==========================================

  /** 杀死所有动画元素上的未完成 tween，防止快速滑动重叠 */
  const killAll = () => {
    gsap.killTweensOf(
      '.layer-glossary, .layer-parallel, .layer-bar-stream, .badge-container, .desc-container, .desc-text, .parallel-clip-rect, .parallel-left-node, .parallel-right-node, .morph-path, .path-clip-rect, .bar-label, .stream-label'
    );
  };

  // --- 静态状态设定函数 (Instant Setters) ---
  const setGlossaryState = (active: boolean) => {
    gsap.set('.layer-glossary', {
      opacity: active ? 1 : 0,
      pointerEvents: active ? 'auto' : 'none',
      zIndex: active ? 10 : 0,
    });
    gsap.set('.badge-container', { x: 0, opacity: active ? 1 : 0 });
    gsap.set('.desc-container', {
      width: active ? '100%' : 0,
      paddingLeft: active ? 16 : 0,
      paddingRight: active ? 16 : 0,
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
    gsap.set('.parallel-left-node, .parallel-right-node', {
      x: 0,
      opacity: active ? 1 : 0,
    });
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
      gsap.set('.bar-label', { opacity: 0, x: -10 });
      gsap.set('.stream-label', { opacity: 0, y: 10 });
      return;
    }

    gsap.set('.morph-path', {
      attr: {
        d: (i, el) => (mode === 'bar' ? el.dataset.dbar : el.dataset.dstream),
      },
    });
    gsap.set('.path-clip-rect', {
      attr: { width: mode === 'bar' ? (i, el) => el.dataset.w : svgWidth },
    });
    gsap.set('.bar-label', {
      opacity: mode === 'bar' ? 1 : 0,
      x: mode === 'bar' ? 0 : -20,
    });
    gsap.set('.stream-label', {
      opacity: mode === 'stream' ? 1 : 0,
      y: mode === 'stream' ? 0 : 10,
    });
  };

  // --- 动态过渡函数 (Timelines) ---
  const transition0To0 = () => {
    killAll();
    gsap.set('.layer-glossary', {
      opacity: 1,
      pointerEvents: 'auto',
      zIndex: 10,
    });
    gsap.set('.desc-text', { opacity: 1 });
    const tl = gsap.timeline();
    tl.fromTo(
      '.badge-container',
      { x: -30, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.3, stagger: 0.02 }
    ).to('.desc-container', {
      width: '100%',
      paddingLeft: 16,
      paddingRight: 16,
      duration: 0.6,
      ease: 'power2.out',
    });
  };

  const transition0To1 = () => {
    killAll();
    gsap.set('.layer-parallel', {
      opacity: 1,
      pointerEvents: 'auto',
      zIndex: 10,
    });
    const tl = gsap.timeline();
    tl.to('.desc-container', {
      width: 0,
      paddingLeft: 0,
      paddingRight: 0,
      duration: 0.5,
      ease: 'power2.in',
    })
      .to('.desc-text', { opacity: 0, duration: 0.3 }, '<')
      .to(
        '.badge-container',
        { x: -30, opacity: 0, duration: 0.4, stagger: 0.01 },
        '-=0.2'
      )
      .set('.layer-glossary', {
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 0,
      })
      .fromTo(
        '.parallel-left-node',
        { x: -30, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.02,
          ease: 'power2.out',
        }
      )
      .fromTo(
        '.parallel-clip-rect',
        { attr: { width: 0 } },
        { attr: { width: svgWidth }, duration: 1.2, ease: 'power2.inOut' },
        '-=0.2'
      )
      .fromTo(
        '.parallel-right-node',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.02 },
        '-=0.6'
      );
  };

  const transition1To0 = () => {
    killAll();
    gsap.set('.layer-glossary', {
      opacity: 1,
      pointerEvents: 'auto',
      zIndex: 10,
    });
    gsap.set('.desc-text', { opacity: 1 });
    const tl = gsap.timeline();
    tl.to('.parallel-clip-rect', {
      attr: { width: 0 },
      duration: 0.6,
      ease: 'power2.inOut',
    })
      .to('.parallel-right-node', { opacity: 0, x: 20, duration: 0.3 }, '<')
      .to(
        '.parallel-left-node',
        { x: -30, opacity: 0, duration: 0.4 },
        '-=0.2'
      )
      .set('.layer-parallel', {
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 0,
      })
      .fromTo(
        '.badge-container',
        { x: -30, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.02 }
      )
      .to('.desc-container', {
        width: '100%',
        paddingLeft: 16,
        paddingRight: 16,
        duration: 0.6,
        ease: 'power2.out',
      });
  };

  const transition1To2 = () => {
    killAll();
    gsap.set('.layer-bar-stream', {
      opacity: 1,
      pointerEvents: 'auto',
      zIndex: 10,
    });
    gsap.set('.morph-path', { attr: { d: (i, el) => el.dataset.dbar } });

    const tl = gsap.timeline();
    tl.to('.parallel-clip-rect', {
      attr: { width: 0 },
      duration: 0.6,
      ease: 'power2.inOut',
    })
      .to(
        '.parallel-left-node, .parallel-right-node',
        { opacity: 0, duration: 0.4 },
        '-=0.4'
      )
      .set('.layer-parallel', {
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 0,
      })
      .fromTo(
        '.path-clip-rect',
        { attr: { width: 0 } },
        {
          attr: { width: (i, el) => el.dataset.w },
          duration: 0.8,
          ease: 'back.out(1.2)',
          stagger: 0.05,
        }
      )
      .fromTo(
        '.bar-label',
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.05 },
        '-=0.6'
      );
  };

  const transition2To1 = () => {
    killAll();
    gsap.set('.layer-parallel', {
      opacity: 1,
      pointerEvents: 'auto',
      zIndex: 10,
    });
    const tl = gsap.timeline();
    tl.to('.bar-label', { opacity: 0, x: -20, duration: 0.3 })
      .to(
        '.path-clip-rect',
        {
          attr: { width: 0 },
          duration: 0.6,
          ease: 'power2.in',
          stagger: 0.02,
        },
        '-=0.2'
      )
      .set('.layer-bar-stream', {
        opacity: 0,
        pointerEvents: 'none',
        zIndex: 0,
      })
      .fromTo(
        '.parallel-left-node',
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.4, stagger: 0.02 }
      )
      .fromTo(
        '.parallel-clip-rect',
        { attr: { width: 0 } },
        { attr: { width: svgWidth }, duration: 1.2, ease: 'power2.inOut' },
        '-=0.2'
      )
      .fromTo(
        '.parallel-right-node',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.02 },
        '-=0.6'
      );
  };

  const morphTo = (type: 'bar' | 'stream') => {
    killAll();
    gsap.set('.path-clip-rect', { attr: { width: svgWidth } }); // 确保形变时遮罩全开
    const tl = gsap.timeline();

    tl.to('.morph-path', {
      attr: {
        d: (i, el) => (type === 'bar' ? el.dataset.dbar : el.dataset.dstream),
      },
      duration: 1.2,
      ease: 'power3.inOut',
    });

    if (type === 'bar') {
      tl.to('.stream-label', { opacity: 0, y: 10, duration: 0.3 }, 0).to(
        '.bar-label',
        { opacity: 1, x: 0, duration: 0.6, stagger: 0.05 },
        0.4
      );
    } else {
      tl.to('.bar-label', { opacity: 0, x: -20, duration: 0.3 }, 0).to(
        '.stream-label',
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 },
        0.6
      );
    }
  };

  useGSAPStateMachine({
    step,
    isActive,

    onInactive: () => {
      setGlossaryState(false);
      setParallelState(false);
      setBarStreamState('hidden');
    },

    states: {
      0: () => {
        setGlossaryState(true);
        setParallelState(false);
        setBarStreamState('hidden');
      },
      1: () => {
        setGlossaryState(false);
        setParallelState(true);
        setBarStreamState('hidden');
      },
      2: () => {
        setGlossaryState(false);
        setParallelState(false);
        setBarStreamState('bar');
      },
      3: () => {
        setGlossaryState(false);
        setParallelState(false);
        setBarStreamState('stream');
      },
    },

    transitions: {
      // 首次激活 Step 0 时播放入场动画
      '0->0': () => transition0To0(),
      // 相邻步骤过渡
      '0->1': () => transition0To1(),
      '1->0': () => transition1To0(),
      '1->2': () => transition1To2(),
      '2->1': () => transition2To1(),
      '2->3': () => morphTo('stream'),
      '3->2': () => morphTo('bar'),
    },
  });

  // ==========================================
  // 3. 纯净渲染层
  // ==========================================
  return (
    <div
      ref={svgRef}
      className="relative w-full h-150 flex flex-col items-center justify-center"
    >
      {/* Layer 0: Glossary */}
      <div className="layer-glossary absolute inset-0 flex items-center justify-center">
        <div
          className="w-[90%] max-w-4xl mx-auto"
          onMouseLeave={() => setHoveredKey(null)}
        >
          <div className="flex flex-col gap-6">
            {groupedExtensions.map((group, groupIndex) => (
              <div key={groupIndex} className="flex flex-col gap-2.5">
                {group.map((ext) => {
                  const extData = extension[ext as keyof typeof extension];

                  if (!extData) return null;

                  const isHovered = hoveredKey === ext;

                  return (
                    <div
                      key={ext}
                      onMouseEnter={() => setHoveredKey(ext)}
                      className="flex flex-row overflow-hidden cursor-default"
                    >
                      <div
                        className="badge-container w-20 text-xs shrink-0 flex items-center justify-center font-bold tracking-tight select-none transition-colors duration-300"
                        style={{
                          backgroundColor: isHovered ? brand500 : '#CBD5E1',
                          color: isHovered ? surface : '#64748B',
                        }}
                      >
                        {ext}
                      </div>
                      <div
                        className="desc-container flex-none flex items-center overflow-hidden transition-colors duration-200"
                        style={{
                          backgroundColor: isHovered ? brand50 : '#F1F5F9',
                          color: isHovered ? textPrimary : '#94A3B8',
                        }}
                      >
                        <p
                          className="desc-text text-xs font-normal leading-relaxed transition-opacity duration-200 min-w-200"
                          style={{ opacity: isHovered ? 1 : 0.7 }}
                        >
                          {extData.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Layer 1: Parallel Sets */}
      <div className="layer-parallel absolute inset-0 flex items-center justify-center">
        <svg width={svgWidth} height={svgHeight} className="overflow-visible mt-6">
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
              const anyHovered = hoveredKey !== null;
              const strokeColor = isLinkHighlighted ? brand300 : '#CBD5E1';
              const strokeOpacity = !anyHovered
                ? 0.3
                : isLinkHighlighted
                  ? 0.9
                  : 0.05;

              return (
                <path
                  key={`${link.ext}-${link.course}-${idx}`}
                  d={drawCurve(PS.LINK_START_X, link.y1, PS.LINK_END_X, link.y2)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isLinkHighlighted ? 8 : 5}
                  opacity={strokeOpacity}
                  className="transition-all duration-200 cursor-crosshair"
                  onMouseEnter={() => setHoveredKey(link.ext)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })}
          </g>

          {/* ── Left nodes (extensions) ── */}
          <g>
            {PS.leftNodeData.map(({ ext, y }) => {
              const isExtHighlighted = highlightedExts.has(ext);
              const anyHovered = hoveredKey !== null;
              const opacity = !anyHovered ? 0.8 : isExtHighlighted ? 1 : 0.2;

              return (
                <g
                  key={ext}
                  transform={`translate(${PS.LEFT_X}, ${y})`}
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredKey(ext)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <g
                    style={{ opacity }}
                    className="parallel-left-node transition-opacity duration-300"
                  >
                    <text
                      textAnchor="end"
                      dominantBaseline="central"
                      className="font-serif text-xs font-bold"
                      fill={isExtHighlighted ? brand600 : '#64748B'}
                    >
                      {ext}
                    </text>
                    <rect
                      x={PS.INDICATOR_GAP}
                      y={-PS.INDICATOR_H / 2}
                      width={PS.INDICATOR_W}
                      height={PS.INDICATOR_H}
                      fill={isExtHighlighted ? brand600 : '#CBD5E1'}
                    />
                  </g>
                </g>
              );
            })}
          </g>

          {/* ── Right nodes (courses) ── */}
          <g>
            {PS.rightNodeData.map(({ course, y }) => {
              const isCourseHighlighted = highlightedCourses.has(course);
              const anyHovered = hoveredKey !== null;
              const opacity = !anyHovered ? 0.8 : isCourseHighlighted ? 1 : 0.2;

              return (
                <g
                  key={course}
                  transform={`translate(${PS.RIGHT_X}, ${y})`}
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredKey(course)}
                  onMouseLeave={() => setHoveredKey(null)}
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
                      className="font-serif text-[10px] tracking-wide"
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
        <div className="absolute top-0 h-10 flex items-center justify-center font-serif text-slate-900 text-xl tracking-widest z-10 pointer-events-none transition-opacity duration-300">
          {hoveredKey ? `${hoveredKey} files` : ' '}
        </div>
        <svg width={svgWidth} height={svgHeight} className="overflow-visible mt-6">
          <defs>
            {pathsData.map((d) => (
              <clipPath id={d.clipId} key={d.clipId}>
                <rect
                  className="path-clip-rect"
                  x="-10"
                  y="-100"
                  width="0"
                  height={svgHeight + 200}
                  data-w={d.barW + 20}
                />
              </clipPath>
            ))}
          </defs>
          <g>
            {pathsData.map(
              ({
                key,
                pathBar,
                pathStream,
                color,
                barW,
                barY,
                barH,
                clipId,
              }) => {
                const isHovered = hoveredKey === key;
                const isFaded = hoveredKey !== null && hoveredKey !== key;

                return (
                  <g key={key}>
                    <path
                      clipPath={`url(#${clipId})`}
                      className="morph-path transition-opacity duration-300 cursor-crosshair stroke-white stroke-[0.5px]"
                      data-dbar={pathBar}
                      data-dstream={pathStream}
                      d={pathBar}
                      fill={color}
                      opacity={isFaded ? 0.3 : 0.95}
                      onMouseEnter={() => setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey(null)}
                    />
                    <g
                      transform={`translate(${barW + 15}, ${barY + barH / 2})`}
                    >
                      <g className="bar-label">
                        <text
                          className="font-serif fill-slate-900 text-sm font-bold"
                          alignmentBaseline="middle"
                        >
                          {key}
                        </text>
                        <text
                          className="font-serif fill-slate-500 text-xs"
                          x={50}
                          alignmentBaseline="middle"
                        >
                          {counts[key]} files
                        </text>
                      </g>
                    </g>
                  </g>
                );
              }
            )}
          </g>
          <g className="font-serif text-[10px] fill-slate-400 uppercase tracking-widest">
            {data.map((d) => (
              <text
                key={d.term_index}
                x={streamXScale(d.term_index)}
                y={svgHeight + 20}
                textAnchor="middle"
                className="stream-label"
              >
                {d.term}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
