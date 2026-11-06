'use client';

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Note } from './ReportType';
import { useEmphasis } from './EmphasisContext';
import { findPhraseRange, type ReadingKeyword } from './keywordRange';
import { tokenizeReadingText } from './readingVariants';

/** Scroll runway per word. 34px is roughly one wheel notch every two words. */
const PX_PER_WORD = 34;

type TokenStyle = 'block' | 'caret';

/**
 * The current token's mark. The caret sits after the word, in the gap before
 * the next token, so it reads like a pre-block cursor without touching the
 * glyph. Inside an active keyword the mark is suppressed: the keyword's red
 * block is already the focus.
 */
function CurrentToken({ word, style }: { word: string; style: TokenStyle }) {
  if (style === 'caret') {
    return (
      <>
        {word}
        <span aria-hidden className="token-caret" />
      </>
    );
  }

  return <span className="word-block">{word}</span>;
}

interface PinnedReadingProps {
  act: 1 | 2 | 3;
  step: number;
  text: string;
  keywords: ReadingKeyword[];
  /** Interaction note shown under the copy, in the margin voice. */
  note?: string;
}

/**
 * A substep that pins its copy and reads it word by word.
 *
 * The narrative-lab's "04 Word block + pinned + no smooth" setup: the section
 * owns a word-sized runway, the stage is sticky, and the current word carries
 * a solid block. When the head reaches a keyword, the keyword reverses to a
 * red focus block and publishes its emphasis to the figure.
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
  const { activeStep, active, hover, setReading, setHover } = useEmphasis();
  const reducedMotion = useReducedMotion();
  const isStepActive = activeStep?.act === act && activeStep?.step === step;

  // Dev-only fallback: ?token=block restores the old word block.
  const [tokenStyle, setTokenStyle] = useState<TokenStyle>('caret');
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const value = new URLSearchParams(window.location.search).get('token');
    if (value === 'block' || value === 'caret') {
      setTokenStyle(value);
    }
  }, []);

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

    const sync = () => {
      const scrollerTop = scroller
        ? scroller.getBoundingClientRect().top
        : 0;
      const viewport = scroller ? scroller.clientHeight : window.innerHeight;
      const runway = Math.max(section.offsetHeight - viewport, 1);
      const progress = Math.min(
        1,
        Math.max(0, (scrollerTop - section.getBoundingClientRect().top) / runway),
      );
      setReadCount(Math.round(progress * tokens.length));
    };

    sync();
    const target = scroller ?? window;
    target.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    document.fonts?.ready.then(sync);

    return () => {
      target.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
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

  const activeIndex = active?.keyword ?? null;

  const renderWord = (token: string, index: number): ReactNode => {
    const word = token.trimEnd();
    const trailing = token.slice(word.length);
    const isCurrent =
      !hover &&
      !reducedMotion &&
      index === readCount &&
      readCount < tokens.length &&
      /[\p{L}\p{N}]/u.test(word);

    return (
      <span key={`w-${index}`}>
        {isCurrent ? (
          <CurrentToken word={word} style={tokenStyle} />
        ) : (
          <span style={{ opacity: index < readCount ? 1 : 0.26 }}>{word}</span>
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
      className={`act${act}-substep narrative-step--pinned`}
      style={{ height: `calc(100svh + ${tokens.length * PX_PER_WORD}px)` }}
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
                  activeIndex === hit.keyword.index
                    ? 'active'
                    : readCount > end
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
                      onFocus={() => setKeywordHover(hit.keyword)}
                      onBlur={() => setKeywordHover(null)}
                    >
                      {group.map((part, offset) => {
                        const word = part.trimEnd();
                        const isLast = offset === group.length - 1;
                        const isCurrent =
                          !hover &&
                          !reducedMotion &&
                          start + offset === readCount &&
                          /[\p{L}\p{N}]/u.test(word);

                        return (
                          <span key={offset}>
                            {isCurrent ? (
                              state === 'active' ? (
                                word
                              ) : (
                                <CurrentToken word={word} style={tokenStyle} />
                              )
                            ) : (
                              word
                            )}
                            {!isLast && ' '}
                            {isLast && (
                              <span className="t-kw__index" aria-hidden>
                                {hit.keyword.index}
                              </span>
                            )}
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
