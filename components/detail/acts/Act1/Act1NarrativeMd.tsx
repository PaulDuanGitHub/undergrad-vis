'use client';
import { ACT1SUBSTEPS } from './Act1Narrative';
import { ActOpener, Note, RunningHead } from '@/components/detail/narrative/ReportType';

export default function Act1NarrativeMd({ step }: { step: number }) {
  return (
    <div className="w-full pt-2">
      {step === 0 ? <ActOpener act={1} compact /> : <RunningHead act={1} />}
      {ACT1SUBSTEPS.filter((s) => s.step === step).map((s) => (
        <div key={s.step}>
          <div className="t-body">{s.text}</div>
          {s.note && <Note>{s.note}</Note>}
        </div>
      ))}
    </div>
  );
}
