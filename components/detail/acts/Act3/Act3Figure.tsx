'use client';

import Act3Visual from './Act3Visual';
import FigureFrame from '@/components/detail/narrative/FigureFrame';
import { useEmphasis } from '@/components/detail/narrative/EmphasisContext';
import { ACT3_STEPS } from './act3Steps';

/**
 * Act III's visual with the report chrome. The four steps share the pinned
 * reading and the figure's notes; `band:` and `punch:` emphases drive the
 * deadline strip and the punchcard.
 */
export default function Act3Figure({
  step,
  isActive,
}: {
  step: number;
  isActive: boolean;
}) {
  const { active, setHover } = useEmphasis();
  const current =
    active && active.act === 3 && active.step === step ? active : null;
  const config = ACT3_STEPS[step] ?? ACT3_STEPS[0];

  return (
    <FigureFrame
      fig={config.fig}
      title={config.title}
      step={step + 10}
      total={13}
      notes={config.keywords.map((keyword) => ({
        index: keyword.index,
        lead: keyword.noteLead,
        text: keyword.noteText,
        emphasis: keyword.emphasis,
      }))}
      active={current?.keyword ?? null}
      onNoteHover={(keyword, emphasis) =>
        setHover({ act: 3, step, keyword, emphasis })
      }
      onNoteLeave={() => setHover(null)}
    >
      <div className="h-full w-full pb-[150px] pt-10">
        <Act3Visual
          step={step}
          isActive={isActive}
          emphasis={current?.emphasis ?? null}
        />
      </div>
    </FigureFrame>
  );
}
