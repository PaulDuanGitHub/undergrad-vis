'use client';

import type { ReactNode } from 'react';

export interface FigureNote {
  index: string;
  /** The figure that carries the statement, set large: "54%". */
  lead: string;
  /** The rest of the sentence, set at reading size. */
  text: string;
  /** What the visual selects when this note is focused. */
  emphasis: string;
}

interface FigureFrameProps {
  /** Plate number, e.g. "01". */
  fig: string;
  /** The figure's own title, not the act title. */
  title: string;
  notes: FigureNote[];
  /** Keyword index whose note is focused; null while the head is between keywords. */
  active: string | null;
  /** Hide the plate header and notes on the intro, keeping only the visual. */
  chrome?: boolean;
  /** Pointing at a note focuses its keyword and the visual, and vice versa. */
  onNoteHover?: (index: string, emphasis: string) => void;
  onNoteLeave?: () => void;
  children: ReactNode;
}

/**
 * The report chrome around a visual: a plate header and three numbered
 * statements at the bottom. The statements are set like a print caption —
 * a small index, a display-size figure, then the sentence at text size.
 *
 * The active note is the "focus on" state: a red block wipes across the
 * note and the type reverses to white. The same block is used on the
 * keyword in the copy, so the pair reads as one annotation.
 *
 * The overlays are gradients over the canvas rather than a layout that
 * shrinks it, so the 3D camera and the SVG charts keep their full area.
 */
export default function FigureFrame({
  fig,
  title,
  notes,
  active,
  chrome = true,
  onNoteHover,
  onNoteLeave,
  children,
}: FigureFrameProps) {
  return (
    <div className="detail-figure relative h-full w-full">
      <div className="detail-figure-visual absolute inset-0">{children}</div>

      <div
        className={`detail-figure-header pointer-events-none absolute inset-x-0 top-0 z-10 flex items-baseline justify-between gap-4 bg-gradient-to-b from-surface via-surface/85 to-transparent px-2 pb-8 pt-1 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
          chrome ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'
        }`}
        aria-hidden={!chrome}
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-secondary">
          Fig. {fig} — {title}
        </span>
      </div>

      <div
        className={`detail-figure-notes pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-surface via-surface/95 to-transparent px-2 pb-3 pt-6 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none ${
          chrome ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
        }`}
        aria-hidden={!chrome}
        inert={!chrome}
      >
        <div
          className={`pointer-events-auto grid gap-3 ${
            notes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {notes.map((note) => {
            const on = note.index === active;
            return (
              <div
                key={note.index}
                role="note"
                tabIndex={0}
                aria-label={`Annotation ${note.index}: ${note.lead} ${note.text}`}
                onMouseEnter={() => onNoteHover?.(note.index, note.emphasis)}
                onMouseLeave={() => onNoteLeave?.()}
                onFocus={() => onNoteHover?.(note.index, note.emphasis)}
                onBlur={() => onNoteLeave?.()}
                className="relative -mx-2 cursor-pointer overflow-hidden px-2 py-1.5 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span aria-hidden className="note-brush" data-active={on} />
                <div
                  className={`relative z-10 transition-colors duration-150 ${
                    on ? 'delay-100' : ''
                  }`}
                >
                  <span
                    className={`figure-note-lead text-[30px] leading-none tracking-[-0.015em] transition-colors ${
                      on ? 'text-white' : 'text-text-primary'
                    }`}
                    style={{ fontFamily: 'var(--t-display)' }}
                  >
                    {note.lead}
                  </span>
                  <p
                    className={`figure-note-text mt-1 text-[14px] leading-snug transition-colors ${
                      on ? 'text-white/85' : 'text-text-primary/70'
                    }`}
                    style={{ fontFamily: 'var(--t-text)' }}
                  >
                    {note.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
