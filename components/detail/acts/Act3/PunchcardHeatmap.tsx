'use client';

import React, { useMemo, useState } from 'react';
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
  flip?: boolean;
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
  flip = false,
}: PunchcardProps) {
  const flipped = flip;
  const [hoveredData, setHoveredData] = useState<PunchcardData | null>(null);
  const COLOR_BRAND = useThemeVariable('--color-brand');

  const pad = flipped
    ? { top: 10, right: 15, bottom: 35, left: 45 }
    : { top: 30, right: 20, bottom: 40, left: 50 };

  const cols = flipped ? DAYS_COUNT : HOURS;
  const rows = flipped ? HOURS : DAYS_COUNT;

  const cellW = flipped ? FLIPPED_CELL_W : (width - pad.left - pad.right) / cols;
  const cellH = flipped
    ? FLIPPED_CELL_H
    : (width * ASPECT_LANDSCAPE - pad.top - pad.bottom) / rows;

  const innerW = cellW * cols;
  const innerH = cellH * rows;

  const svgW = flipped ? innerW + pad.left + pad.right : width;
  const svgH = Math.round(innerH + pad.top + pad.bottom);

  const { maxCount, radiusScale } = useMemo(() => {
    const maxVal = max(data, (d) => d.count) || 1;
    const radiusScale = scaleLinear().domain([0, maxVal]).range([0, 16]);
    return { maxCount: maxVal, radiusScale };
  }, [data]);

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
    <div className="relative w-full flex flex-col items-center" onTouchEnd={() => setHoveredData(null)}>
      <div className="h-6 mb-2 font-serif text-slate-900 text-xs sm:text-sm tracking-widest">
        {hoveredData && hoveredData.count > 0 ? (
          <div>
            <span className="text-brand">{`${hoveredData.count}`}</span>{' '}
            {` files at ${hoveredData.hour}:00 on ${DAYS[hoveredData.day_of_week]}`}
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
              className="fill-slate-400 font-serif text-[8px] sm:text-[10px] tracking-widest"
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
              className="fill-slate-400 font-serif text-[8px] sm:text-[10px] tracking-widest"
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

            return (
              <circle
                key={`${d.day_of_week}-${d.hour}`}
                cx={cx}
                cy={cy}
                r={r}
                fill={COLOR_BRAND}
                opacity={d.count === 0 ? 0 : opacity}
                className="transition-all duration-300 hover:fill-brand-700"
                onMouseEnter={() => setHoveredData(d)}
                onMouseLeave={() => setHoveredData(null)}
                onTouchStart={() => setHoveredData(d)}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
