import { groupedExtensions } from '@/constants/extension';

/**
 * Act 2's shared label geometry. The 16 extension labels are drawn once
 * (ExtensionLabels.tsx) and moved/restyled per substep; every consumer — the
 * labels, the parallel-set links, the bars, the legend — reads its coordinates
 * from here so nothing drifts out of alignment.
 *
 * All measurements were taken from the pre-refactor DOM (viewport 1127x672):
 * a glossary row is 19.5px tall (the description's line box), rows sit on a 10px
 * gap inside a group and a 24px gap between groups, the whole glossary is 490px
 * tall, and the SVG box is shifted down 12px by the layers' `mt-6`.
 */

export const ROW_H = 19.5; // a glossary row's height
export const ROW_GAP = 10; // gap-2.5
export const GROUP_GAP = 24; // gap-6
export const BADGE_W = 80; // w-20, the step-0 badge plate
export const MT = 12; // mt-6 / 2 — the SVG layers sit this far below centre
export const SWATCH = 8;

/**
 * Horizontal breathing room the streamgraph leaves on each side (its x scale
 * runs 35 … svgWidth-35 so the basis-curve caps and the term labels are not
 * clipped). The step-3 legend grid uses the same span, otherwise the legend
 * runs edge to edge while the river is inset and the two read as misaligned.
 */
export const STREAM_INSET = 35;

export type LabelMode = 'glossary' | 'parallel' | 'bars' | 'legend';

export const GROUPED_KEYS = groupedExtensions.flat() as string[];

export interface LabelLayout {
  glossW: number;
  badgeX: number;
  glossH: number;
  /** Row height after the compact fit (equal to ROW_H on desktop). */
  rowH: number;
  descW: number;
  chipW: number;
  chartX0: number;
  /** Bottom edge of the step-3 legend grid; the stream starts below this. */
  legendBottom: number;
  /** Centre y of the i-th row in the parallel/bar even grid. */
  evenCenterY: (i: number) => number;
  spot: (mode: LabelMode, key: string, rankIndex: number) => { x: number; y: number };
}

export function buildLabelLayout(
  rankedKeys: string[],
  svgWidth: number,
  svgHeight: number,
  compact: boolean,
): LabelLayout {
  const N = GROUPED_KEYS.length;

  // ── the glossary's flow layout, reproduced numerically ──
  const glossW = Math.min(0.9 * svgWidth, 896);
  const badgeX = (svgWidth - glossW) / 2;

  // On compact screens the 16 descriptions have to fit the visual pane; keep
  // the designed 19.5px rows where there is room and tighten the row/group gaps,
  // shrinking the row height only as much as the pane requires.
  const groupCount = groupedExtensions.length;
  const rowGap = compact ? 5 : ROW_GAP;
  const groupGap = compact ? 14 : GROUP_GAP;
  const fitPad = compact ? 16 : 0;
  const fitRowH =
    (svgHeight - fitPad - (N - groupCount) * rowGap - (groupCount - 1) * groupGap) / N;
  const rowH = compact ? Math.max(12, Math.min(ROW_H, fitRowH)) : ROW_H;
  const glossH = N * rowH + (N - groupCount) * rowGap + (groupCount - 1) * groupGap;

  const flowY: Record<string, number> = {};
  let y = 0;
  groupedExtensions.forEach((group) => {
    group.forEach((k) => {
      flowY[k] = y;
      y += rowH + rowGap;
    });
    y += groupGap - rowGap;
  });

  // ── the even grid (steps 1-3) ──
  const PAD_Y = compact ? 20 : 30;
  const INNER_H = Math.max(80, svgHeight - PAD_Y * 2);
  const evenCenterY = (i: number) => PAD_Y + (i * INNER_H) / Math.max(1, N - 1);

  const chipW = compact ? 72 : 96;
  const descW = glossW - BADGE_W - (compact ? 12 : 16);
  const chartX0 = chipW + (compact ? 6 : 10);

  // ── the legend grid (step 3) ──
  // Same span as the streamgraph, with the first chip flush to its left edge and
  // the last chip flush to its right edge, so the legend reads as part of the
  // chart instead of a full-bleed strip above an inset river.
  const cols = svgWidth < 620 ? 4 : 8;
  const legendX0 = STREAM_INSET;
  const legendStepX = cols > 1 ? (svgWidth - STREAM_INSET * 2 - chipW) / (cols - 1) : 0;
  const legendRowH = compact ? 20 : 26;
  const legendTop = PAD_Y;
  const legendRows = Math.ceil(N / cols);
  const legendBottom = legendTop + legendRows * legendRowH;

  const centre = (mode: LabelMode, key: string, rankIndex: number): number => {
    switch (mode) {
      case 'glossary':
        return flowY[key] + rowH / 2 - glossH / 2 + svgHeight / 2 - MT;
      case 'parallel':
        return evenCenterY(GROUPED_KEYS.indexOf(key));
      case 'bars':
        return evenCenterY(rankIndex);
      case 'legend':
        return legendTop + Math.floor(rankIndex / cols) * legendRowH + legendRowH / 2;
    }
  };

  const x = (mode: LabelMode, rankIndex: number): number => {
    switch (mode) {
      case 'glossary':
        return badgeX - (chipW - BADGE_W) / 2;
      case 'parallel':
      case 'bars':
        return 0;
      case 'legend':
        return legendX0 + (rankIndex % cols) * legendStepX;
    }
  };

  return {
    glossW,
    badgeX,
    glossH,
    rowH,
    descW,
    chipW,
    chartX0,
    legendBottom,
    evenCenterY,
    spot: (mode, key, rankIndex) => ({ x: x(mode, rankIndex), y: centre(mode, key, rankIndex) }),
  };
}
