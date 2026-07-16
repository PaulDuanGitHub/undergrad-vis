import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

interface StateMachineConfig {
  step: number;
  isActive: boolean;

  // 声明：非激活状态时的兜底样式
  onInactive: () => void;
  // 声明：各个 Step 的静态状态 (用于初始化或快速跳跃时的 fallback)
  states: Record<number, () => void>;
  // 声明：特定步骤之间的过渡动画 (Timeline)
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
    // 1. 如果未激活，执行重置逻辑
    if (!isActive) {
      onInactive();
      return;
    }

    const transitionKey = `${prevStep.current}->${step}`;

    // A: 如果我们在 transitions 字典里声明了这个特定的过渡动画，则播放它
    if (transitions[transitionKey]) {
      transitions[transitionKey]();
    }
    // B: 如果没有声明过渡动画（比如用户直接从 0 跳到 3），直接应用目标静态状态兜底
    else if (states[step]) {
      states[step]();
    }

    prevStep.current = step;
  }, [step, isActive]); // 依赖项只有这两个
}
