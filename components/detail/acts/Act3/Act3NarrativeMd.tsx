'use client';
import { ACT3SUBSTEPS } from './Act3Narrative';
import { ActOpener, Note, RunningHead } from '@/components/detail/narrative/ReportType';

export default function Act3NarrativeMd({ step }: { step: number }) {
  return (
    <div className="w-full pt-2">
      {step === 0 ? <ActOpener act={3} compact /> : <RunningHead act={3} />}
      {ACT3SUBSTEPS.filter((s) => s.step === step).map((s) => (
        <div key={s.step}>
          <div className="t-body">{s.text}</div>
          {s.note && <Note>{s.note}</Note>}
        </div>
      ))}
    </div>
  );
}
