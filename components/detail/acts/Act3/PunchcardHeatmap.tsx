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
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ASPECT_RATIO = 300 / 800; // height / width

export default function PunchcardHeatmap({
  data,
  width = 800,
}: PunchcardProps) {
  const height = Math.round(width * ASPECT_RATIO);
  const [hoveredData, setHoveredData] = useState<PunchcardData | null>(null);

  const COLOR_BRAND = useThemeVariable('--color-brand');

  const padding = { top: 30, right: 20, bottom: 40, left: 50 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const { maxCount, radiusScale } = useMemo(() => {
    const maxVal = max(data, (d) => d.count) || 1;
    const radiusScale = scaleLinear().domain([0, maxVal]).range([0, 16]);
    return { maxCount: maxVal, radiusScale };
  }, [data]);

  const cellWidth = innerWidth / 24;
  const cellHeight = innerHeight / 7;

  return (
    <div className="relative w-full flex flex-col items-center">
      <div className="h-6 mb-2 font-serif text-slate-900 text-xs sm:text-sm tracking-widest">
        {hoveredData && hoveredData.count > 0 ? (
          <div>
            <span className="text-brand">{`${hoveredData.count}`}</span>{' '}
            {` files modified at ${hoveredData.hour}:00 on ${DAYS[hoveredData.day_of_week]}`}
          </div>
        ) : (
          ' '
        )}
      </div>

      <svg width={width} height={height}>
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Y Axis */}
          {DAYS.map((day, i) => (
            <text
              key={day}
              x={-15}
              y={i * cellHeight + cellHeight / 2}
              alignmentBaseline="middle"
              textAnchor="end"
              className="fill-slate-400 font-serif text-[8px] sm:text-[10px] uppercase tracking-widest"
            >
              {day}
            </text>
          ))}

          {/* X Axis (Hours) */}
          {[0, 6, 12, 18, 23].map((hour) => (
            <text
              key={hour}
              x={hour * cellWidth + cellWidth / 2}
              y={innerHeight + 25}
              textAnchor="middle"
              className="fill-slate-400 font-serif text-[8px] sm:text-[10px] tracking-widest"
            >
              {hour}:00
            </text>
          ))}

          {/* Background Grid Lines */}
          {DAYS.map((_, i) => (
            <line
              key={`hline-${i}`}
              x1={0}
              y1={i * cellHeight + cellHeight / 2}
              x2={innerWidth}
              y2={i * cellHeight + cellHeight / 2}
              className="stroke-slate-200 stroke-[0.5px]"
            />
          ))}

          {/* Render Data Points (Punchcard Holes) */}
          {data.map((d, i) => {
            const cx = d.hour * cellWidth + cellWidth / 2;
            const cy = d.day_of_week * cellHeight + cellHeight / 2;
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
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
