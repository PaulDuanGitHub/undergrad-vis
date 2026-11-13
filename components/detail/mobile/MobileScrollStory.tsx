'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import Act1Narrative from '@/components/detail/acts/Act1/Act1Narrative';
import Act2Narrative from '@/components/detail/acts/Act2/Act2Narrative';
import Act3Narrative from '@/components/detail/acts/Act3/Act3Narrative';
import Act1Figure from '@/components/detail/acts/Act1/Act1Figure';
import Act2Figure from '@/components/detail/acts/Act2/Act2Figure';
import Act3Figure from '@/components/detail/acts/Act3/Act3Figure';
import { ACT1_STEPS } from '@/components/detail/acts/Act1/act1Opening';
import { ACT2_STEPS } from '@/components/detail/acts/Act2/act2Steps';
import { ACT3_STEPS } from '@/components/detail/acts/Act3/act3Steps';
import { EmphasisProvider } from '@/components/detail/narrative/EmphasisContext';
import Footer from '@/components/detail/Footer';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

gsap.registerPlugin(ScrollTrigger);

type ScrollAct = 1 | 2 | 3;
type Active = { act: ScrollAct; step: number };

const ACTS: ScrollAct[] = [1, 2, 3];

const STEPS_BY_ACT: Record<ScrollAct, typeof ACT1_STEPS | typeof ACT2_STEPS | typeof ACT3_STEPS> = {
  1: ACT1_STEPS,
  2: ACT2_STEPS,
  3: ACT3_STEPS,
};

/**
 * The mobile story: Act 1, Act 2 and Act 3 in one continuous scroll.
 *
 * Shared spec: 44px top bar, sticky 58dvh chart, 42dvh PinnedReading stage,
 * 22px/word runway, no FigureFrame notes. Act 1 keeps the 3D scene; Act 2/3
 * use the faster 1.6× step morph.
 *
 * The three figures are stacked as layers inside the sticky pane and
 * cross-faded when the scroll crosses an act opener, so a chapter break reads
 * as a page turn rather than the chart popping. The colophon is the last block
 * in the scroller: it rides over the sticky figure (higher z) once Act III is
 * read, and the top bar hands its plate over to it.
 */
