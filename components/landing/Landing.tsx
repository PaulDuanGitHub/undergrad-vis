"use client";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { INTRO_CAMERA_POSITION } from "@/constants/camera";
import ThreeScene from "@/components/landing/ThreeScene";
import CameraController from "@/components/landing/CameraController";
import LoadingOverlay from "@/components/landing/LoadingOverlay";
import DetailView from "@/components/detail/DetailView";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ── Copy ⇄ model choreography (ms) ──
// The copy and the model never move in the same band at the same time.
// OPEN  — the copy retracts first; that wipe ends at 0.4 + 3 × 0.06 = 0.58 s of
//         tween time, measured 631 ms after the click (React re-render + GSAP
//         start-up cost ~120 ms), so 550 ms puts the paper's opening on its
//         tail — the last line is a ~8 % sliver by then. 650 is strictly clean.
// CLOSE — the paper reverses over the GLB clip's 1.5417 s, so the copy waits
//         before coming back; at 550 the first line starts ~1.1 s in, i.e. while
//         the paper is ~60 % shut (a deliberate overlap). ~1000 makes the
//         hand-off fully sequential: measured, the copy then starts at 1788 ms,
//         just after the paper finishes closing (~1690 ms).
const COPY_EXIT_LEAD = 550;
const COPY_RETURN_LEAD = 550;
/** Detail content's own fade-out, before the paper is told to close. */
const DETAIL_FADE_LEAD = 150;

// ── Wipe-rule timings (s, timeline-relative) ──
// The hairlines are drawn by the same left → right motion as the type, so they
// read as the stroke that paints the block rather than as decoration.
/** With the kicker. */
const RULE_KICKER_AT = 0;
/** Just before the title's own wipe lands (0.12 + 0.85), so it finishes it. */
const RULE_TITLE_AT = 0.95;

