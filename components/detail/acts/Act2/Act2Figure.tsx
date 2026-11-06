'use client';

import Act2Visual from './Act2Visual';
import FigureFrame from '@/components/detail/narrative/FigureFrame';
import { useEmphasis } from '@/components/detail/narrative/EmphasisContext';
import { ACT2_STEPS } from './act2Steps';

/**
 * Act II's visual with the report chrome.
 *
 * The figure's chart owns the full pane, so the frame's header and notes sit
 * over reserved padding rather than over the semester ticks. Interactive
 * notes and keywords share the same focus state as Act I.
 */
export default function Act2Figure({
  step,
  isActive,
}: {
  step: number;
  isActive: boolean;
}) {
  const { active, setHover } = useEmphasis();
  const current =
    active && active.act === 2 && active.step === step ? active : null;
  const config = ACT2_STEPS[step] ?? ACT2_STEPS[0];

  return (
    <FigureFrame
      fig={config.fig}
      title={config.title}
      step={step + 6}
      total={13}
      notes={config.keywords.map((keyword) => ({
        index: keyword.index,
        lead: keyword.noteLead,
        text: keyword.noteText,
        emphasis: keyword.emphasis,
      }))}
      active={current?.keyword ?? null}
      onNoteHover={(keyword, emphasis) =>
        setHover({ act: 2, step, keyword, emphasis })
      }
      onNoteLeave={() => setHover(null)}
    >
      <div className="h-full w-full pb-[150px] pt-10">
        <Act2Visual
          step={step}
          isActive={isActive}
          emphasis={current?.emphasis ?? null}
        />
      </div>
    </FigureFrame>
  );
}
