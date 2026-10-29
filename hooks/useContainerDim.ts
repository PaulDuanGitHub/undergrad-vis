'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Measure the content-rect dimensions of a DOM element via ResizeObserver.
 * Returns a stable ref to attach and the current pixel width & height.
 */
export function useContainerDim<T extends HTMLElement = HTMLDivElement>(
  defaultWidth: number = 850,
  defaultHeight?: number,
): { ref: React.RefObject<T | null>; width: number; height: number } {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight ?? Math.round(defaultWidth * 0.65));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0]?.contentRect ?? {};
      if (w && w > 0 && Math.abs(w - width) > 1) setWidth(w);
      if (h && h > 0 && Math.abs(h - height) > 1) setHeight(h);
    });

    observer.observe(el);
    // Immediately capture current dimensions
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setWidth(rect.width);
    if (rect.height > 0) setHeight(rect.height);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, width, height };
}