export default function MobileScrollStory({
  isDetailVisible,
  initialAct = null,
  onExit,
}: {
  isDetailVisible: boolean;
  /** `#actN` deep link: land on that act's opener instead of the top. */
  initialAct?: 1 | 2 | 3 | null;
  onExit: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  /** The act the story opens on: a deep link, or Act I. */
  const entryAct = initialAct ?? 1;
  const [active, setActive] = useState<Active>(() => ({ act: entryAct, step: 0 }));
  const [atFooter, setAtFooter] = useState(false);
  const reducedMotion = useReducedMotion();

  const steps = STEPS_BY_ACT[active.act];
  const config = steps[active.step] ?? steps[0];
  const activeStep = { act: active.act, step: active.step };

  /** Only re-render when the step actually changes. */
  const select = useCallback(
    (act: ScrollAct, step: number) =>
      setActive((prev) =>
        prev.act === act && prev.step === step ? prev : { act, step },
      ),
    [],
  );

  // ── Scroll model: substeps, act openers, colophon ──
  useGSAP(
    () => {
      const scroller = scrollRef.current;
      if (!scroller) return;

      const sections = gsap.utils.toArray<HTMLElement>(
        '[data-act1-step], [data-act2-step], [data-act3-step]',
        scroller,
      );

      sections.forEach((el) => {
        const act = (
          el.dataset.act1Step !== undefined
            ? 1
            : el.dataset.act2Step !== undefined
              ? 2
              : 3
        ) as ScrollAct;
        const next = parseInt(el.dataset[`act${act}Step`] || '0', 10);
        const pick = () => select(act, next);

        ScrollTrigger.create({
          trigger: el,
          scroller,
          start: 'top 58%',
          end: 'bottom 58%',
          onToggle: (self) => {
            if (self.isActive) pick();
          },
          onEnter: pick,
          onEnterBack: pick,
        });
      });

      // The chapter page owns the hand-off: the next act's figure changes as
      // its opener enters the reading band, not when its first substep does.
      gsap.utils
        .toArray<HTMLElement>('.narrative-act', scroller)
        .forEach((el, index) => {
          const act = (index + 1) as ScrollAct;
          if (act === 1) return;
          ScrollTrigger.create({
            trigger: el,
            scroller,
            // The chapter page is 42dvh tall and centres its copy, so waiting
            // for its top to reach the band would switch the figure while the
            // reader is already on the page. Hand over as the page arrives.
            start: 'top 85%',
            end: 'bottom 58%',
            onToggle: (self) => {
              if (self.isActive) select(act, 0);
            },
            // Scrolling back up into the breath before the chapter: hold the
            // previous act's last figure instead of the one that hasn't started.
            onLeaveBack: () => {
              const previous = (act - 1) as ScrollAct;
              select(previous, STEPS_BY_ACT[previous].length - 1);
            },
          });
        });

      // The colophon is the story's last page: once it rides over the chart the
      // top bar stops talking about a figure.
      if (footerRef.current) {
        ScrollTrigger.create({
          trigger: footerRef.current,
          scroller,
          start: 'top 6%',
          end: 'bottom top',
          onToggle: (self) => setAtFooter(self.isActive),
        });
      }

      document.fonts?.ready.then(() => ScrollTrigger.refresh());
    },
    { scope: scrollRef },
  );

  // ── Act hand-off: cross-fade the stacked figure layers ──
  const previousAct = useRef<ScrollAct>(entryAct);
  useIsomorphicLayoutEffect(() => {
    const from = previousAct.current;
    if (from === active.act) return;
    previousAct.current = active.act;

    const outgoing = layerRefs.current[from - 1];
    const incoming = layerRefs.current[active.act - 1];
    if (!outgoing || !incoming) return;

    gsap.killTweensOf([outgoing, incoming]);
    gsap.set(outgoing, { pointerEvents: 'none' });
    gsap.set(incoming, { pointerEvents: 'auto' });

    if (reducedMotion) {
      gsap.set(outgoing, { autoAlpha: 0, y: 0 });
      gsap.set(incoming, { autoAlpha: 1, y: 0 });
      return;
    }

    const dir = active.act > from ? 1 : -1;
    gsap.to(outgoing, {
      autoAlpha: 0,
      y: -16 * dir,
      duration: 0.3,
      ease: 'power2.in',
    });
    gsap.fromTo(
      incoming,
      { autoAlpha: 0, y: 20 * dir },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        clearProps: 'transform',
      },
    );

    return () => {
      gsap.killTweensOf([outgoing, incoming]);
    };
  }, [active.act, reducedMotion]);

  // ── Deep link: open on the requested act's opener ──
  const didEntryScroll = useRef(false);
  useEffect(() => {
    if (!isDetailVisible || didEntryScroll.current) return;
    didEntryScroll.current = true;

    const scroller = scrollRef.current;
    if (!scroller) return;

    const act = entryAct;
    if (act === 1) {
      scroller.scrollTop = 0;
    } else {
      const opener = scroller.querySelectorAll<HTMLElement>('.narrative-act')[act - 1];
      if (opener) {
        const top =
          opener.getBoundingClientRect().top +
          scroller.scrollTop -
          scroller.clientHeight * 0.58;
        scroller.scrollTop = Math.max(top, 0);
      }
    }
    // The triggers were measured at the top of the story. The initial `active`
    // state is already this act, so the scroll only has to place the page.
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [isDetailVisible, entryAct]);

  return (
    <div
      role="region"
      aria-label="Data story"
      aria-hidden={!isDetailVisible}
      inert={!isDetailVisible}
      data-report
      className={`mobile-story fixed inset-0 z-40 overflow-hidden bg-surface transition-opacity duration-700 ${
        isDetailVisible
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
      style={{
        // The bar, the sticky chart and the colophon each reserve their own
        // vertical safe-area inset; only the landscape notches are handled here.
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <EmphasisProvider activeStep={activeStep}>
        <div
          ref={scrollRef}
          data-detail-scroller
          className="mobile-scroll h-full overflow-y-auto overscroll-contain bg-surface"
        >
          <div
            className="mobile-scroll-visual sticky top-0 z-20 border-b border-slate-100 bg-surface"
            style={{
              height: 'var(--ms-chart)',
              paddingTop: 'calc(var(--ms-topbar) + env(safe-area-inset-top))',
            }}
          >
            <div className="relative h-full w-full">
              {ACTS.map((act) => (
                <div
                  key={act}
                  ref={(el) => {
                    layerRefs.current[act - 1] = el;
                  }}
                  aria-hidden={active.act !== act}
                  inert={active.act !== act}
                  className={`absolute inset-0 ${
                    act === entryAct ? '' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  {act === 1 ? (
                    <Act1Figure
                      step={active.step}
                      isActive={active.act === 1}
                      visible={isDetailVisible}
                      started
                    />
                  ) : act === 2 ? (
                    <Act2Figure
                      step={active.step}
                      isActive={active.act === 2}
                      fast
                      compact
                    />
                  ) : (
                    <Act3Figure
                      step={active.step}
                      isActive={active.act === 3}
                      fast
                      compact
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mobile-scroll-body">
            <div className="mobile-scroll-narrative relative z-10 bg-surface">
              <Act1Narrative compact />
              <Act2Narrative compact />
              <Act3Narrative compact />
            </div>

            {/* The colophon rides over the sticky figure as the last page. */}
            <div
              ref={footerRef}
              className="mobile-scroll-footer relative z-30 bg-surface"
            >
              <Footer compact onExit={onExit} />
            </div>
          </div>
        </div>
      </EmphasisProvider>

      <div
        className="mobile-scroll-nav fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-surface/95 px-3 backdrop-blur-sm"
        style={{
          height: 'calc(var(--ms-topbar) + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label="Close the story"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:border-brand hover:text-brand"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <span className="min-w-0 flex-1 truncate text-center font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
          {atFooter
            ? 'Colophon — method & credits'
            : `Fig. ${config.fig} — ${config.title}`}
        </span>

        <span className="min-w-9 text-right font-mono text-[10px] tabular-nums text-slate-500">
          {atFooter ? '' : `${active.step + 1}/${steps.length}`}
        </span>
      </div>
    </div>
  );
}
