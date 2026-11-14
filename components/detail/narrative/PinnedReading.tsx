'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Note } from './ReportType';
import { useEmphasis } from './EmphasisContext';
import { findPhraseRange, type ReadingKeyword } from './keywordRange';
import { tokenizeReadingText } from './tokenizeReading';

/** Scroll runway per word. 34px is roughly one wheel notch every two words. */
const PX_PER_WORD = 34;
/** The phone layout uses a shorter runway under a 58dvh sticky figure. */
const PX_PER_WORD_MOBILE = 22;

interface PinnedReadingProps {
  act: 1 | 2 | 3;
  step: number;
  text: string;
  keywords: ReadingKeyword[];
  /** Interaction note shown under the copy, in the margin voice. */
  note?: string;
  /** Phone layout: shorter word runway and a smaller pinned stage. */
  compact?: boolean;
}

/**
 * A substep that pins its copy and reads it word by word.
 *
 * The section owns a word-sized runway, the stage is sticky, and the current
 * word carries a caret in the gap after it. When the head reaches a keyword,
 * the phrase reverses to a red focus block and publishes its emphasis to the
 * figure.
 *
 * The binding is bi-directional: hovering a keyword in the copy, or its note
 * in the figure, sets a hover override in `EmphasisContext`. The override
 * re-opens the annotation and the visual filter even after the head has moved
 * on; releasing it returns focus to the reading head.
 */
