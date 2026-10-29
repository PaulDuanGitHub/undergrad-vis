import { useEffect, useRef, useState } from 'react';

/**
 * Tracks `prefers-reduced-motion: reduce`, including changes made while the
 * page is open.
 *
 * The initial value is `false` so the server render and the first client render
 * agree; the real value lands in the first effect, which runs before any of the
 * motion it guards is cued by a user action.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = mq.matches;
      setReduced(mq.matches);
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}
