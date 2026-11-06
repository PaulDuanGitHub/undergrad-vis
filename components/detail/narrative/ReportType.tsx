import type { ReactNode } from 'react';

/**
 * The report's typographic primitives.
 *
 * One place decides how the story speaks: a mono overline, an Instrument
 * Serif title, Newsreader running copy. The CSS roles they map to live in
 * the "Report typography" block of `app/globals.css`; these components only
 * assemble them in the right order, so an act opens the same way on the
 * desktop column and in the phone pane.
 */

/**
 * The three acts as the page describes them: a numeral, a title, and the
 * thesis line that opens the act. The statement lives here so the desktop
 * column and the phone pane cannot drift apart.
 */
export const ACT_META = {
  1: {
    numeral: 'I',
    title: 'The Cubes',
    statement: (
      <>
        Every file is a cube. Five years, in <em>one room</em>.
      </>
    ),
    deck: '567 workfiles, eight terms, and a desk that stayed in the same place.',
  },
  2: {
    numeral: 'II',
    title: 'The Strips',
    statement: (
      <>
        Sixteen <em>formats</em> carry five years of work.
      </>
    ),
    deck: 'From .tex proofs to .blend renders, the tools map the curriculum.',
  },
  3: {
    numeral: 'III',
    title: 'The Bubbles',
    statement: (
      <>
        Most edits happen in the <em>last 12 hours</em>.
      </>
    ),
    deck: '23,906 edits, one deadline-shaped habit.',
  },
} as const;

export type ActNumber = keyof typeof ACT_META;

interface KickerProps {
  children: ReactNode;
  /** Open the label with a hairline — the site's overline device. */
  rule?: boolean;
  /** Red label, for act numbers and plate numbers. */
  accent?: boolean;
  className?: string;
}

export function Kicker({
  children,
  rule = true,
  accent = false,
  className = '',
}: KickerProps) {
  const classes = [
    't-kicker',
    accent ? 't-kicker--accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <p className={classes}>
      {rule && <span aria-hidden className="t-kicker__rule" />}
      <span className="t-kicker__text">{children}</span>
    </p>
  );
}

/** A chapter break: "Act II — The Strips" over the act's thesis. */
export function ActOpener({
  act,
  statement,
  deck,
  compact = false,
}: {
  act: ActNumber;
  /** Override the act statement; pass null for the plain title opener. */
  statement?: ReactNode | null;
  /** Override the standfirst. */
  deck?: ReactNode | null;
  compact?: boolean;
}) {
  const meta = ACT_META[act];
  const { numeral, title } = meta;
  const resolvedStatement =
    statement === null ? null : statement ?? meta.statement;
  const resolvedDeck = deck === null ? null : deck ?? meta.deck;
  const hasStatement = resolvedStatement != null;

  return (
    <header
      className={`narrative-act${compact ? ' narrative-act--compact' : ''}${
        hasStatement ? ' narrative-act--statement' : ''
      }`}
    >
      <Kicker accent>
        Act {numeral} — {title}
      </Kicker>
      {hasStatement ? (
        <>
          <p className="t-statement">{resolvedStatement}</p>
          {resolvedDeck && (
            <p className="t-deck t-deck--left">{resolvedDeck}</p>
          )}
        </>
      ) : (
        <h2 className="t-act">{title}</h2>
      )}
    </header>
  );
}

/** The running head the phone pane shows after the act has opened. */
export function RunningHead({ act }: { act: ActNumber }) {
  return (
    <Kicker rule={false} className="narrative-running-head">
      Act {ACT_META[act].numeral} — {ACT_META[act].title}
    </Kicker>
  );
}

/**
 * A callout in the report's margin voice: a red rule, a mono label, then
 * one sentence. Used for interaction instructions and method asides.
 */
export function Note({
  children,
  label = 'Interaction',
  variant = 'interaction',
  className = '',
}: {
  children: ReactNode;
  label?: string;
  variant?: 'interaction' | 'method';
  className?: string;
}) {
  return (
    <aside
      className={`t-note--callout${
        variant === 'method' ? ' t-note--method' : ''
      }${className ? ` ${className}` : ''}`}
    >
      <span className="t-note__label">{label}</span>
      {children}
    </aside>
  );
}

/**
 * An inline keyword: a phrase in running copy that owns an annotation.
 * The superscript index is the pair key; `state` is driven by the reading
 * progress once the substep is wired to pin + scroll.
 */
export function Keyword({
  children,
  index,
  state = 'read',
}: {
  children: ReactNode;
  index: string;
  state?: 'unread' | 'read' | 'active';
}) {
  return (
    <span className="t-kw" data-state={state}>
      {children}
      <span className="t-kw__index" aria-hidden>
        {index}
      </span>
    </span>
  );
}

/**
 * One scrollytelling step. The `data-actN-step` attribute is what
 * `DetailView`'s ScrollTriggers read, and `.narrative-step` gives the block
 * a full viewport so the copy is centred when its trigger fires.
 */
export function Step({
  act,
  step,
  children,
}: {
  act: ActNumber;
  step: number;
  children: ReactNode;
}) {
  const stepAttr = { [`data-act${act}-step`]: step } as Record<string, number>;
  return (
    <div {...stepAttr} className={`act${act}-substep narrative-step`}>
      {children}
    </div>
  );
}
