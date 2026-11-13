'use client';

import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` on the client, `useEffect` during SSR (where layout effects
 * do nothing and React warns).
 *
 * The charts measure their pane and then let GSAP position the labels/tracks
 * from that measurement. Both halves must land before the first paint, or a
 * phone gets one frame (or, when the measurement is deferred, a whole entrance
 * animation) seated on the fallback box — and GSAP never revisits those pixel
 * offsets by itself.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
