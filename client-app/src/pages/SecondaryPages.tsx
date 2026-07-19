import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, SectionLabel } from '../components/ui/primitives';
import { displayCode, fetchEvaluations } from '../api/client';
import { useApp } from '../context/AppContext';

interface EvaluationSummary {
  eval_id?: string;
  object_id?: string;
  report?: {
    bank_value?: { low: number };
    recommendation?: string;
  };
}

export function EvaluationPage() {
  const { selection } = useApp();
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);

  useEffect(() => {
    fetchEvaluations().then(setEvaluations);
  }, []);

  return (
    <div className="px-8 py-8">
      <h1 className="text-[32px] font-semibold">Evaluation & Offers</h1>
      <p className="mt-1 text-[15px] text-muted">
        Bank-grade values after documents arrive — D6 evaluation engine.
      </p>

      <Card className="mt-6 p-6">
        <SectionLabel>Demo · 28-unit mixed-use</SectionLabel>
        <p className="text-[14px] text-muted">Run the full D6 pipeline on the PDF test object.</p>
        <button
          type="button"
          onClick={() => fetch('/api/evaluation/sample', { method: 'POST' }).then(() => fetchEvaluations().then(setEvaluations))}
          className="mt-4 rounded-md bg-ink px-4 py-2 text-[12px] font-semibold text-white"
        >
          Run sample evaluation
        </button>
      </Card>

      {evaluations.map((ev) => (
        <Card key={ev.eval_id} className="mt-4 p-6">
          <h2 className="text-[18px] font-semibold">{ev.object_id}</h2>
          {ev.report && (
            <>
              <div className="mt-4 text-[24px] font-semibold">
                €{ev.report.bank_value?.low?.toLocaleString('de-DE')}
              </div>
              <p className="text-[13px] text-muted">Bank-style value · {ev.report.recommendation}</p>
              <a
                href={`/api/evaluation/${ev.eval_id}/report`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block text-[12px] font-semibold underline"
              >
                Open report
              </a>
            </>
          )}
        </Card>
      ))}

      {selection.length > 0 && (
        <p className="mt-6 text-[13px] text-muted">
          {selection.length} mandated object(s) from selection — upload documents to start per-object evaluation.
        </p>
      )}

      <Link to="/pipeline" className="mt-4 inline-block text-[13px] font-semibold underline">
        View pipeline →
      </Link>
    </div>
  );
}

export function PipelinePage() {
  const { selection } = useApp();
  const stages = ['Docs', 'Owner contact', 'Evaluation', 'Offer', 'Closing'];

  return (
    <div className="px-8 py-8">
      <h1 className="text-[32px] font-semibold">Pipeline</h1>
      <p className="mt-1 text-[15px] text-muted">Live progress on every mandated object.</p>

      {(selection.length ? selection : ['STG-TEST28']).map((id, i) => (
        <Card key={id} className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">{displayCode(id)}</div>
            <span className="text-[12px] text-muted">Stuttgart</span>
          </div>
          <div className="mt-3 flex gap-1">
            {stages.map((_, si) => (
              <div
                key={si}
                className={[
                  'h-1.5 flex-1 rounded-full',
                  si <= i ? 'bg-ink' : si === i + 1 ? 'bg-amber-400' : 'bg-tan',
                ].join(' ')}
              />
            ))}
          </div>
          <div className="mt-2 text-[11px] text-muted">{stages.join(' → ')}</div>
          <div className="mt-2 text-[13px]">
            <strong>Next:</strong>{' '}
            {i === 0 ? 'Grundbuch extract ordered' : 'Waiting for owner reply, follow-up booked'}
          </div>
          {i === 1 && (
            <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
              Grundbuch extract missing
            </span>
          )}
        </Card>
      ))}
    </div>
  );
}

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="px-8 py-8">
      <h1 className="text-[32px] font-semibold">{title}</h1>
      <Card className="mt-6 p-6 text-muted">Coming soon.</Card>
    </div>
  );
}
