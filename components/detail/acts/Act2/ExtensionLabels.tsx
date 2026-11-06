'use client';

import React from 'react';
import {
  BADGE_W,
  GROUPED_KEYS,
  ROW_H,
  SWATCH,
} from './act2Layout';
import type { LabelLayout, LabelMode } from './act2Layout';

/**
 * The act's spine: the 16 file types as one persistent set of chips. They are
 * drawn exactly once and only moved / restyled per substep, so the viewer keeps
 * a fixed anchor while the graphic is replaced (descriptions -> links -> bars
 * -> stream).
 *
 *   glossary — the badge plate (step 0, visually unchanged)
 *   parallel — a bare label + slate indicator, grouped order (step 1)
 *   bars     — label + count, ranked order, bars grow to the right (step 2)
 *   legend   — a swatch + label across the top grid (step 3)
 *
 * GSAP owns `transform` (x/y), and the opacity of `.lbl-fill` / `.lbl-ind` /
 * `.lbl-count`; React owns everything else (background, size, font), which is
 * safe because the two never write the same property.
 */

interface ExtensionLabelsProps {
  rankedKeys: string[];
  counts: Record<string, number>;
  /** ramp colour per key (the step-3 swatch, matching bars/stream) */
  colors: Record<string, string>;
  layout: LabelLayout;
  svgWidth: number;
  svgHeight: number;
  compact: boolean;
  mode: LabelMode;
  hoveredKey: string | null;
  /** Formats that stay lit even when the focus is a course (or a set). */
  highlightedKeys?: Set<string>;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
  brand500: string;
  brand600: string;
  surface: string;
}

const SLATE = '#CBD5E1';
const INK = '#1E293B';
const MUTED = '#64748B';

export default function ExtensionLabels({
  rankedKeys,
  counts,
  colors,
  layout,
  svgWidth,
  svgHeight,
  compact,
  mode,
  hoveredKey,
  highlightedKeys,
  onHover,
  onSelect,
  brand500,
  brand600,
  surface,
}: ExtensionLabelsProps) {
  const glossary = mode === 'glossary';
  const anyHovered = hoveredKey !== null;
  const fontPx = compact ? 11 : 12;
  // Only the glossary step follows the fitted row height; the parallel/bar/
  // legend labels keep their designed 19.5px chip so those steps do not shrink.
  const chipH = glossary ? layout.rowH : ROW_H;

  return (
    <div
      className="layer-labels absolute inset-0 z-20 flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="relative overflow-visible mt-6"
        style={{ width: svgWidth, height: svgHeight }}
      >
        {rankedKeys.map((key, rankIndex) => {
          const gSpot = layout.spot('glossary', key, rankIndex);
          const pSpot = layout.spot('parallel', key, rankIndex);
          const lSpot = layout.spot('legend', key, rankIndex);
          const base = layout.evenCenterY(rankIndex);
          const isHovered = hoveredKey === key;
          const isDimmed = !glossary && anyHovered && !isHovered && !highlightedKeys?.has(key);

          return (
            <button
              key={key}
              type="button"
              className="ext-label absolute flex items-center select-none cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/70"
              data-key={key}
              data-gx={gSpot.x}
              data-gy={gSpot.y - base}
              data-px={0}
              data-py={pSpot.y - base}
              data-lx={lSpot.x}
              data-ly={lSpot.y - base}
              style={{
                top: base - chipH / 2,
                left: 0,
                width: layout.chipW,
                height: chipH,
                // The chip's flex box is CONSTANT: the text always starts at the
                // chip's left edge and GSAP translates it to the step's inset
                // (tucked inside the badge / right-aligned at the link fan /
                // the column pad). Keeping the layout out of React is what lets
                // those realignments animate WITH the movement instead of
                // snapping on the step re-render.
                paddingLeft: 0,
                paddingRight: 6,
                justifyContent: 'flex-start',
                pointerEvents: 'auto',
              }}
              aria-label={`${key} — ${counts[key]} files`}
              aria-pressed={isHovered}
              onMouseEnter={() => onHover(key)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(key)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(key)}
            >
              {/* the step-0 badge plate */}
              <span
                className="lbl-fill absolute"
                style={{
                  left: (layout.chipW - BADGE_W) / 2,
                  top: 0,
                  bottom: 0,
                  width: BADGE_W,
                  background: isHovered ? brand500 : SLATE,
                }}
              />
              {/* hover feedback: a faint plate, plus the ink/brand text swap below */}
              <span
                className="lbl-hover absolute inset-0 transition-opacity duration-150"
                style={{
                  background: glossary ? 'rgba(255,255,255,0.18)' : 'rgba(41,37,36,0.06)',
                  opacity: isHovered ? 1 : 0,
                }}
              />
              {/* indicator (step 1) / legend swatch (step 3) */}
              <span
                className="lbl-ind absolute"
                style={{
                  left: 0,
                  top: '50%',
                  translate: '0 -50%',
                  width: mode === 'legend' ? SWATCH : 6,
                  height: mode === 'legend' ? SWATCH : 8,
                  background: isHovered
                    ? brand500
                    : mode === 'legend'
                      ? colors[key]
                      : SLATE,
                }}
              />
              <span
                className={`lbl-text relative whitespace-nowrap transition-opacity duration-200 ${
                  isDimmed ? 'opacity-30' : 'opacity-100'
                }`}
                style={{
                  color: glossary ? (isHovered ? surface : MUTED) : isHovered ? brand600 : INK,
                  fontFamily: glossary ? undefined : 'var(--font-serif)',
                  fontWeight: glossary ? 700 : 400,
                  fontSize: fontPx,
                  letterSpacing: glossary ? '-0.025em' : undefined,
                }}
              >
                {key}
              </span>
              <span
                className="lbl-count absolute tabular-nums"
                style={{
                  // Pinned to the chip's right pad rather than laid out in the
                  // flex row: a mode swap used to collapse its width and drop
                  // `margin-left: auto` in the same render, so the number
                  // teleported next to the label and faded out THERE. Absolute
                  // means the only thing that ever changes is its opacity.
                  right: 6,
                  top: '50%',
                  translate: '0 -50%',
                  color: MUTED,
                  fontFamily: 'var(--font-serif)',
                  fontSize: compact ? 10 : 12,
                }}
              >
                <span
                  className={`block text-right transition-opacity duration-200 ${
                    isDimmed ? 'opacity-30' : 'opacity-100'
                  }`}
                >
                  {counts[key]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { GROUPED_KEYS };
