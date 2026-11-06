'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActOpener, Note } from './ReportType';
import { tokenizeReadingText } from './readingVariants';

/**
 * A bench for the three narrative roles added after the reading-progress
 * lab: the act statement, the distributed keyword + annotation rail, and
 * the callout note.
 *
 * The keyword section is pinned: every token gets a fixed runway, the copy
 * fades in word by word, and the rail annotation paired with a keyword
 * opens when the reading head reaches it. It is the design reference for
 * the eventual `Step` + pin/scroll wiring, not the production component.
 */

const SENTENCE =
  'Half the work happens in the last 12 hours. 54.2% of all 23,906 edits land inside that window, and 61.9% inside a single day.';

interface Annotation {
  phrase: string;
  index: string;
  value: string;
  label: string;
  detail: string;
  range?: { start: number; end: number };
}

const ANNOTATIONS: Annotation[] = [
  {
    phrase: 'last 12 hours',
    index: '01',
    value: '54.2%',
    label: 'of all edits',
    detail: '12,955 of 23,906 edits land in the final half-day.',
  },
  {
    phrase: '23,906 edits',
    index: '02',
    value: '23,906',
    label: 'edits / 58 assignments',
    detail: 'One row per assignment; each bubble is one day of edits.',
  },
  {
    phrase: '61.9%',
    index: '03',
    value: '61.9%',
    label: 'within 24 hours',
    detail: 'The last day holds nearly two-thirds of the work.',
  },
];

const PX_PER_WORD = 34;

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[.,;:!?%—–]/g, '')
    .trim();

