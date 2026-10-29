import { useProgress } from '@react-three/drei';
import { useEffect, useRef, useState } from 'react';

interface LoadingOverlayProps {
  onLoaded: () => void;
}

// ─── Orthographic camera ───────────────────────────────────────────────
// Corner-on (45° azimuth) orthographic view, pitched PITCH degrees down.
// Screen y points down, so the three world axes project to:
//     ground axis → right + down   ( GX,  GY)
//     ground axis → left  + down   (-GX,  GY)
//     world up    → straight up    (  0, -UZ)
// Every face is therefore a single matrix(), and `h` (1 → 0) is the only
// animated value in the whole scene.
const PITCH = 45; // camera elevation above the horizon, in degrees
const THETA = (PITCH * Math.PI) / 180;
/** Uniform zoom — cosmetic only. 1.2247 keeps GX at the old 0.866 framing. */
const ZOOM = 1.2247;

const GX = Math.SQRT1_2 * ZOOM; // 0.8660 — ground-axis horizontal reach
const GY = Math.sin(THETA) * Math.SQRT1_2 * ZOOM; // 0.6124 at 45°
const UZ = Math.cos(THETA) * ZOOM; // 0.8660 at 45° — vertical foreshortening

const S = 120; // top-face edge, in world units
const H = S; // extrusion — a true cube
const W = 2 * GX * S; // stage width — exactly the width of the top rhombus
const RH = 2 * GY * S; // rendered height of the top rhombus
const UZS = UZ * H; // rendered height of the cube's vertical edge
const CH = RH + UZS; // stage height — rhombus + full extrusion

// `h` shrinks each side face's vertical axis (UZ*h) AND drops its top edge
// with the top face, so the box deflates onto a pinned base — no layout, no
// reflow. Nothing carries its own transform: the counter simply lives inside
// the top face, so it is sheared onto it and rides it down for free.
const topM = (h: number) => `matrix(${GX}, ${GY}, ${-GX}, ${GY}, ${GX * S}, ${(1 - h) * UZS})`;
const leftM = (h: number) => `matrix(${GX}, ${GY}, 0, ${UZ * h}, 0, ${(1 - h) * UZS + GY * S})`;
const rightM = (h: number) =>
  `matrix(${GX}, ${-GY}, 0, ${UZ * h}, ${GX * S}, ${(1 - h) * UZS + 2 * GY * S})`;

// ─── Choreography (ms) ─────────────────────────────────────────────────
/**
 * Fraction of the full extrusion the box keeps at 100%. The deflation stops
 * here, so "100%" is still a box rather than a flat card; the closing
 * retraction then takes this last slice away in one move.
 */
const REST = 0.25;
const T_HOLD = 200; // beat on "100%" before the box closes
const T_RETRACT = 1000; // the closing retraction
const T_FADE = 420; // overlay dissolve, once the box is flat
const EXIT_MS = T_FADE;

/** easeInOutCubic. Even, so the closing second is actually spent moving. */
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Anti-flash: never blink the loader away on an instant (cached) load. */
const MIN_DISPLAY_MS = 500;
/** Failsafe: don't strand the user if an asset errors or the manager stalls. */
const FAILSAFE_MS = 15000;
/** Time constant of the counter's ease toward raw progress (ms). */
const TAU = 130;

// The counter is the only glyph left. It lives inside the top face's plane,
// so the projection lays it on that face like paint — no separate mark, no
// billboard. Sized so "100%", the widest it ever gets, still fits the face.
const NUM_FS = Math.round(S * 0.35);