export default function PinnedReading({
  act,
  step,
  text,
  keywords,
  note,
  compact = false,
}: PinnedReadingProps) {
  const tokens = useMemo(() => tokenizeReadingText(text), [text]);
  const ranges = useMemo(
    () =>
      keywords.map((keyword) => ({
        ...keyword,
        range: findPhraseRange(tokens, keyword.phrase),
      })),
    [keywords, tokens],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const [readCount, setReadCount] = useState(0);
  /**
   * The keyword the keyboard is on. Focusing a keyword is also a reading
   * gesture: the head jumps to the end of that phrase so the copy up to it is
   * lit and the caret sits after it. Blur hands the head back to the scroll.
   */
  const [focusedKeyword, setFocusedKeyword] = useState<string | null>(null);
  const { activeStep, active, hover, setReading, setHover } = useEmphasis();
  const reducedMotion = useReducedMotion();
  const isStepActive = activeStep?.act === act && activeStep?.step === step;

  const focusedRange = useMemo(
    () => ranges.find((keyword) => keyword.index === focusedKeyword)?.range ?? null,
    [ranges, focusedKeyword],
  );
  /** The head the copy draws: a focused keyword pulls it to the phrase's end. */
  const displayReadCount = focusedRange ? focusedRange.end : readCount;

  /**
   * The keyword that owns the current stretch of copy: the last one the head
   * has reached. It stays active until the next keyword, so the annotation is
   * not a one-word flash and the visual holds its emphasis while the sentence
   * explains it. At the end of the copy it releases, which hands the step back
   * to the substep transition.
   */
  const readingActive = useMemo(() => {
    if (readCount >= tokens.length) return null;
    let reached: (typeof ranges)[number] | null = null;
    for (const keyword of ranges) {
      if (keyword.range && readCount >= keyword.range.start) reached = keyword;
    }
    return reached;
  }, [ranges, readCount, tokens.length]);

  useEffect(() => {
    // Only the step the reader is actually in may publish the reading focus.
    // Otherwise an off-screen step's 0/end readCount would clear the active
    // keyword the moment we scroll back into a previous act.
    if (!isStepActive) return;
    setReading(
      readingActive
        ? {
            act,
            step,
            keyword: readingActive.index,
            emphasis: readingActive.emphasis,
          }
        : null,
    );
  }, [isStepActive, readingActive, act, step, setReading]);

  useEffect(
    () => () => {
      setReading(null);
      setHover(null);
    },
    [setReading, setHover],
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const scroller = section.closest(
      '[data-detail-scroller]',
    ) as HTMLElement | null;

    // The stage is sticky at `top` (0 on the two-column page, the 58dvh chart
    // on the phone), so a step starts READING only when its stage reaches that
    // line — not when the section reaches the top of the scroller, which on the
    // phone is half a screen behind the chart. Measuring the stage's own
    // geometry keeps both layouts on the same formula.
    const measure = () => {
      const stage = section.querySelector<HTMLElement>('.pinned-stage');
      const stickyTop = stage
        ? parseFloat(getComputedStyle(stage).top) || 0
        : 0;
      const stageHeight =
        stage?.offsetHeight ??
        (scroller ? scroller.clientHeight : window.innerHeight);
      return {
        stickyTop,
        stageHeight,
        // The stage stays pinned for this much of the section's scroll.
        travel: Math.max(section.offsetHeight - stageHeight, 1),
      };
    };

    let metrics = measure();

    const sync = () => {
      const scrollerTop = scroller
        ? scroller.getBoundingClientRect().top
        : 0;
      const bandTop = scrollerTop + metrics.stickyTop;
      const progress = Math.min(
        1,
        Math.max(0, (bandTop - section.getBoundingClientRect().top) / metrics.travel),
      );
      setReadCount(Math.round(progress * tokens.length));
    };

    sync();
    const target = scroller ?? window;
    target.addEventListener('scroll', sync, { passive: true });
    const onResize = () => {
      metrics = measure();
      sync();
    };
    window.addEventListener('resize', onResize);
    document.fonts?.ready.then(() => {
      metrics = measure();
      sync();
    });

    return () => {
      target.removeEventListener('scroll', sync);
      window.removeEventListener('resize', onResize);
    };
  }, [tokens.length]);

  /** token index -> its keyword, and whether it opens / closes the phrase */
  const keywordAt = useMemo(() => {
    const map = new Map<
      number,
      { keyword: (typeof ranges)[number]; isFirst: boolean; isLast: boolean }
    >();
    for (const keyword of ranges) {
      if (!keyword.range) continue;
      const { start, end } = keyword.range;
      for (let i = start; i <= end; i += 1) {
        map.set(i, {
          keyword,
          isFirst: i === start,
          isLast: i === end,
        });
      }
    }
    return map;
  }, [ranges]);

  const renderWord = (token: string, index: number): ReactNode => {
    const word = token.trimEnd();
    const trailing = token.slice(word.length);
    const isCurrent =
      !hover &&
      !reducedMotion &&
      index === displayReadCount &&
      displayReadCount < tokens.length &&
      /[\p{L}\p{N}]/u.test(word);
    // A focused keyword's caret belongs at the start of the next token: that is
    // the same gap the normal current-word caret sits in, just after the
    // phrase's trailing space.
    const isFocusCaret =
      focusedRange !== null && index === focusedRange.end + 1;

    return (
      <span
        key={`w-${index}`}
        className={
          isCurrent
            ? 'token-current'
            : isFocusCaret
              ? 'token-focus-caret'
              : undefined
        }
      >
        {isCurrent ? (
          word
        ) : (
          <span style={{ opacity: index < displayReadCount ? 1 : 0.45 }}>{word}</span>
        )}
        {trailing}
      </span>
    );
  };

  const setKeywordHover = (keyword: (typeof ranges)[number] | null) => {
    setHover(
      keyword
        ? {
            act,
            step,
            keyword: keyword.index,
            emphasis: keyword.emphasis,
          }
        : null,
    );
  };

  const stepAttr = { [`data-act${act}-step`]: step } as Record<string, number>;

  return (
    <section
      ref={sectionRef}
      {...stepAttr}
      className={`act${act}-substep narrative-step--pinned${
        compact ? ' pinned-reading--mobile' : ''
      }`}
      style={{
        height: `calc(100svh + ${tokens.length * (compact ? PX_PER_WORD_MOBILE : PX_PER_WORD)}px)`,
      }}
    >
      <div className="pinned-stage">
        <div className="w-full max-w-[var(--t-measure)]">
          <p className="t-body">
            {tokens.map((token, index) => {
              const hit = keywordAt.get(index);

              if (hit && !hit.isFirst) return null;

              if (hit) {
                const { start, end } = hit.keyword.range!;
                const group = tokens.slice(start, end + 1);
                const state =
                  active?.act === act &&
                  active.step === step &&
                  active.keyword === hit.keyword.index
                    ? 'active'
                    : displayReadCount > end
                      ? 'read'
                      : 'unread';

                const lastPart = group[group.length - 1];
                const lastWord = lastPart.trimEnd();
                const lastTrailing = lastPart.slice(lastWord.length);

                return (
                  <Fragment key={`kw-${start}`}>
                    <span
                      className="t-kw"
                      data-state={state}
                      tabIndex={0}
                      aria-label={`Annotation ${hit.keyword.index}: ${hit.keyword.noteLead} ${hit.keyword.noteText}`}
                      onMouseEnter={() => setKeywordHover(hit.keyword)}
                      onMouseLeave={() => setKeywordHover(null)}
                      onFocus={() => {
                        setFocusedKeyword(hit.keyword.index);
                        setKeywordHover(hit.keyword);
                      }}
                      onBlur={() => {
                        setFocusedKeyword(null);
                        setKeywordHover(null);
                      }}
                    >
                      {group.map((part, offset) => {
                        const word = part.trimEnd();
                        const isLast = offset === group.length - 1;
                        const isCurrent =
                          !hover &&
                          !reducedMotion &&
                          start + offset === displayReadCount &&
                          /[\p{L}\p{N}]/u.test(word);

                        return (
                          <span
                            key={offset}
                            className={
                              isCurrent && state !== 'active'
                                ? 'token-current'
                                : undefined
                            }
                          >
                            {word}
                            {!isLast && ' '}
                          </span>
                        );
                      })}
                    </span>
                    {lastTrailing}
                  </Fragment>
                );
              }

              return renderWord(token, index);
            })}
          </p>

          {note && <Note>{note}</Note>}
        </div>
      </div>
    </section>
  );
}
