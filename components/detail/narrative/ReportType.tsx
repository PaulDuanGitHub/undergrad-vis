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
    title: 'The Rush',
    statement: (
      <>
        Most of the work happens in the <em>last 12 hours</em>.
      </>
    ),
    deck: '23,906 versions, one deadline-shaped habit.',
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
  /**
   * The element the label renders as. Act openers pass `h2`: the kicker carries
   * the act's number and name, so it is the act's heading even though it is
   * styled as an overline.
   */
  as?: 'p' | 'h2' | 'h3';
}

export function Kicker({
  children,
  rule = true,
  accent = false,
  className = '',
  as: Tag = 'p',
}: KickerProps) {
  const classes = [
    't-kicker',
    accent ? 't-kicker--accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={classes}>
      {rule && <span aria-hidden className="t-kicker__rule" />}
      <span className="t-kicker__text">{children}</span>
    </Tag>
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
      <Kicker accent as={hasStatement ? 'h2' : 'p'}>
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

/**
 * A callout in the report's margin voice: a red rule, a mono label, then
 * one sentence. Used for interaction instructions.
 */
export function Note({
  children,
  label = 'Interaction',
  className = '',
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <aside className={`t-note--callout${className ? ` ${className}` : ''}`}>
      <span className="t-note__label">{label}</span>
      {children}
    </aside>
  );
}