export default function LoadingOverlay({ onLoaded }: LoadingOverlayProps) {
  const { progress, errors } = useProgress();

  const [phase, setPhase] = useState<'loading' | 'exiting' | 'gone'>('loading');
  const [reduced, setReduced] = useState(false);

  // Raw progress is coarse (one tick per asset), so the displayed value is
  // eased toward it. Kept in refs + written straight to the DOM: the whole
  // preloader never re-renders while loading.
  const targetRef = useRef(0);
  const mountedAtRef = useRef(0);
  const onLoadedRef = useRef(onLoaded);
  // The rAF loop runs with [] deps, so it must read this through a ref.
  const reducedRef = useRef(false);

  const barRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const numTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  // Respect prefers-reduced-motion: collapse the choreography to an instant swap.
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

  // Progress is monotonic — GLTF/texture loads finish out of order and can tick back.
  useEffect(() => {
    if (progress > targetRef.current) targetRef.current = Math.min(progress, 100);
  }, [progress]);

  useEffect(() => {
    if (errors.length > 0) targetRef.current = 100;
  }, [errors.length]);

  useEffect(() => {
    const t = setTimeout(() => {
      targetRef.current = 100;
    }, FAILSAFE_MS);
    return () => clearTimeout(t);
  }, []);

  // The one rAF loop: eases the counter, rewrites the 3 face transforms, runs
  // the closing retraction, then hands the overlay fade over to CSS.
  useEffect(() => {
    mountedAtRef.current = performance.now();

    let raf = 0;
    let displayed = 0;
    let last = performance.now();
    let lastInt = -1;
    let retractAt = 0; // when the closing retraction starts; 0 = not scheduled

    // Only the three cube faces move. The counter rides the top face's matrix.
    const apply = (h: number) => {
      if (topRef.current) topRef.current.style.transform = topM(h);
      if (leftRef.current) leftRef.current.style.transform = leftM(h);
      if (rightRef.current) rightRef.current.style.transform = rightM(h);
    };

    apply(1);

    const tick = (now: number) => {
      // Clamp BOTH ends. A stall or tab switch gives a huge positive delta, but
      // the timestamp is the frame's *start*, which can predate the
      // performance.now() that scheduled this callback — measured up to ~74 ms
      // in Chrome. Unclamped, a negative delta flips the ease sign and throws
      // the counter to values like "-86%".
      const dt = Math.min(Math.max(now - last, 0), 64);
      last = now;

      const target = targetRef.current;
      displayed += (target - displayed) * (1 - Math.exp(-dt / TAU));
      if (target - displayed < 0.05) displayed = target;

      const n = Math.round(displayed);
      if (n !== lastInt) {
        lastInt = n;
        if (numTextRef.current) numTextRef.current.textContent = `${n}%`;
        if (barRef.current) barRef.current.setAttribute('aria-valuenow', String(n));
      }

      // While loading the box deflates to REST, not to zero — the last slice
      // of height is held back so "100%" is still a box.
      let h = 1 - (1 - REST) * (Math.min(displayed, 100) / 100);

      // Schedule the closing move once the counter has settled on 100.
      if (retractAt === 0 && displayed >= 100 && now - mountedAtRef.current >= MIN_DISPLAY_MS) {
        retractAt = now + (reducedRef.current ? 0 : T_HOLD);
      }

      if (retractAt > 0 && now >= retractAt) {
        const dur = reducedRef.current ? 1 : T_RETRACT;
        const p = Math.min((now - retractAt) / dur, 1);
        h = REST * (1 - easeInOut(p)); // 0 → REST at p = 0, exactly 0 at p = 1

        if (p >= 1) {
          // Land on exactly 0. Freezing at a sub-pixel height would leave the
          // side faces painting a hairline rhombus through the whole fade.
          apply(0);
          setPhase('exiting');
          return;
        }
      }

      apply(h);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (phase !== 'exiting') return;
    const t = setTimeout(() => {
      setPhase('gone');
      onLoadedRef.current();
    }, reduced ? 200 : EXIT_MS);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  if (phase === 'gone') return null;

  const exiting = phase === 'exiting';
  const ms = (v: number) => (reduced ? '0ms' : `${v}ms`);

  return (
    <div
      className={`bg-surface fixed inset-0 z-50 flex items-center justify-center ${exiting ? 'pointer-events-none' : ''}`}
      style={{
        opacity: exiting ? 0 : 1,
        transitionProperty: 'opacity',
        transitionDuration: ms(T_FADE),
        transitionTimingFunction: 'ease-in-out',
      }}
    >
      <div className="flex flex-col items-center gap-6 sm:gap-8">
        <div
          ref={barRef}
          role="progressbar"
          aria-label="Loading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="flex items-center scale-[0.72] sm:scale-100"
        >
          {/* ── The box ── */}
          <div className="relative" style={{ width: W, height: CH }}>
            {/* left-front face (darkest) */}
            <div
              ref={leftRef}
              aria-hidden
              className="absolute left-0 top-0 bg-brand-900 [will-change:transform]"
              style={{ width: S, height: H, transformOrigin: '0 0', transform: leftM(1) }}
            />
            {/* right-front face */}
            <div
              ref={rightRef}
              aria-hidden
              className="absolute left-0 top-0 bg-brand-800 [will-change:transform]"
              style={{ width: S, height: H, transformOrigin: '0 0', transform: rightM(1) }}
            />
            {/* top face — carries the counter, which is the only glyph now */}
            <div
              ref={topRef}
              aria-hidden
              className="absolute left-0 top-0 bg-brand-700 [will-change:transform]"
              style={{ width: S, height: S, transformOrigin: '0 0', transform: topM(1) }}
            >
              {/* lapped onto the face, so it is sheared with it and rides it down */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  ref={numTextRef}
                  className="font-sans font-bold leading-none tabular-nums text-stone-200"
                  style={{ fontSize: NUM_FS, letterSpacing: '-0.02em' }}
                >
                  0%
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-xs tracking-[0.3em] text-text-secondary font-serif mb-4">
          PREPARING EXPERIENCE
        </div>
      </div>
    </div>
  );
}
