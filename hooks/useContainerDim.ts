'use client';

import { useRef, useState } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

/**
 * Measure the content-rect dimensions of a DOM element via ResizeObserver.
 * Returns a stable ref to attach and the current pixel width & height.
 *
 * The first measurement is taken in the layout phase so consumers that lay out
 * their own children by pixel (the Act 2 labels, Act 3 tracks) can be re-seated
 * from the measured box before the browser paints.
 */
export function useContainerDim<T extends HTMLElement = HTMLDivElement>(
  defaultWidth: number = 850,
  defaultHeight?: number,
): {
  ref: React.RefObject<T | null>;
  width: number;
  height: number;
  /** True once a real box has been measured (the defaults are only a stand-in). */
  measured: boolean;
} {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight ?? Math.round(defaultWidth * 0.65));
  const [measured, setMeasured] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const commitWidth = (w: number) => {
      setMeasured(true);
      setWidth((prev) => (Math.abs(w - prev) > 0.5 ? w : prev));
    };
    const commitHeight = (h: number) => {
      setMeasured(true);
      setHeight((prev) => (Math.abs(h - prev) > 0.5 ? h : prev));
    };

    // Functional updates: the observer's closure would otherwise compare
    // against the first render's size forever and ignore later changes.
    const observer = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0]?.contentRect ?? {};
      if (w && w > 0) commitWidth(w);
      if (h && h > 0) commitHeight(h);
    });

    observer.observe(el);
    // Immediately capture current dimensions.
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) commitWidth(rect.width);
    if (rect.height > 0) commitHeight(rect.height);

    return () => observer.disconnect();
  }, []);

  return { ref, width, height, measured };
}
