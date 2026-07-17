'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Measure the content-rect width of a DOM element via ResizeObserver.
 * Returns a stable ref to attach and the current pixel width.
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>(
  defaultWidth: number = 850,
): { ref: React.RefObject<T | null>; width: number } {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0 && Math.abs(w - width) > 1) {
        setWidth(w);
      }
    });

    observer.observe(el);
    // Immediately capture current width
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setWidth(rect.width);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, width };
}