export default function Landing() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isIntroDone, setIsIntroDone] = useState(false);
  const [isCopyReady, setIsCopyReady] = useState(false);
  /** User intent: the hero copy is out of the way. Leads `isDetailOpen`. */
  const [isCopyOut, setIsCopyOut] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  /** Keyboard focus on the scene layer — drives the entry hint's focus cue. */
  const [isSceneFocused, setIsSceneFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  /** `#act2` (any `#actN`) opens the story on that act; `#story` opens it at the top. */
  const [entryAct, setEntryAct] = useState<1 | 2 | 3 | null>(() => {
    if (typeof window === "undefined") return null;
    const match = /^#act([123])$/.exec(window.location.hash);
    return match ? (Number(match[1]) as 1 | 2 | 3) : null;
  });
  /** A deep link was in the URL at load time; open once the intro has finished. */
  const [hashEntryPending, setHashEntryPending] = useState(
    () => typeof window !== "undefined" && /^#(story|act[123])$/.test(window.location.hash)
  );
  const leftScrollRef = useRef<HTMLDivElement>(null);
  /** The full-screen scene layer: the mouse/touch/keyboard entry point. */
  const sceneRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);
  const introTextRef = useRef<HTMLDivElement>(null);
  /** The current direction's wipe timeline, so the opposite direction can kill it. */
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // ── Touch swipe state ──
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const SWIPE_THRESHOLD = 50; // min px to trigger swipe

  // Bumped by every open/close request. Steps already scheduled by the previous
  // one see the mismatch and drop out, so a fast open→close (or the reverse)
  // can never have both directions writing the same state.
  const choreoRef = useRef(0);
  const after = useCallback((ms: number, step: () => void) => {
    const gen = choreoRef.current;
    window.setTimeout(() => {
      if (gen === choreoRef.current) step();
    }, ms);
  }, []);

  // The preloader owns the asset progress + its own exit choreography, and
  // calls back once it has fully faded — that's when the scene takes over.
  const handleLoaded = useCallback(() => setIsLoaded(true), []);

  // The camera owns the copy's cue: revealing at `isLoaded` would print the
  // headline straight onto the desk close-up the intro starts on.
  const handleIntroCopyAt = useCallback(() => setIsCopyReady(true), []);

  const isDetailOpenRef = useRef(isDetailOpen);
  const isCopyOutRef = useRef(isCopyOut);
  const closingRef = useRef(false);
  useEffect(() => { isDetailOpenRef.current = isDetailOpen; }, [isDetailOpen]);
  useEffect(() => { isCopyOutRef.current = isCopyOut; }, [isCopyOut]);

  const beginCloseDetail = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const wasOpen = isDetailOpenRef.current;
    choreoRef.current += 1;
    // Move focus out before the panel turns `inert` + `aria-hidden`: hiding the
    // subtree that currently holds focus is invalid (and Chrome blocks it).
    // The close choreography puts focus back on the scene when it finishes.
    const active = document.activeElement as HTMLElement | null;
    if (active && active !== document.body && !sceneRef.current?.contains(active)) {
      active.blur();
    }
    // A deep link only seeds the first visit; reopening starts at the top.
    setEntryAct(null);
    setIsDetailVisible(false);
    after(DETAIL_FADE_LEAD, () => setIsDetailOpen(false));
    // A close that never got past its lead (double-clicked during the retract)
    // has nothing to wait for, so the copy comes straight back.
    after(wasOpen ? DETAIL_FADE_LEAD + COPY_RETURN_LEAD : 0, () => setIsCopyOut(false));
  }, [after]);

  const closeDetail = useCallback(() => {
    // Mirror the open state into history so the Android back gesture closes
    // the detail instead of leaving the site.
    if (closingRef.current) return;
    if (typeof window !== "undefined") {
      if (window.history.state?.ugvisDetail) {
        window.history.back();
      } else if (window.location.hash) {
        // Arrived straight on `#story` / `#act2`: there is no previous entry to
        // go back to, so drop the hash in place rather than leaving the page.
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
    beginCloseDetail();
  }, [beginCloseDetail]);

  const openDetail = useCallback(() => {
    closingRef.current = false;
    // The scene is about to become `inert` + `aria-hidden`; focus must leave it
    // first. The panel takes focus itself once it has finished opening.
    sceneRef.current?.blur();
    if (typeof window !== "undefined") {
      const hasStoryHash = /^#(story|act[123])$/.test(window.location.hash);
      if (window.history.state?.ugvisDetail !== true && !hasStoryHash) {
        // `#story` makes the open state restorable, shareable and back-button
        // safe: the entry below it is the landing view.
        window.history.pushState(
          { ...(window.history.state || {}), ugvisDetail: true },
          "",
          "#story"
        );
      }
    }
    choreoRef.current += 1;
    setIsCopyOut(true);
    after(COPY_EXIT_LEAD, () => setIsDetailOpen(true));
  }, [after]);

  // Follow a deep link once the intro has handed the scene over. Waiting for
  // `isIntroDone` keeps the opening choreography intact: the story slides in
  // over the rest pose, not over the desk close-up.
  useEffect(() => {
    if (!hashEntryPending || !isIntroDone) return;
    if (isCopyOut || isDetailOpen) return;
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot
       consumption of the URL, guarded by the ref-like `hashEntryPending` flag */
    setHashEntryPending(false);
    openDetail();
  }, [hashEntryPending, isIntroDone, isCopyOut, isDetailOpen, openDetail]);

  useEffect(() => {
    const onPopState = () => {
      const hash = window.location.hash;
      const actMatch = /^#act([123])$/.exec(hash);
      // The hash is the source of truth for history moves: back INTO `#story`
      // reopens the story, back OUT of it closes it.
      if (hash === "#story" || actMatch) {
        const act = actMatch ? (Number(actMatch[1]) as 1 | 2 | 3) : null;
        if (isCopyOutRef.current || isDetailOpenRef.current) {
          if (act) setEntryAct(act);
          return;
        }
        setEntryAct(act);
        openDetail();
        return;
      }
      if (isDetailOpenRef.current || isCopyOutRef.current) beginCloseDetail();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [beginCloseDetail, openDetail]);

  // Esc is the keyboard twin of the back gesture: it closes the story from
  // anywhere on the page, including from inside the story's own scroller.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isDetailOpenRef.current && !isCopyOutRef.current) return;
      e.preventDefault();
      closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDetail]);

  // Return focus to the scene when the story closes, so a keyboard user is not
  // dumped back on <body> and has to Tab in from the top of the document again.
  const hadDetailRef = useRef(false);
  useEffect(() => {
    if (!isCopyOut && !isDetailOpen) return;
    hadDetailRef.current = true;
  }, [isCopyOut, isDetailOpen]);
  useEffect(() => {
    if (isCopyOut || isDetailOpen || !hadDetailRef.current) return;
    hadDetailRef.current = false;
    sceneRef.current?.focus({ preventScroll: true });
  }, [isCopyOut, isDetailOpen]);

  const handleSceneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    // Space would otherwise page-scroll the document behind the scene.
    e.preventDefault();
    toggleView();
  };

  const toggleView = () => {
    if (!isIntroDone) return;
    // `isCopyOut` matters here: during the retract lead the model is still on
    // the landing side, but the user's intent has already left it.
    isCopyOut || isDetailOpen ? closeDetail() : openDetail();
  };

  // Opening always starts at the top of the story — unless a `#actN` deep link
  // asked for a specific act, in which case land on that act's opener.
  useEffect(() => {
    if (!isDetailOpen || !leftScrollRef.current) return;
    const scroller = leftScrollRef.current;
    const target = entryAct
      ? scroller.querySelectorAll<HTMLElement>(".narrative-text")[entryAct - 1]
      : null;
    if (!target) {
      scroller.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    const top =
      target.getBoundingClientRect().top -
      scroller.getBoundingClientRect().top +
      scroller.scrollTop -
      120;
    scroller.scrollTo({ top: Math.max(top, 0), behavior: "instant" });
  }, [isDetailOpen, entryAct]);

  // ── Touch swipe: up → enter detail, down → exit detail ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isIntroDone || wheelLockRef.current) return;
    const touch = e.changedTouches[0];
    const deltaY = touchStartRef.current.y - touch.clientY;
    const deltaX = touchStartRef.current.x - touch.clientX;
    const elapsed = Date.now() - touchStartRef.current.time;

    // Only trigger swipe if vertical movement dominates and it's a quick gesture (<500ms)
    if (Math.abs(deltaY) > Math.abs(deltaX) && elapsed < 500 && Math.abs(deltaY) > SWIPE_THRESHOLD) {
      wheelLockRef.current = true;
      if (deltaY > 0) {
        // Swipe up → enter detail
        if (!isDetailOpen) openDetail();
      } else {
        // Swipe down → exit detail
        if (isDetailOpen) closeDetail();
      }
      setTimeout(() => (wheelLockRef.current = false), 800);
    }
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!isIntroDone || wheelLockRef.current) return;
      if (!isDetailOpen && e.deltaY > 0) {
        wheelLockRef.current = true;
        openDetail();
        setTimeout(() => (wheelLockRef.current = false), 800);
      }
    };
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [isIntroDone, isDetailOpen, openDetail]);

  // ── Hero copy wipe ──
  // Each line is revealed by expanding a clip rect left → right: the glyphs
  // never move, only the amount of them that is painted grows. The vertical
  // insets are negative so the clip doesn't shave off ascenders/descenders
  // (text-5xl/6xl use line-height 1, so "Productivity"'s descender does
  // overflow its own line box).
  //
  // Two hairlines (`[data-rule]`) are drawn by the same stroke: one leads the
  // kicker, one closes the title. They give the block a drawn structure to hang
  // on, which is what the reveal otherwise leaves thin — no extra colours, no
  // extra elements, just the same motion measured in 1px.
  //
  // Cued by the camera, NOT by `isLoaded`: at hand-off the camera is still an
  // extreme close-up of the desk, so type revealed there would sit on the desk
  // (and on the paper's own baked typography). The camera calls back at
  // INTRO_COPY_AT, by which point the model has left the top band — the copy
  // then wipes in and its last line lands just as the camera settles.
  //
  // The whole thing runs backwards when the copy's cue is set (i.e. the moment
  // the user opens the detail view — the paper is deliberately not told to move
  // until this has finished), and forwards again once the copy is allowed back.
  useGSAP(
    () => {
      const lines = gsap.utils.toArray<HTMLElement>("[data-reveal]", introTextRef.current);
      if (lines.length === 0) return;
      // [kicker rule, title rule], in DOM order.
      const rules = gsap.utils.toArray<HTMLElement>("[data-rule]", introTextRef.current);

      const hidden = "inset(-35% 100% -35% 0%)";
      const shown = "inset(-35% 0% -35% 0%)";

      // The previous direction's timeline is left where it is (so nothing
      // jumps) but never allowed to keep writing over the new one.
      tlRef.current?.kill();
      tlRef.current = null;

      // Before the camera has cleared the copy band only the hidden state matters.
      if (!isCopyReady) {
        gsap.set(lines, { clipPath: hidden });
        gsap.set(rules, { scaleX: 0 });
        return;
      }

      if (reducedMotion) {
        gsap.set(lines, { clipPath: shown });
        gsap.set(rules, { scaleX: 1, transformOrigin: "left center" });
        return;
      }

      // Leaving: the rules retract to the left and the lines unwind bottom-first,
      // all one stroke.
      if (isCopyOut) {
        tlRef.current = gsap
          .timeline()
          .to(rules, {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 0.3,
            ease: "power2.in",
            stagger: { each: 0.04, from: "end" },
          }, 0)
          .to(lines, {
            clipPath: hidden,
            duration: 0.4,
            ease: "power2.in",
            stagger: { each: 0.06, from: "end" },
          }, 0);
        return;
      }

      // Entering: the first load, and every return from the detail view. The
      // final state is kept as an inline clip (instead of clearing it) so the
      // exit tween always has a numeric value to interpolate from.
      const tl = gsap
        .timeline({ delay: 0.05 })
        .fromTo(
          lines,
          { clipPath: hidden },
          { clipPath: shown, duration: 0.85, ease: "power3.inOut", stagger: 0.12 },
          0
        );

      if (rules[0]) {
        tl.fromTo(
          rules[0],
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.45, ease: "power2.out" },
          RULE_KICKER_AT
        );
      }
      if (rules[1]) {
        tl.fromTo(
          rules[1],
          { scaleX: 0, transformOrigin: "left center" },
          { scaleX: 1, duration: 0.55, ease: "power2.out" },
          RULE_TITLE_AT
        );
      }

      tlRef.current = tl;
    },
    { scope: introTextRef, dependencies: [isCopyReady, isCopyOut, reducedMotion] }
  );

  return (
    <div
      className={`relative h-dvh w-full flex flex-col flex-1 items-center justify-start font-serif overflow-hidden select-none transition-colors duration-1000 ease-in-out ${
        isDetailOpen ? "bg-surface" : "bg-surface"
      }`}
    >
      <LoadingOverlay onLoaded={handleLoaded} />

      {/* The copy block itself never fades or slides — the per-line clip wipe
          below is the only motion, in both directions. */}
      <div
        ref={introTextRef}
        className="fixed top-0 flex flex-col flex-1 items-center justify-start pointer-events-none z-10"
      >
        {/* Kicker: a mono label (the site's second voice — the counters and the
            charts already speak it) opened by the first stroke of the wipe. */}
        <div className="mt-6 sm:mt-10 flex items-center gap-3 sm:gap-4 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-text-secondary">
          <span data-rule aria-hidden className="block h-px w-6 sm:w-10 shrink-0 bg-text-secondary/50" />
          <span data-reveal>My&nbsp;2021&ndash;2026</span>
        </div>

        {/* Marker band instead of a hairline: `kraft` at full opacity — a
            material (manila/paper, the family the desk and its baked shadows
            already live in) rather than a brand accent, so it warms the hero
            without adding a hue the 3D scene can't support. Ink is warmed to
            `ink-warm` to match the wood; ink-on-kraft measures 10.8:1, where
            the same band in opaque brand would be 3.4:1 (dark) / 1.6:1
            (brand-900) and force white ink, i.e. the poster variant.
            Height/offset are em-based and the top edge sits mid x-height, so it
            "invades" the lower part of the type at every breakpoint.
            `isolate` on the h1 makes the band paint behind the text (a `-z-*`
            child without it can fall behind the page background). */}
        <h1
          data-reveal
          className="relative isolate my-4 sm:my-6 text-4xl sm:text-5xl md:text-6xl text-ink-warm tracking-tight"
        >
          Productivity
          <span
            data-rule
            aria-hidden
            className="absolute left-0 -z-10 h-[0.46em] w-full -bottom-[0.055em] bg-kraft"
          />
        </h1>

        <div data-reveal className="italic text-center px-4 text-text-secondary text-sm sm:text-base">
          A <span className="font-bold">visualization</span> of{" "}
          <span className="font-mono not-italic tabular-nums text-ink-warm">567</span> workfiles created during my undergraduate.
        </div>
        <div data-reveal className="mt-4 sm:mt-6 pointer-events-auto">
          By <a href="https://www.xianzhaoduan.com" target="_blank" rel="noreferrer" className="underline hover:text-brand transition-colors">Paul Duan</a>
        </div>
      </div>

      {/* The desk is the entry point; without a cue neither the tap nor the
          swipe-up exists on a phone. The pill is also the scene's focus cue:
          the scene layer fills the window, so it can't wear a ring of its own. */}
      <div
        className={`pointer-events-none fixed left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 rounded-full px-5 py-2 transition-opacity duration-700 ${
          isCopyReady && !isCopyOut ? "opacity-100" : "opacity-0"
        } ${isSceneFocused ? "ring-1 ring-brand/60" : ""}`}
        style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
      >
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.3em] ${
            isSceneFocused ? "text-brand" : "text-text-secondary"
          }`}
        >
          <span className="sm:hidden">Tap or swipe up</span>
          <span className="hidden sm:inline">Click, scroll or press Enter</span>
        </span>
        <svg
          width="14"
          height="9"
          viewBox="0 0 14 9"
          fill="none"
          aria-hidden="true"
          className={isSceneFocused ? "text-brand/70" : "text-text-secondary/70"}
        >
          <path d="M1 7.5L7 1.5L13 7.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <DetailView
        scrollRef={leftScrollRef}
        isDetailVisible={isDetailVisible}
        isDetailMounted={isCopyOut || isDetailVisible}
        initialAct={entryAct}
        onExit={closeDetail}
      />

      <div
        ref={sceneRef}
        role="button"
        data-scene
        tabIndex={isCopyOut || isDetailOpen ? -1 : 0}
        aria-label="The desk scene. Open the data story: 567 workfiles, 34 courses, five years."
        aria-expanded={isDetailOpen}
        aria-hidden={isCopyOut || isDetailOpen}
        inert={isCopyOut || isDetailOpen}
        className={`absolute inset-0 z-0 ${isLoaded ? "cursor-pointer" : "cursor-wait"}`}
        onClick={toggleView}
        onKeyDown={handleSceneKeyDown}
        onFocus={() => setIsSceneFocused(true)}
        onBlur={() => setIsSceneFocused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-touch-lock
      >
        <Canvas
          role="img"
          aria-label="A wooden desk in warm light, seen from above: a sheet of paper filling the centre, with a mug, a pencil and a small plant around it. The paper becomes the story."
          dpr={[1, 1.75]}
          gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0, alpha: true, antialias: true }}
          camera={{ fov: 45, position: INTRO_CAMERA_POSITION.toArray() }}
        >
          <ambientLight intensity={3.5} />
          <Suspense fallback={null}>
            <ThreeScene isDetailOpen={isDetailOpen} onPaperCovered={setIsDetailVisible} />
          </Suspense>
          <CameraController isDetailOpen={isDetailOpen} isLoaded={isLoaded} isIntroDone={isIntroDone} onIntroDone={() => setIsIntroDone(true)} onIntroCopyAt={handleIntroCopyAt} />
        </Canvas>
      </div>
    </div>
  );
}

// Preload the 3D model
useGLTF.preload("./model/desk_web_3_baked_animation.glb");