"use client";

import React, { useMemo, useRef, useState } from "react";
import { stack, stackOffsetWiggle, stackOrderInsideOut, area, curveBasis } from "d3-shape";
import { scaleLinear, scaleBand, scaleOrdinal } from "d3-scale";
import { min, max } from "d3-array";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import term_extensions from "@/data/term_extensions.json";
import ext_courses from "@/data/ext_courses.json";
import { extension, extensionBackgroundSchema, extensionForegroundSchema, groupedExtensions } from "@/constants/extension";

// --- Types ---
export interface StreamData {
    term: string;
    term_index: number;
    [key: string]: string | number;
}

interface Act2VisualProps {
    step: number;
    isActive: boolean;
    width?: number;
    height?: number;
}

const COLORS = ["#fcd34d", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#78350f", "#451a03", "#fef3c7"];

const extToCoursesMapping = ext_courses as Record<string, string[]>;
const data = term_extensions['data'];
const keys = term_extensions['keys'];

export default function Act2Visual({ step, isActive, width = 850, height = 550 }: Act2VisualProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const prevStep = useRef(step);
    const prevActive = useRef(isActive);

    const [hoveredKey, setHoveredKey] = useState<string | null>(null);

    // ==========================================
    // 1. D3 双重空间数学引擎 (仅负责计算，不负责动画)
    // ==========================================
    const { pathsData, streamXScale, counts } = useMemo(() => {
        const N = data.length;
        const counts: Record<string, number> = {};
        keys.forEach(k => counts[k] = 0);
        data.forEach(d => keys.forEach(k => counts[k] += Number(d[k]) || 0));
        const sortedKeys = [...keys].sort((a, b) => counts[b] - counts[a]);
        const colorScale = scaleOrdinal<string>().domain(sortedKeys).range(COLORS);

        const maxVal = Math.max(...Object.values(counts));
        const barXScale = scaleLinear().domain([0, maxVal]).range([0, width - 150]);
        const barYScale = scaleBand().domain(sortedKeys).range([50, height - 50]).padding(0.3);

        const stackGenerator = stack<StreamData>().keys(keys).offset(stackOffsetWiggle).order(stackOrderInsideOut);
        const series = stackGenerator(data);
        const streamXScale = scaleLinear().domain([0, N - 1]).range([0, width]);

        const yMin = min(series, layer => min(layer, d => d[0])) || 0;
        const yMax = max(series, layer => max(layer, d => d[1])) || 0;
        const streamYScale = scaleLinear().domain([yMin * 1.2, yMax * 1.2]).range([height, 0]);

        const streamArea = area<any>().x((d, i) => streamXScale(i)).y0(d => streamYScale(d[0])).y1(d => streamYScale(d[1])).curve(curveBasis);

        const pathsData = series.map(layer => {
            const key = layer.key;
            const barW = barXScale(counts[key]);
            const barY = barYScale(key)!;
            const barH = barYScale.bandwidth();
            const barArea = area<any>().x((d, i) => (i / (N - 1)) * barW).y0(barY + barH).y1(barY).curve(curveBasis);

            return {
                key, color: colorScale(key),
                pathBar: barArea(layer) || "", pathStream: streamArea(layer) || "",
                barW, barY, barH, clipId: `clip-${key.substring(1)}`
            };
        });

        return { pathsData, streamXScale, counts };
    }, [width, height]);

    // ==========================================
    // 1.5 平行集 (Parallel Sets) 数学引擎
    // ==========================================
    const { leftNodes, rightNodes, parallelLinks } = useMemo(() => {
        const leftNodes = keys;
        const allCourses = Array.from(new Set(Object.values(extToCoursesMapping).flat())).sort();
        const rightNodes = allCourses;

        const yPad = 30;
        const innerH = height - yPad * 2;
        const leftSpacing = innerH / Math.max(1, leftNodes.length - 1);
        const rightSpacing = innerH / Math.max(1, rightNodes.length - 1);

        const links: { ext: string; course: string; y1: number; y2: number }[] = [];

        leftNodes.forEach((ext, lIdx) => {
            const courses = extToCoursesMapping[ext] || [];
            const y1 = yPad + lIdx * leftSpacing;
            courses.forEach(course => {
                const rIdx = rightNodes.indexOf(course);
                if (rIdx !== -1) {
                    const y2 = yPad + rIdx * rightSpacing;
                    links.push({ ext, course, y1, y2 });
                }
            });
        });

        return { leftNodes, rightNodes, parallelLinks: links };
    }, [height]);

    const drawCurve = (x1: number, y1: number, x2: number, y2: number) => {
        const cpX = (x1 + x2) / 2;
        return `M ${x1} ${y1} C ${cpX} ${y1}, ${cpX} ${y2}, ${x2} ${y2}`;
    };

    // ==========================================
    // 2. GSAP 高阶状态机引擎
    // ==========================================
    useGSAP(() => {

        // --- 静态状态设定函数 (Instant Setters) ---
        const setGlossaryState = (active: boolean) => {
            gsap.set(".layer-glossary", { opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none", zIndex: active ? 10 : 0 });
            gsap.set(".badge-container", { x: 0, opacity: active ? 1 : 0 });
            gsap.set(".desc-container", { width: active ? "100%" : 0, paddingLeft: active ? 16 : 0, paddingRight: active ? 16 : 0 });
            gsap.set(".desc-text", { opacity: active ? 1 : 0 });
        };

        const setParallelState = (active: boolean) => {
            gsap.set(".layer-parallel", { opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none", zIndex: active ? 10 : 0 });
            gsap.set(".parallel-clip-rect", { attr: { width: active ? width : 0 } });
            gsap.set(".parallel-left-node, .parallel-right-node", { x: 0, opacity: active ? 1 : 0 });
        };

        const setBarStreamState = (mode: "hidden" | "bar" | "stream") => {
            const active = mode !== "hidden";
            gsap.set(".layer-bar-stream", { opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none", zIndex: active ? 10 : 0 });
            
            if (!active) {
                gsap.set(".path-clip-rect", { attr: { width: 0 } });
                gsap.set(".bar-label", { opacity: 0, x: -10 });
                gsap.set(".stream-label", { opacity: 0, y: 10 });
                return;
            }
            
            gsap.set(".morph-path", { attr: { d: (i, el) => mode === "bar" ? el.dataset.dbar : el.dataset.dstream } });
            gsap.set(".path-clip-rect", { attr: { width: mode === "bar" ? (i, el) => el.dataset.w : width } });
            gsap.set(".bar-label", { opacity: mode === "bar" ? 1 : 0, x: mode === "bar" ? 0 : -20 });
            gsap.set(".stream-label", { opacity: mode === "stream" ? 1 : 0, y: mode === "stream" ? 0 : 10 });
        };

        // --- 动态过渡函数 (Timelines) ---
        const transition0To1 = () => {
            gsap.set(".layer-parallel", { opacity: 1, pointerEvents: "auto", zIndex: 10 });
            const tl = gsap.timeline();
            tl.to(".desc-container", { width: 0, paddingLeft: 0, paddingRight: 0, duration: 0.5, ease: "power2.in" })
              .to(".desc-text", { opacity: 0, duration: 0.3 }, "<")
              .to(".badge-container", { x: -30, opacity: 0, duration: 0.4, stagger: 0.01 }, "-=0.2")
              .set(".layer-glossary", { opacity: 0, pointerEvents: "none", zIndex: 0 })
              .fromTo(".parallel-left-node", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, stagger: 0.02, ease: "power2.out" })
              .fromTo(".parallel-clip-rect", { attr: { width: 0 } }, { attr: { width: width }, duration: 1.2, ease: "power2.inOut" }, "-=0.2")
              .fromTo(".parallel-right-node", { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.02 }, "-=0.6");
        };

        const transition1To0 = () => {
            gsap.set(".layer-glossary", { opacity: 1, pointerEvents: "auto", zIndex: 10 });
            const tl = gsap.timeline();
            tl.to(".parallel-clip-rect", { attr: { width: 0 }, duration: 0.6, ease: "power2.inOut" })
              .to(".parallel-right-node", { opacity: 0, x: 20, duration: 0.3 }, "<")
              .to(".parallel-left-node", { x: -30, opacity: 0, duration: 0.4 }, "-=0.2")
              .set(".layer-parallel", { opacity: 0, pointerEvents: "none", zIndex: 0 })
              .fromTo(".badge-container", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, stagger: 0.02 })
              .to(".desc-container", { width: "100%", paddingLeft: 16, paddingRight: 16, duration: 0.6, ease: "power2.out" })
              .to(".desc-text", { opacity: 1, duration: 0.4 }, "-=0.2");
        };

        const transition1To2 = () => {
            gsap.set(".layer-bar-stream", { opacity: 1, pointerEvents: "auto", zIndex: 10 });
            gsap.set(".morph-path", { attr: { d: (i, el) => el.dataset.dbar } });
            
            const tl = gsap.timeline();
            tl.to(".parallel-clip-rect", { attr: { width: 0 }, duration: 0.6, ease: "power2.inOut" })
              .to(".parallel-left-node, .parallel-right-node", { opacity: 0, duration: 0.4 }, "-=0.4")
              .set(".layer-parallel", { opacity: 0, pointerEvents: "none", zIndex: 0 })
              .fromTo(".path-clip-rect", { attr: { width: 0 } }, { attr: { width: (i, el) => el.dataset.w }, duration: 0.8, ease: "back.out(1.2)", stagger: 0.05 })
              .fromTo(".bar-label", { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.05 }, "-=0.6");
        };

        const transition2To1 = () => {
            gsap.set(".layer-parallel", { opacity: 1, pointerEvents: "auto", zIndex: 10 });
            const tl = gsap.timeline();
            tl.to(".bar-label", { opacity: 0, x: -20, duration: 0.3 })
              .to(".path-clip-rect", { attr: { width: 0 }, duration: 0.6, ease: "power2.in", stagger: 0.02 }, "-=0.2")
              .set(".layer-bar-stream", { opacity: 0, pointerEvents: "none", zIndex: 0 })
              .fromTo(".parallel-left-node", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.02 })
              .fromTo(".parallel-clip-rect", { attr: { width: 0 } }, { attr: { width }, duration: 1.2, ease: "power2.inOut" }, "-=0.2")
              .fromTo(".parallel-right-node", { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.02 }, "-=0.6");
        };

        const morphTo = (type: "bar" | "stream") => {
            gsap.set(".path-clip-rect", { attr: { width: width } }); // 确保形变时遮罩全开
            const tl = gsap.timeline();
            
            tl.to(".morph-path", { attr: { d: (i, el) => type === "bar" ? el.dataset.dbar : el.dataset.dstream }, duration: 1.2, ease: "power3.inOut" });

            if (type === "bar") {
                tl.to(".stream-label", { opacity: 0, y: 10, duration: 0.3 }, 0)
                  .to(".bar-label", { opacity: 1, x: 0, duration: 0.6, stagger: 0.05 }, 0.4);
            } else {
                tl.to(".bar-label", { opacity: 0, x: -20, duration: 0.3 }, 0)
                  .to(".stream-label", { opacity: 1, y: 0, duration: 0.6, stagger: 0.05 }, 0.6);
            }
        };

        // --- 主控逻辑调度 ---
        if (!isActive) {
            setGlossaryState(false);
            setParallelState(false);
            setBarStreamState("hidden");
            prevActive.current = false;
            return;
        }

        const justActivated = !prevActive.current;
        const isTransitioning = prevStep.current !== step;

        // 首次激活 或 step 未变化：gsap.set 瞬间就位（无动画）
        if (justActivated || !isTransitioning) {
            setGlossaryState(step === 0);
            setParallelState(step === 1);
            setBarStreamState(step === 2 ? "bar" : step === 3 ? "stream" : "hidden");
        }

        // step 变化时的过渡动画
        if (isTransitioning) {
            const p = prevStep.current;
            const s = step;
            
            // 路由到正确的动画
            if (p === 0 && s === 1) transition0To1();
            else if (p === 1 && s === 0) transition1To0();
            else if (p === 1 && s === 2) transition1To2();
            else if (p === 2 && s === 1) transition2To1();
            else if ((p === 2 && s === 3) || (p === 3 && s === 2)) morphTo(s === 3 ? "stream" : "bar");
            else {
                // 快速跨步滚动时的兜底：直接设定状态，不播乱套的动画
                setGlossaryState(s === 0);
                setParallelState(s === 1);
                setBarStreamState(s === 2 ? "bar" : s === 3 ? "stream" : "hidden");
            }
        }
        
        prevStep.current = step;
        prevActive.current = true;

    }, [step, isActive, width]);

    // ==========================================
    // 3. 纯净渲染层
    // ==========================================
    return (
        <div ref={containerRef} className="relative w-full h-150 flex flex-col items-center justify-center">

            {/* Layer 0: Glossary */}
            <div className="layer-glossary absolute inset-0 flex items-center justify-center">
                <div className="w-[90%] max-w-4xl mx-auto" onMouseLeave={() => setHoveredKey(null)}>
                    <div className="flex flex-col gap-6">
                        {groupedExtensions.map((group, groupIndex) => (
                            <div key={groupIndex} className="flex flex-col gap-2.5">
                                {group.map((ext) => {
                                    const extData = extension[ext as keyof typeof extension];
                                    const bg = extensionBackgroundSchema[ext as keyof typeof extensionBackgroundSchema];
                                    const fg = extensionForegroundSchema[ext as keyof typeof extensionForegroundSchema];

                                    if (!extData || !bg || !fg) return null;

                                    const isHovered = hoveredKey === ext;
                                    const mutedBg = { secondary: "#E5E7EB", tertiary: "#F3F4F6" };
                                    const mutedFg = { secondary: "#4B5563", tertiary: "#6B7280" };
                                    const currentBg = isHovered ? bg : mutedBg;
                                    const currentFg = isHovered ? fg : mutedFg;

                                    return (
                                        <div key={ext} onMouseEnter={() => setHoveredKey(ext)} className="flex flex-row overflow-hidden cursor-default">
                                            <div className="badge-container w-20 text-xs shrink-0 flex items-center justify-center font-bold tracking-tight select-none transition-colors duration-300" style={{ backgroundColor: currentBg.secondary, color: currentFg.secondary }}>
                                                {ext}
                                            </div>
                                            <div className="desc-container flex-none flex items-center overflow-hidden transition-colors duration-300" style={{ backgroundColor: currentBg.tertiary, color: currentFg.tertiary }}>
                                                <p className="desc-text text-xs font-normal leading-relaxed transition-opacity duration-300 min-w-200" style={{ opacity: isHovered ? 1 : 0.7 }}>
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
                <svg width={width} height={height} className="overflow-visible mt-6">
                    <defs>
                        <clipPath id="parallel-clip">
                            <rect className="parallel-clip-rect" x="140" y="-50" width="0" height={height + 100} />
                        </clipPath>
                    </defs>
                    <g clipPath="url(#parallel-clip)">
                        {parallelLinks.map((link, idx) => {
                            const extBg = extensionBackgroundSchema[link.ext as keyof typeof extensionBackgroundSchema];
                            const isHovered = hoveredKey === link.ext || hoveredKey === link.course;
                            const anyHovered = hoveredKey !== null;
                            const strokeColor = isHovered && extBg ? extBg.tertiary : "#E5E7EB";
                            const strokeOpacity = !anyHovered ? 0.4 : (isHovered ? 0.9 : 0.05);

                            return (
                                <path
                                    key={`${link.ext}-${link.course}-${idx}`}
                                    d={drawCurve(140, link.y1, width - 140, link.y2)}
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth={isHovered ? 8 : 4}
                                    opacity={strokeOpacity}
                                    className="transition-opacity duration-300"
                                />
                            );
                        })}
                    </g>
                    <g>
                        {leftNodes.map((ext, i) => {
                            const y = 30 + i * ((height - 60) / Math.max(1, leftNodes.length - 1));
                            const isHovered = hoveredKey === ext;
                            const opacity = hoveredKey === null ? 0.8 : (isHovered ? 1 : 0.2);
                            const fg = extensionForegroundSchema[ext as keyof typeof extensionForegroundSchema];

                            return (
                                /* 外层管 GSAP 动画，内层管 React Hover，彻底解耦 */
                                <g key={ext} transform={`translate(140, ${y})`} className="parallel-left-node cursor-crosshair" onMouseEnter={() => setHoveredKey(ext)} onMouseLeave={() => setHoveredKey(null)}>
                                    <g style={{ opacity }} className="transition-opacity duration-300">
                                        <text textAnchor="end" alignmentBaseline="middle" className="font-serif text-xs font-bold" fill={isHovered && fg ? fg.secondary : "#4B5563"}>{ext}</text>
                                        <circle cx={10} cy={0} r={3} fill={isHovered ? "#d97706" : "#E5E7EB"} />
                                    </g>
                                </g>
                            );
                        })}
                    </g>
                    <g>
                        {rightNodes.map((course, i) => {
                            const y = 30 + i * ((height - 60) / Math.max(1, rightNodes.length - 1));
                            const isHovered = hoveredKey === course;
                            const opacity = hoveredKey === null ? 0.8 : (isHovered ? 1 : 0.2);

                            return (
                                <g key={course} transform={`translate(${width - 140}, ${y})`} className="cursor-crosshair" onMouseEnter={() => setHoveredKey(course)} onMouseLeave={() => setHoveredKey(null)}>
                                    <g style={{ opacity }} className="parallel-right-node transition-opacity duration-300">
                                        <circle cx={-10} cy={0} r={3} fill={isHovered ? "#d97706" : "#E5E7EB"} />
                                        <text textAnchor="start" alignmentBaseline="middle" className="font-serif text-[10px] tracking-wide" fill={isHovered ? "#d97706" : "#4B5563"}>{course}</text>
                                    </g>
                                </g>
                            );
                        })}
                    </g>
                </svg>
            </div>

            {/* Layer 2 & 3: Bar Chart & Streamgraph */}
            <div className="layer-bar-stream absolute inset-0 flex flex-col items-center justify-center">
                <div className="absolute top-0 h-10 flex items-center justify-center font-serif text-amber-950 text-xl tracking-widest z-10 pointer-events-none transition-opacity duration-300">
                    {hoveredKey ? `${hoveredKey} files` : " "}
                </div>
                <svg width={width} height={height} className="overflow-visible mt-6">
                    <defs>
                        {pathsData.map(d => (
                            <clipPath id={d.clipId} key={d.clipId}>
                                <rect className="path-clip-rect" x="-10" y="-100" width="0" height={height + 200} data-w={d.barW + 20} />
                            </clipPath>
                        ))}
                    </defs>
                    <g>
                        {pathsData.map(({ key, pathBar, pathStream, color, barW, barY, barH, clipId }) => {
                            const isHovered = hoveredKey === key;
                            const isFaded = hoveredKey !== null && hoveredKey !== key;

                            return (
                                <g key={key}>
                                    <path
                                        clipPath={`url(#${clipId})`}
                                        className="morph-path transition-opacity duration-300 cursor-crosshair stroke-white stroke-[0.5px]"
                                        data-dbar={pathBar} data-dstream={pathStream} d={pathBar}
                                        fill={color} opacity={isFaded ? 0.3 : 0.95}
                                        onMouseEnter={() => setHoveredKey(key)} onMouseLeave={() => setHoveredKey(null)}
                                    />
                                    <g transform={`translate(${barW + 15}, ${barY + barH / 2})`}>
                                        <g className="bar-label">
                                            <text className="font-serif fill-amber-950 text-sm font-bold" alignmentBaseline="middle">{key}</text>
                                            <text className="font-serif fill-amber-900/50 text-xs" x={50} alignmentBaseline="middle">{counts[key]} files</text>
                                        </g>
                                    </g>
                                </g>
                            );
                        })}
                    </g>
                    <g className="font-serif text-[10px] fill-amber-900/40 uppercase tracking-widest">
                        {data.map((d) => (
                            <text key={d.term_index} x={streamXScale(d.term_index)} y={height + 20} textAnchor="middle" className="stream-label">
                                {d.term}
                            </text>
                        ))}
                    </g>
                </svg>
            </div>
        </div>
    );
}