function findRange(tokens: string[], phrase: string) {
  const words = phrase.split(/\s+/).map(normalise);
  for (let start = 0; start <= tokens.length - words.length; start += 1) {
    let matched = true;
    for (let offset = 0; offset < words.length; offset += 1) {
      if (normalise(tokens[start + offset]) !== words[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) return { start, end: start + words.length - 1 };
  }
  return undefined;
}

export default function TypeLab() {
  const tokens = useMemo(() => tokenizeReadingText(SENTENCE), []);
  const annotations = useMemo(
    () =>
      ANNOTATIONS.map((annotation) => ({
        ...annotation,
        range: findRange(tokens, annotation.phrase),
      })),
    [tokens],
  );

  const sectionRef = useRef<HTMLElement>(null);
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      const element = sectionRef.current;
      if (!element) return;
      const viewport = window.innerHeight;
      const runway = Math.max(element.offsetHeight - viewport, 1);
      const progress = Math.min(
        1,
        Math.max(0, -element.getBoundingClientRect().top / runway),
      );
      setReadCount(Math.round(progress * tokens.length));
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [tokens.length]);

  const stateOf = (range?: { start: number; end: number }) => {
    if (!range) return 'unread' as const;
    if (readCount > range.end) return 'read' as const;
    if (readCount >= range.start) return 'active' as const;
    return 'unread' as const;
  };

  const copy = useMemo(() => {
    const out: ReactNode[] = [];
    let index = 0;

    while (index < tokens.length) {
      const annotation = annotations.find(
        (item) => item.range?.start === index,
      );
      if (annotation?.range) {
        const state = stateOf(annotation.range);
        const phrase = tokens.slice(annotation.range.start, annotation.range.end + 1);
        const last = phrase[phrase.length - 1];
        const trailing = /\s$/.test(last) ? ' ' : '';

        out.push(
          <span key={`kw-${index}`} className="t-kw" data-state={state}>
            {phrase.map((token, offset) => (
              <span key={offset}>
                {token.trimEnd()}
                {offset < phrase.length - 1 ? ' ' : ''}
              </span>
            ))}
            <span className="t-kw__index" aria-hidden>
              {annotation.index}
            </span>
            {trailing}
          </span>,
        );
        index = annotation.range.end + 1;
        continue;
      }

      out.push(
        <span
          key={`w-${index}`}
          style={{
            opacity: index > readCount ? 0.28 : 1,
            transition: 'opacity 180ms linear',
          }}
        >
          {tokens[index]}
        </span>,
      );
      index += 1;
    }

    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateOf only reads readCount
  }, [annotations, readCount, tokens]);

  const progress = tokens.length ? readCount / tokens.length : 0;

  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <header className="border-b border-stone-200/80">
        <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between gap-4 px-6 py-4">
          <span className="t-kicker t-kicker--accent" style={{ marginInline: 0 }}>
            <span className="t-kicker__text">Narrative Lab / Type</span>
          </span>
          <nav className="flex items-baseline gap-5 font-mono text-[10px] uppercase tracking-[0.18em] text-text-secondary">
            <a className="hover:text-brand" href="/narrative-lab">
              Reading progress
            </a>
            <a className="hover:text-brand" href="/">
              The story
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pt-20">
          <h1 className="t-masthead">The narrative page.</h1>
          <p className="t-deck mt-6">
            Three roles added to the report system: the act&rsquo;s statement,
            the distributed keyword with its annotation rail, and the callout
            note.
          </p>
        </section>

        <section className="mx-auto w-full max-w-3xl px-6 pt-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand">
            01 / Act opener
          </p>
          <div className="mt-7 [&_.narrative-act]:min-h-0 [&_.narrative-act]:py-0">
            <ActOpener
              act={3}
              statement={
                <>
                  Most edits happen in the <em>last 12 hours</em>.
                </>
              }
              deck="23,906 edits, one deadline-shaped habit."
            />
          </div>
        </section>

        <section
          ref={sectionRef}
          id="keywords"
          className="relative"
          style={{ height: `calc(100dvh + ${tokens.length * PX_PER_WORD}px)` }}
        >
          <div className="sticky top-0 flex h-dvh items-center">
            <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-12 px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
              <div className="max-w-[34rem]">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand">
                  02 / Keywords
                </p>
                <p className="t-body mt-6" style={{ maxWidth: '34rem' }}>
                  {copy}
                </p>

                <div className="mt-10 flex items-center gap-3" aria-hidden>
                  <span className="relative block h-px flex-1 bg-stone-200">
                    <span
                      className="absolute inset-y-0 left-0 bg-brand transition-[width] duration-150"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap font-mono text-[10px] tabular-nums tracking-[0.08em] text-text-secondary">
                    {readCount} / {tokens.length} words
                  </span>
                </div>

                <p className="mt-4 max-w-[32rem] font-mono text-[10px] uppercase leading-relaxed tracking-[0.16em] text-text-secondary">
                  Scroll to read. A keyword draws its rule, lights its index,
                  and opens the matching annotation on the right.
                </p>
              </div>

              <aside className="t-kw-rail">
                <div className="t-kw-rail__head">
                  <span className="t-kw-rail__label">Annotations / Act III</span>
                  <span className="font-mono text-[9px] tabular-nums tracking-[0.1em] text-text-secondary">
                    {String(readCount).padStart(2, '0')} /{' '}
                    {String(tokens.length).padStart(2, '0')}
                  </span>
                </div>
                {annotations.map((annotation) => {
                  const state = stateOf(annotation.range);
                  return (
                    <div
                      key={annotation.index}
                      className="t-kw-rail__row"
                      data-state={state}
                    >
                      <span className="t-kw-rail__no">{annotation.index}</span>
                      <span className="t-kw-rail__label">{annotation.label}</span>
                      <span className="t-kw-rail__value">{annotation.value}</span>
                      <span className="t-kw-rail__detail">
                        {annotation.detail}
                      </span>
                    </div>
                  );
                })}
              </aside>
            </div>
          </div>
        </section>

        <section id="notes" className="mx-auto w-full max-w-3xl px-6 pb-[32vh] pt-16">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-brand">
            03 / Notes
          </p>
          <div className="mt-8 max-w-[34rem]">
            <p className="t-body">
              The notes speak in the margin voice: a rule, a label, one
              sentence. Interaction instructions and method asides share the
              same frame, so neither reads as UI copy.
            </p>
            <Note>Hover a band to read its share; click to pin it.</Note>
            <Note variant="method" label="Method">
              One version is one autosave. OneDrive keeps the latest 500 per
              file; a handful of files reached that ceiling.
            </Note>
          </div>
        </section>
      </main>
    </div>
  );
}
