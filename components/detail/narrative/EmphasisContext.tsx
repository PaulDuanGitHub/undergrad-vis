'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * The bridge between a reading keyword and the visual it annotates.
 *
 * There are two sources of focus:
 *
 * - `reading` — published by `PinnedReading` as the head reaches a keyword.
 *   It drives the sequence on its own.
 * - `hover` — published by a keyword in the copy or by a note in the figure.
 *   It is the bi-directional binding: after a keyword has been read, pointing
 *   at it (or at its note) re-opens the annotation and the visual filter.
 *
 * `active` is the effective focus: hover wins while it is set, then the
 * reading head takes over again. `null` means the reader is between keywords
 * or has finished the step.
 */
export type EmphasisState = {
  act: 1 | 2 | 3;
  step: number;
  /** The keyword's display index, e.g. "01". */
  keyword: string;
  /** What the visual should select, e.g. "document" | "code" | "design". */
  emphasis: string;
};

type EmphasisContextValue = {
  /** Effective focus: `hover ?? reading`. */
  active: EmphasisState | null;
  reading: EmphasisState | null;
  hover: EmphasisState | null;
  /** The act/step currently in the reader; only that step may publish reading. */
  activeStep: { act: 1 | 2 | 3; step: number } | null;
  setReading: (next: EmphasisState | null) => void;
  setHover: (next: EmphasisState | null) => void;
};

const EmphasisContext = createContext<EmphasisContextValue | null>(null);

export function EmphasisProvider({
  children,
  activeStep = null,
}: {
  children: ReactNode;
  activeStep?: { act: 1 | 2 | 3; step: number } | null;
}) {
  const [reading, setReading] = useState<EmphasisState | null>(null);
  const [hover, setHover] = useState<EmphasisState | null>(null);

  const value = useMemo(
    () => ({
      active: hover ?? reading,
      reading,
      hover,
      activeStep,
      setReading,
      setHover,
    }),
    [reading, hover, activeStep],
  );

  return (
    <EmphasisContext.Provider value={value}>
      {children}
    </EmphasisContext.Provider>
  );
}

export function useEmphasis() {
  const context = useContext(EmphasisContext);
  if (!context) {
    throw new Error('useEmphasis must be used inside <EmphasisProvider>.');
  }
  return context;
}
