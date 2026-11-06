'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  isCursorVariant,
  tokenizeReadingText,
  type ReadingVariant,
} from './readingVariants';

/**
 * One paragraph of running copy wearing a read-progress mechanism.
 *
 * The sweep is quantised to word tokens, not pixels: `readCount` says how many
 * tokens the reader has passed, so a slow scroll ticks the cursor/marker/rule
 * forward one word at a time. The caller owns the scroll maths (see
 * `NarrativeLab`) — this component only paints the state.
 *
 * The caret variants keep their cursor in the inline flow (a zero-width anchor
 * threaded between glyphs), so it stays glued to the word even as the paragraph
 * reflows. The highlighter and underline variants need line geometry, which is
 * measured from a Range once per word and painted as bands behind the type.
 */

/** Unread copy in the cursor variants. Enough to read, clearly behind. */
const UNREAD_INK = 0.26;

const BRAND = 'var(--color-brand)';
/** Deep manila for reverse type; the landing kraft is too light for white. */
const KRAFT_DEEP = '#8A6A45';

/** Base follower speed for the smooth word block, in words per second. */
const SMOOTH_WORDS_PER_SEC = 10;
/** Extra words/second of catch-up per word of lag, capped by the step. */
const SMOOTH_CATCHUP = 0.8;

interface WordRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface LineBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
}

interface Geometry {
  lines: LineBox[];
  /** Left edge of the caret, relative to the paragraph box. */
  caretX: number;
  /** Index into `lines` of the line the caret is sitting on. */
  caretLine: number;
  /** Baseline offset inside a line box — the anchor for every band. */
  baselineInLine: number;
  /** Right edge of the current word, relative to the paragraph box. */
  wordRight: number;
}

const EMPTY_GEOMETRY: Geometry = {
  lines: [],
  caretX: 0,
  caretLine: 0,
  baselineInLine: 0,
  wordRight: 0,
};

interface ReadingProgressTextProps {
  text: string;
  /** Number of word tokens already read, 0…token count. */
  readCount: number;
  variant: ReadingVariant;
  /** Word block only: follow the target with a rate-limited sliding block. */
  smooth?: boolean;
  className?: string;
}

