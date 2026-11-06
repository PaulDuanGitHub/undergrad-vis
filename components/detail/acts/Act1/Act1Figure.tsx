'use client';

import Act1Visual from './Act1Visual';
import FigureFrame from '@/components/detail/narrative/FigureFrame';
import { useEmphasis } from '@/components/detail/narrative/EmphasisContext';
import { ACT1_STEPS } from './act1Opening';

/**
 * Act I's visual, with the report chrome on every substep.
 *
 * The frame is shared by all five steps: the figure title, the three notes and
 * the plate number come from the step's entry in `ACT1_STEPS`, so the copy and
 * the caption are the same data. Hovering a note focuses its keyword and the
 * visual filter, and hovering a keyword does the reverse through the context.
 */
export default function Act1Figure({
  step,
  isActive,
  visible,
  started = true,
}: {
  step: number;
  isActive: boolean;
  visible: boolean;
  /** False on the introduction: bare visual, no plate chrome or notes. */
  started?: boolean;
}) {
  const { active, setHover } = useEmphasis();
  const current =
    active && active.act === 1 && active.step === step ? active : null;
  const config = ACT1_STEPS[step] ?? ACT1_STEPS[0];
  const emphasis = current?.emphasis ?? null;

  return (
    <FigureFrame
      fig={config.fig}
      title={config.title}
      step={step + 1}
      total={13}
      notes={config.keywords.map((keyword) => ({
        index: keyword.index,
        lead: keyword.noteLead,
        text: keyword.noteText,
        emphasis: keyword.emphasis,
      }))}
      active={current?.keyword ?? null}
      chrome={started}
      onNoteHover={(keyword, noteEmphasis) =>
        setHover({ act: 1, step, keyword, emphasis: noteEmphasis })
      }
      onNoteLeave={() => setHover(null)}
    >
      <Act1Visual
        step={step}
        isActive={isActive}
        visible={visible}
        emphasis={emphasis}
        interactive={started}
      />
    </FigureFrame>
  );
}
