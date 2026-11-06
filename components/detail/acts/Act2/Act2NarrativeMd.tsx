'use client';
import { ACT2SUBSTEPS } from './Act2Narrative';
import { ActOpener, Note, RunningHead } from '@/components/detail/narrative/ReportType';

export default function Act2NarrativeMd({ step }: { step: number }) {
  return (
    <div className="w-full pt-2">
      {step === 0 ? <ActOpener act={2} compact /> : <RunningHead act={2} />}
      {ACT2SUBSTEPS.filter((s) => s.step === step).map((s) => (
        <div key={s.step}>
          <div className="t-body">{s.text}</div>
          {s.note && <Note>{s.note}</Note>}
        </div>
      ))}
    </div>
  );
}