export default function ReadingProgressText({
  text,
  readCount,
  variant,
  smooth = false,
  className = '',
}: ReadingProgressTextProps) {
  const tokens = useMemo(() => tokenizeReadingText(text), [text]);
  const hostRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const caretAnchorRef = useRef<HTMLSpanElement>(null);
  const baselineProbeRef = useRef<HTMLSpanElement>(null);
  const currentWordRef = useRef<HTMLSpanElement>(null);
  const [geometry, setGeometry] = useState<Geometry>(EMPTY_GEOMETRY);

  // Smooth word block: a single overlay that follows the target word with a
  // capped speed, plus a clipped duplicate of the copy for the reverse-out.
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const wordRectsRef = useRef<WordRect[]>([]);
  const blockRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const displayRef = useRef(0);
  const targetRef = useRef(readCount);
  const visibleWordRef = useRef(readCount);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const fontSizeRef = useRef(17);
  const [visibleWord, setVisibleWord] = useState(readCount);
  const reducedMotion = useReducedMotion();
  const reducedMotionRef = useRef(false);

  const smoothActive = smooth && variant === 'word-block';

  const caretIndex = Math.min(Math.max(readCount, 0), tokens.length);
  const caretVisible = caretIndex < tokens.length;
  const isGeometryVariant =
    variant === 'marker' ||
    variant === 'line-marker' ||
    variant === 'underline' ||
    variant === 'rising' ||
    variant === 'reverse' ||
    variant === 'rising-current';
  const fadeUnread = isCursorVariant(variant);

  /**
   * Paint the smooth block from the current float position. The block is a
   * single absolutely positioned element, so a fast scroll moves it along the
   * word rects at a capped speed instead of jumping from span to span. The
   * white copy is a clipped duplicate of the paragraph, which lets the block
   * invert whatever it covers without touching per-token styles.
   */
  const updateOverlay = useCallback((display: number) => {
    const host = hostRef.current;
    const block = blockRef.current;
    const ghost = ghostRef.current;
    const rects = wordRectsRef.current;
    if (!host || !block || !ghost) return;

    const count = rects.length;
    if (count === 0 || display >= count - 0.0005) {
      block.style.opacity = '0';
      ghost.style.opacity = '0';
      ghost.style.clipPath = 'inset(100% 0 0 0)';
      return;
    }

    const clamped = Math.max(display, 0);
    const index = Math.min(Math.floor(clamped), count - 1);
    const next = Math.min(index + 1, count - 1);
    const t = next === index ? 0 : Math.min(Math.max(clamped - index, 0), 1);
    const a = rects[index];
    const b = rects[next];
    const padX = fontSizeRef.current * 0.06;
    const padY = fontSizeRef.current * 0.15;

    const left = a.left + (b.left - a.left) * t - padX;
    const top = a.top + (b.top - a.top) * t - padY;
    const width = a.width + (b.width - a.width) * t + padX * 2;
    const height = a.height + (b.height - a.height) * t + padY * 2;
    const fade = clamped > count - 1 ? Math.max(0, 1 - (clamped - (count - 1))) : 1;

    block.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    block.style.width = `${width}px`;
    block.style.height = `${height}px`;
    block.style.opacity = String(fade);

    const hostWidth = host.clientWidth;
    const hostHeight = host.clientHeight;
    const clipLeft = Math.max(0, left);
    const clipTop = Math.max(0, top);
    const clipRight = Math.max(0, hostWidth - (left + width));
    const clipBottom = Math.max(0, hostHeight - (top + height));
    ghost.style.clipPath = `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`;
    ghost.style.opacity = String(fade);
  }, []);

  const measureWords = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostRect = host.getBoundingClientRect();
    fontSizeRef.current = parseFloat(getComputedStyle(host).fontSize) || 17;
    const rects: WordRect[] = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const element = wordRefs.current[index];
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      rects.push({
        left: rect.left - hostRect.left,
        top: rect.top - hostRect.top,
        width: rect.width,
        height: rect.height,
      });
    }
    wordRectsRef.current = rects;
    updateOverlay(displayRef.current);
  }, [tokens.length, updateOverlay]);

  const startLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      const target = targetRef.current;
      let display = displayRef.current;
      const diff = target - display;

      if (reducedMotionRef.current || Math.abs(diff) < 0.001) {
        display = target;
      } else {
        const speed =
          SMOOTH_WORDS_PER_SEC + Math.min(Math.abs(diff), 20) * SMOOTH_CATCHUP;
        display += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      }

      displayRef.current = display;
      updateOverlay(display);
      const rounded = Math.round(display);
      if (rounded !== visibleWordRef.current) {
        visibleWordRef.current = rounded;
        setVisibleWord(rounded);
      }

      if (Math.abs(targetRef.current - display) > 0.001) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        runningRef.current = false;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, [updateOverlay]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    targetRef.current = Math.min(Math.max(readCount, 0), tokens.length);
  }, [readCount, tokens.length]);

  useEffect(() => {
    if (!smoothActive) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      runningRef.current = false;
      if (blockRef.current) blockRef.current.style.opacity = '0';
      if (ghostRef.current) {
        ghostRef.current.style.opacity = '0';
        ghostRef.current.style.clipPath = 'inset(100% 0 0 0)';
      }
      return;
    }

    const initial = Math.min(Math.max(targetRef.current, 0), tokens.length);
    displayRef.current = initial;
    visibleWordRef.current = initial;
    const frame = requestAnimationFrame(() => {
      setVisibleWord(initial);
      measureWords();
      updateOverlay(initial);
    });

    const host = hostRef.current;
    const observer = host ? new ResizeObserver(() => measureWords()) : null;
    if (host && observer) observer.observe(host);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measureWords();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      runningRef.current = false;
    };
  }, [smoothActive, measureWords, updateOverlay, tokens.length]);

  useEffect(() => {
    if (!smoothActive) return;
    const target = Math.min(Math.max(readCount, 0), tokens.length);
    targetRef.current = target;
    if (Math.abs(target - displayRef.current) < 0.001) {
      updateOverlay(displayRef.current);
      return;
    }
    startLoop();
  }, [readCount, smoothActive, tokens.length, startLoop, updateOverlay]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      runningRef.current = false;
    };
  }, []);

  /**
   * Read the paragraph's line boxes and the current caret position out of the
   * DOM. Range rects are grouped by line (one rect per line fragment, or one
   * per word in some engines), which is all the painter needs: a band can run
   * from a line's left edge to the caret, or across the full measure.
   */
  const measure = useCallback(() => {
    const host = hostRef.current;
    const textEl = textRef.current;
    if (!host || !textEl) return;

    const hostRect = host.getBoundingClientRect();

    const range = document.createRange();
    range.selectNodeContents(textEl);
    const rects = Array.from(range.getClientRects());

    const lines: LineBox[] = [];
    for (const rect of rects) {
      // Zero-width caret anchors and hairline carets are not line boxes.
      if (rect.width < 3 || rect.height < 4) continue;

      const top = rect.top - hostRect.top;
      const bottom = rect.bottom - hostRect.top;
      const left = rect.left - hostRect.left;
      const right = rect.right - hostRect.left;

      const existing = lines.find((line) => Math.abs(line.top - top) < 2.5);
      if (existing) {
        existing.top = Math.min(existing.top, top);
        existing.bottom = Math.max(existing.bottom, bottom);
        existing.left = Math.min(existing.left, left);
        existing.right = Math.max(existing.right, right);
        existing.height = existing.bottom - existing.top;
      } else {
        lines.push({ top, bottom, left, right, height: bottom - top });
      }
    }
    lines.sort((a, b) => a.top - b.top);

    const anchor = caretAnchorRef.current;
    let caretX = 0;
    let caretLine = 0;
    if (anchor) {
      const anchorRect = anchor.getBoundingClientRect();
      caretX = anchorRect.left - hostRect.left;
      // The anchor is a zero-height inline-block, so its bottom sits on the
      // baseline. Pick the line whose box contains that baseline.
      const baseline = anchorRect.bottom - hostRect.top;
      let nearest = Number.POSITIVE_INFINITY;
      lines.forEach((line, index) => {
        const distance =
          baseline < line.top
            ? line.top - baseline
            : baseline > line.bottom
              ? baseline - line.bottom
              : 0;
        if (distance < nearest) {
          nearest = distance;
          caretLine = index;
        }
      });
    }

    // The paragraph opens with a zero-height probe; its bottom is the first
    // line's baseline. Every line shares that offset inside its box, so the
    // bands can be drawn from the baseline rather than guessed from the box.
    let baselineInLine = 0;
    const probe = baselineProbeRef.current;
    if (probe && lines[0]) {
      baselineInLine =
        probe.getBoundingClientRect().bottom - hostRect.top - lines[0].top;
    }

    let wordRight = 0;
    const wordEl = currentWordRef.current;
    if (wordEl) {
      wordRight = wordEl.getBoundingClientRect().right - hostRect.left;
    }

    setGeometry({ lines, caretX, caretLine, baselineInLine, wordRight });
  }, []);

  // Re-measure whenever the sweep moves a word, and when layout can change.
  useEffect(() => {
    if (!isGeometryVariant) return;
    measure();
  }, [isGeometryVariant, measure, readCount, text, variant]);

  useEffect(() => {
    if (!isGeometryVariant) return;
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver(() => measure());
    observer.observe(host);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [isGeometryVariant, measure]);

  /**
   * The painted bands, back to front: marker, line marker, underline, or the
   * rising kraft band. Everything is positioned relative to the paragraph box,
   * so it travels with the copy as the page scrolls.
   */
  const bands = useMemo(() => {
    if (!isGeometryVariant || geometry.lines.length === 0) return [];

    const fullyRead = readCount >= tokens.length;
    const lastLine = geometry.lines.length - 1;
    const currentLine = fullyRead
      ? lastLine
      : Math.min(geometry.caretLine, lastLine);
    const painted: { key: string; style: CSSProperties }[] = [];

    geometry.lines.forEach((line, index) => {
      let bandWidth = 0;

      if (fullyRead) {
        bandWidth = line.right - line.left;
      } else if (variant === 'line-marker') {
        // Whole-line mechanic: a line is either untouched or complete. Nothing
        // is painted until the first word has actually been passed.
        if (readCount === 0 || index > currentLine) return;
        bandWidth = line.right - line.left;
      } else if (index < currentLine) {
        bandWidth = line.right - line.left;
      } else if (index === currentLine) {
        bandWidth = geometry.caretX - line.left;
      }

      if (bandWidth <= 0.5) return;

      // Place every mark from the measured baseline, in ems, so the geometry
      // follows the type rather than the line box: a marker caps the x-height,
      // the rule sits just under the baseline, and the kraft band rises from
      // below the baseline into the lower half of the glyphs.
      const baseline = line.top + (geometry.baselineInLine || line.height * 0.8);

      const style: CSSProperties = {
        position: 'absolute',
        left: line.left,
        width: bandWidth,
        zIndex: -1,
        pointerEvents: 'none',
      };

      if (variant === 'marker' || variant === 'line-marker') {
        style.top = `calc(${baseline}px - 0.62em)`;
        style.height = '0.74em';
        style.background =
          'color-mix(in srgb, var(--color-brand) 40%, transparent)';
        style.borderRadius = '0.12em';
      } else if (variant === 'underline') {
        style.top = `calc(${baseline}px + 0.22em)`;
        style.height = 2;
        style.background = BRAND;
        style.opacity = 0.78;
        style.borderRadius = 1;
      } else if (variant === 'reverse') {
        // Full line-height kraft: the read words reverse to white inside it.
        style.top = line.top + 1;
        style.height = Math.max(line.height - 2, 2);
        style.background = KRAFT_DEEP;
        style.borderRadius = '0.04em';
      } else {
        // 0.5em of kraft, anchored so it rises into the lower half of the
        // type — the landing page's marker band, applied per line.
        style.top = `calc(${baseline}px - 0.35em)`;
        style.height = '0.5em';
        style.background = 'var(--color-kraft)';
        style.borderRadius = '0.05em';
      }

      painted.push({ key: `${variant}-${index}`, style });
    });

    // The current word gets its own lower-half band, in a warm coral so it
    // separates from the kraft without becoming a full-width block.
    if (variant === 'rising-current' && !fullyRead) {
      const line = geometry.lines[currentLine];
      const wordWidth = geometry.wordRight - geometry.caretX;
      if (line && wordWidth > 0.5) {
        const baseline = line.top + (geometry.baselineInLine || line.height * 0.8);
        painted.push({
          key: 'rising-current-word',
          style: {
            position: 'absolute',
            left: geometry.caretX,
            width: wordWidth,
            top: `calc(${baseline}px - 0.35em)`,
            height: '0.5em',
            background: 'var(--color-brand-400)',
            borderRadius: '0.05em',
            zIndex: -1,
            pointerEvents: 'none',
          },
        });
      }
    }

    return painted;
  }, [geometry, isGeometryVariant, readCount, tokens.length, variant]);

  if (smoothActive) {
    return (
      <p
        ref={hostRef}
        data-reading-variant={variant}
        data-read-count={readCount}
        data-smooth="true"
        className={`t-body ${className}`.trim()}
        style={{ position: 'relative', isolation: 'isolate' }}
      >
        <span ref={textRef} style={{ display: 'block' }}>
          {tokens.map((token, index) => {
            const wordText = token.trimEnd();
            const trailing = token.slice(wordText.length);
            const unread = index >= visibleWord;
            return (
              <span
                key={index}
                style={{
                  opacity: unread ? UNREAD_INK : 1,
                  transition: 'opacity 120ms linear',
                }}
              >
                <span
                  ref={(element) => {
                    wordRefs.current[index] = element;
                  }}
                >
                  {wordText}
                </span>
                {trailing}
              </span>
            );
          })}
        </span>

        <span
          ref={blockRef}
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            zIndex: 1,
            borderRadius: '0.06em',
            background: BRAND,
            pointerEvents: 'none',
            opacity: 0,
            willChange: 'transform, width, height, opacity',
          }}
        />

        <span
          ref={ghostRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            color: 'var(--color-surface)',
            pointerEvents: 'none',
            userSelect: 'none',
            clipPath: 'inset(100% 0 0 0)',
            opacity: 0,
            willChange: 'clip-path, opacity',
          }}
        >
          {tokens.map((token, index) => {
            const wordText = token.trimEnd();
            const trailing = token.slice(wordText.length);
            return (
              <span key={index}>
                <span>{wordText}</span>
                {trailing}
              </span>
            );
          })}
        </span>
      </p>
    );
  }

  return (
    <p
      ref={hostRef}
      data-reading-variant={variant}
      data-read-count={readCount}
      className={`t-body ${className}`.trim()}
      style={{ position: 'relative', isolation: 'isolate' }}
    >
      <span ref={textRef}>
        <span
          ref={baselineProbeRef}
          aria-hidden
          style={{
            display: 'inline-block',
            width: 0,
            height: 0,
            verticalAlign: 'baseline',
          }}
        />
        {tokens.map((token, index) => {
          const isCaret = caretVisible && index === caretIndex;
          const unread = fadeUnread && index >= caretIndex;
          const blockCaret = isCaret && variant === 'block';
          const wordCaret =
            isCaret && (variant === 'word-block' || variant === 'reverse');
          const currentBandWord =
            isCaret && variant === 'rising-current';
          const splitWord = wordCaret || currentBandWord;
          const wordText = splitWord ? token.trimEnd() : token;
          const trailing = splitWord ? token.slice(wordText.length) : '';
          const reverseRead = variant === 'reverse' && index < caretIndex;
          const textStyle: CSSProperties | undefined = reverseRead
            ? { color: 'var(--color-surface)' }
            : unread
              ? { opacity: UNREAD_INK }
              : undefined;

          return (
            <span key={index}>
              {isCaret && (
                <span
                  ref={caretAnchorRef}
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    position: 'relative',
                    width: 0,
                    height: 0,
                    verticalAlign: 'baseline',
                  }}
                >
                  {variant === 'bar' && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: -1,
                        bottom: 0,
                        width: 2,
                        height: '1.08em',
                        borderRadius: 1,
                        background: BRAND,
                        boxShadow: `0 0 0 0.5px color-mix(in srgb, ${BRAND} 18%, transparent)`,
                      }}
                    />
                  )}
                  {variant === 'pre-block' && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        right: '0.02em',
                        bottom: 0,
                        width: '0.34em',
                        height: '1.05em',
                        borderRadius: '0.05em',
                        background: BRAND,
                        zIndex: -1,
                      }}
                    />
                  )}
                </span>
              )}

              {blockCaret && (
                <span
                  style={{
                    background: BRAND,
                    color: 'var(--color-surface)',
                    paddingBlock: '0.06em',
                    paddingInline: '0.18em',
                    marginInline: '-0.18em',
                    borderRadius: '0.08em',
                  }}
                >
                  {token.slice(0, 1)}
                </span>
              )}

              {wordCaret ? (
                <>
                  <span
                    style={{
                      background: BRAND,
                      color: 'var(--color-surface)',
                      paddingBlock: '0.15em',
                      paddingInline: '0.06em',
                      marginInline: '-0.06em',
                      borderRadius: '0.06em',
                      boxDecorationBreak: 'clone',
                    }}
                  >
                    {wordText}
                  </span>
                  {trailing}
                </>
              ) : (
                <span style={textStyle}>
                  {currentBandWord ? (
                    <>
                      <span ref={currentWordRef}>{wordText}</span>
                      {trailing}
                    </>
                  ) : blockCaret ? (
                    token.slice(1)
                  ) : (
                    token
                  )}
                </span>
              )}
            </span>
          );
        })}
      </span>

      {bands.map((band) => (
        <span key={band.key} aria-hidden style={band.style} />
      ))}
    </p>
  );
}
