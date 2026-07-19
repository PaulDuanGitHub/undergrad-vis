import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface StateMachineConfig {
  step: number;
  isActive: boolean;

  /** Reset styles applied when the component is inactive */
  onInactive: () => void;
  /** Static state setters for each step (used for initialization / fast jumps) */
  states: Record<number, () => void>;
  /** Named transitions between specific steps (timeline-based animations) */
  transitions: Record<string, () => void>;
}

export function useGSAPStateMachine({
  step,
  isActive,
  onInactive,
  states,
  transitions,
}: StateMachineConfig) {
  const prevStep = useRef(step);

  useGSAP(() => {
    // If inactive, run the reset handler
    if (!isActive) {
      onInactive();
      return;
    }

    const transitionKey = `${prevStep.current}->${step}`;

    // If a named transition exists, play it
    if (transitions[transitionKey]) {
      transitions[transitionKey]();
    }
    // Otherwise apply the target step's static state as a fallback (e.g. jumping from 0 to 3)
    else if (states[step]) {
      states[step]();
    }

    prevStep.current = step;
  }, [step, isActive]);
}
