import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface StateMachineConfig {
  step: number;
  isActive: boolean;

  /** Reset styles applied when the component is inactive */
  onInactive: () => void;
  /** Static state setters for each step (used for initialization / fast jumps) */
  states: Record<number, () => void>;
  /** Named transitions between specific steps (timeline-based animations) */
  transitions: Record<string, () => void>;
  /**
   * Fallback for *non-adjacent* jumps, i.e. a step change with no named
   * transition (e.g. 0 -> 2). These are reachable in practice: scrolling fast
   * crosses several ScrollTrigger centers in a single update, and React then
   * only renders the last `setStep`, so the machine sees 0 -> 2 directly.
   *
   * Without this the machine applies `states[step]` — an instant, unanimated
   * state swap that lands mid-scroll and reads as a hard cut. Provide it to
   * cross-fade instead. `from === to` (re-entry into an act) still falls back
   * to `states[step]`; the layer wrapper's own fade covers that case.
   */
  onJump?: (from: number, to: number) => void;
}

export function useGSAPStateMachine({
  step,
  isActive,
  onInactive,
  states,
  transitions,
  onJump,
}: StateMachineConfig) {
  const prevStep = useRef(step);
  const reducedMotion = useReducedMotion();

  useGSAP(() => {
    // If inactive, run the reset handler.
    // `prevStep` is deliberately NOT advanced here: it must still hold the step
    // the act was left on so re-entry can resolve the right transition.
    if (!isActive) {
      onInactive();
      return;
    }

    const from = prevStep.current;
    const transitionKey = `${from}->${step}`;

    // Reduced motion: land on the target state with no tween at all. The
    // `states` setters are the instant path the machine already uses for
    // re-entry, so the chart is simply *there*, fully formed.
    if (reducedMotion) {
      states[step]?.();
    }
    // If a named transition exists, play it
    else if (transitions[transitionKey]) {
      transitions[transitionKey]();
    }
    // Otherwise, animate a non-adjacent jump if the act knows how
    else if (from !== step && onJump) {
      onJump(from, step);
    }
    // Otherwise apply the target step's static state as a fallback
    else if (states[step]) {
      states[step]();
    }

    prevStep.current = step;
  }, [step, isActive, reducedMotion]);
}
