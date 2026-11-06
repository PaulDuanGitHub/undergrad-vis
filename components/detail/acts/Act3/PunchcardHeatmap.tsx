'use client';

import React, { useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { max } from 'd3-array';
import { useThemeVariable } from '@/hooks/useThemeVariable';

interface PunchcardData {
  day_of_week: number; // 0 (Mon) - 6 (Sun)
  hour: number; // 0 - 23
  count: number;
}

interface PunchcardProps {
  data: PunchcardData[];
  width?: number;
  /** Available height of the chart box; the grid is scaled to fit instead of clipping. */
  height?: number;
  flip?: boolean;
  /** Keyword focus: weekend rows or evening columns. */
  focus?: '8pm' | 'evening' | 'weekend' | null;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = 24;
const DAYS_COUNT = 7;
const HOUR_TICKS = [0, 6, 12, 18, 23];

const ASPECT_LANDSCAPE = 300 / 800;
const FLIPPED_CELL_W = 30;
const FLIPPED_CELL_H = 20;

export default function PunchcardHeatmap({
  data,
  width = 800,
  height,
  flip = false,
  focus = null,
}: PunchcardProps) {
  const flipped = flip;
  const [hoveredData, setHoveredData] = useState<PunchcardData | null>(null);
  const COLOR_BRAND = useThemeVariable('--color-brand');

  // Touch taps are followed by emulated mouse events; ignore hover briefly and
  // let the click pin a cell (tap it again to clear).
  const touchRef = useRef(false);
  const markTouch = () => {
    touchRef.current = true;
    window.setTimeout(() => { touchRef.current = false; }, 700);
  };
  const fromTouch = () => touchRef.current;
  const selectCell = (d: PunchcardData) => {
    const toggle = fromTouch();
    setHoveredData((prev) =>
      prev && prev.day_of_week === d.day_of_week && prev.hour === d.hour && toggle ? null : d,
    );
  };

  const pad = flipped
    ? { top: 10, right: 15, bottom: 35, left: 45 }
    : { top: 30, right: 20, bottom: 40, left: 50 };

  const cols = flipped ? DAYS_COUNT : HOURS;
  const rows = flipped ? HOURS : DAYS_COUNT;

  const availW = Math.max(8, width - pad.left - pad.right);
  const targetH = height != null
    ? (flipped ? height : Math.min(height, width * ASPECT_LANDSCAPE))
    : width * ASPECT_LANDSCAPE;
  const availH = Math.max(8, targetH - pad.top - pad.bottom);
  const cellW = flipped
    ? Math.max(8, Math.min(FLIPPED_CELL_W, availW / cols))
    : availW / cols;
  const cellH = flipped
    ? Math.max(4, Math.min(FLIPPED_CELL_H, availH / rows))
    : Math.max(2, availH / rows);

  const innerW = cellW * cols;
  const innerH = cellH * rows;

  const svgW = flipped ? innerW + pad.left + pad.right : width;
  const svgH = Math.round(innerH + pad.top + pad.bottom);

  const { maxCount, radiusScale } = useMemo(() => {
    const maxVal = max(data, (d) => d.count) || 1;
    const maxRadius = Math.max(2, Math.min(16, cellW * 0.6, cellH * 0.9));
    const radiusScale = scaleLinear().domain([0, maxVal]).range([0, maxRadius]);
    return { maxCount: maxVal, radiusScale };
  }, [data, cellW, cellH]);

  const xLabels = flipped
    ? DAYS.map((day, i) => ({ label: day, pos: i }))
    : HOUR_TICKS.map((h) => ({ label: `${h}:00`, pos: h }));

  const yLabels = flipped
    ? HOUR_TICKS.map((h) => ({ label: `${h}:00`, pos: h }))
    : DAYS.map((day, i) => ({ label: day, pos: i }));

  const getCX = (d: PunchcardData) =>
    (flipped ? d.day_of_week : d.hour) * cellW + cellW / 2;
  const getCY = (d: PunchcardData) =>
    (flipped ? d.hour : d.day_of_week) * cellH + cellH / 2;

  const gridLines = Array.from({ length: rows }, (_, i) => i);

  return (
    <div
      className="relative w-full flex flex-col items-center"
      onTouchStart={markTouch}
    >
      <div className="h-6 mb-2 font-serif text-slate-900 text-xs sm:text-sm tracking-widest">
        {hoveredData && hoveredData.count > 0 ? (
          <div>
            <span className="text-brand">{`${hoveredData.count}`}</span>{' '}
            {` file edits at ${hoveredData.hour}:00 on ${DAYS[hoveredData.day_of_week]}`}
          </div>
        ) : (
          ' '
        )}
      </div>

      <svg width={svgW} height={svgH}>
        <g transform={`translate(${pad.left}, ${pad.top})`}>
          {yLabels.map(({ label, pos }) => (
            <text
              key={label}
              x={-8}
              y={pos * cellH + cellH / 2}
              dominantBaseline="central"
              textAnchor="end"
              className="fill-slate-500 font-serif text-[9px] sm:text-[10px] tracking-widest"
            >
              {label}
            </text>
          ))}

          {xLabels.map(({ label, pos }) => (
            <text
              key={label}
              x={pos * cellW + cellW / 2}
              y={innerH + 20}
              textAnchor={flipped ? 'end' : 'middle'}
              transform={
                flipped
                  ? `rotate(-45, ${pos * cellW + cellW / 2}, ${innerH + 20})`
                  : undefined
              }
              className="fill-slate-500 font-serif text-[9px] sm:text-[10px] tracking-widest"
            >
              {label}
            </text>
          ))}

          {gridLines.map((i) => (
            <line
              key={`grid-${i}`}
              x1={0}
              y1={i * cellH + cellH / 2}
              x2={innerW}
              y2={i * cellH + cellH / 2}
              className="stroke-slate-200 stroke-[0.5px]"
            />
          ))}

          {data.map((d) => {
            const cx = getCX(d);
            const cy = getCY(d);
            const r = radiusScale(d.count);
            const opacity = 0.2 + (d.count / maxCount) * 0.8;
            const inFocus =
              !focus ||
              (focus === 'weekend' ? d.day_of_week >= 5 : focus === '8pm' ? d.hour === 20 : d.hour >= 18);

            return (
              <circle
                key={`${d.day_of_week}-${d.hour}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={COLOR_BRAND}
                opacity={d.count === 0 ? 0 : focus && !inFocus ? 0.08 : opacity}
                className="transition-all duration-300 hover:fill-brand-700 cursor-pointer"
                style={{ pointerEvents: d.count === 0 ? 'none' : 'auto' }}
                onMouseEnter={() => { if (!fromTouch()) setHoveredData(d); }}
                onMouseLeave={() => { if (!fromTouch()) setHoveredData(null); }}
                onClick={() => selectCell(d)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
