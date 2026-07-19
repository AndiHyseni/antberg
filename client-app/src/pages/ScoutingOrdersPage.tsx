import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, PrimaryButton } from '../components/ui/primitives';
import { useApp, estimateScanScope } from '../context/AppContext';
import { submitOrder } from '../api/client';
import {
  ASSET_OPTIONS,
  SIGNAL_OPTIONS,
  STRATEGY_OPTIONS,
  type OrderStep,
  type StrategyId,
} from '../types';

const STEPS = [
  'Strategy',
  'Geography',
  'Asset Criteria',
  'Investment Parameters',
  'Signals',
  'Review',
];

export function ScoutingOrdersPage() {
  const { order, setOrder } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<OrderStep>(1);
  const [tab, setTab] = useState<'new' | 'active' | 'draft' | 'completed'>('new');
  const [submitting, setSubmitting] = useState(false);

  const scanScope = estimateScanScope(order);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await submitOrder(order);
      navigate('/catalogue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-[32px] font-semibold tracking-tight">Scouting Orders</h1>
      <p className="mt-1 text-[15px] text-muted">
        Define what kind of hidden opportunity Antberg should search for.
      </p>

      <div className="mt-6 flex gap-6 border-b border-border text-[13px]">
        {[
          { id: 'new', label: 'New Order' },
          { id: 'active', label: 'Active (2)' },
          { id: 'draft', label: 'Draft (1)' },
          { id: 'completed', label: 'Completed (3)' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={[
              'pb-3 font-medium',
              tab === t.id ? 'border-b-2 border-ink text-ink' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex gap-8">
        <div className="min-w-0 flex-1">
          <div className="mb-8 flex items-center justify-between">
            {STEPS.map((label, i) => {
              const n = (i + 1) as OrderStep;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={[
                        'flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold',
                        active
                          ? 'bg-lime text-ink'
                          : done
                            ? 'bg-ink text-white'
                            : 'bg-gray-200 text-muted',
                      ].join(' ')}
                    >
                      {n}
                    </div>
                    <span
                      className={[
                        'mt-2 text-[11px] font-medium',
                        active ? 'text-ink' : 'text-muted',
                      ].join(' ')}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="mx-2 h-px flex-1 bg-border" />
                  )}
                </div>
              );
            })}
          </div>

          <Card className="p-8">
            {step === 1 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Investment thesis
                </div>
                <div className="flex flex-wrap gap-3">
                  {STRATEGY_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setOrder({ strategy: s.id as StrategyId, strategyLabel: s.label })}
                      className={[
                        'rounded-lg border px-5 py-3 text-[14px] font-medium transition',
                        order.strategy === s.id
                          ? 'border-ink bg-white text-ink shadow-sm'
                          : 'border-border bg-white text-muted hover:border-gray-300',
                      ].join(' ')}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Geography
                </div>
                <div className="grid max-w-lg gap-4">
                  <label className="block">
                    <span className="text-[12px] text-muted">Country</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[14px]"
                      value={order.country}
                      readOnly
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-muted">State</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[14px]"
                      value={order.state}
                      onChange={(e) => setOrder({ state: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-muted">Anchor city</span>
                    <input
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[14px]"
                      value={order.city}
                      onChange={(e) => setOrder({ city: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-muted">Search radius (km)</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border border-border px-3 py-2 text-[14px]"
                      value={order.radiusKm}
                      onChange={(e) => setOrder({ radiusKm: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Asset criteria
                </div>
                <div className="flex flex-wrap gap-3">
                  {ASSET_OPTIONS.map((a) => {
                    const on = order.assetTypes.includes(a);
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() =>
                          setOrder({
                            assetTypes: on
                              ? order.assetTypes.filter((x) => x !== a)
                              : [...order.assetTypes, a],
                          })
                        }
                        className={[
                          'rounded-lg border px-5 py-3 text-[14px] font-medium',
                          on ? 'border-ink text-ink' : 'border-border text-muted',
                        ].join(' ')}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Investment parameters
                </div>
                <div className="grid max-w-lg grid-cols-2 gap-4">
                  <label>
                    <span className="text-[12px] text-muted">Ticket min (€)</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border border-border px-3 py-2"
                      value={order.ticketMin}
                      onChange={(e) => setOrder({ ticketMin: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    <span className="text-[12px] text-muted">Ticket max (€)</span>
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border border-border px-3 py-2"
                      value={order.ticketMax}
                      onChange={(e) => setOrder({ ticketMax: Number(e.target.value) })}
                    />
                  </label>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Signals
                </div>
                <div className="flex flex-wrap gap-2">
                  {SIGNAL_OPTIONS.map((s) => {
                    const on = order.signals.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          setOrder({
                            signals: on
                              ? order.signals.filter((x) => x !== s)
                              : [...order.signals, s],
                          })
                        }
                        className={[
                          'rounded-full border px-4 py-2 text-[13px]',
                          on ? 'border-ink bg-gray-50' : 'border-border text-muted',
                        ].join(' ')}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {step === 6 && (
              <div className="text-[15px] leading-relaxed text-muted">
                Review your order in the summary panel. When ready, continue to scan — the catalogue
                will be delivered ranked by match score.
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as OrderStep)}
                  className="rounded-md border border-border px-4 py-2 text-[12px] font-semibold"
                >
                  Back
                </button>
              )}
              {step < 6 ? (
                <PrimaryButton onClick={() => setStep((s) => (s + 1) as OrderStep)}>
                  NEXT <ArrowRight size={14} className="ml-1 inline" />
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Scanning…' : 'START SCAN'}
                </PrimaryButton>
              )}
            </div>
          </Card>
        </div>

        <aside className="w-[300px] shrink-0">
          <Card className="sticky top-8 p-6">
            <div className="mb-6 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
              Order summary
            </div>

            {[
              {
                title: 'STRATEGY',
                body: (
                  <>
                    <div className="text-[12px] text-muted">Selected Thesis</div>
                    <div className="font-semibold">{order.strategyLabel}</div>
                  </>
                ),
              },
              {
                title: 'GEOGRAPHY',
                body: (
                  <>
                    <div className="text-[12px] text-muted">Location</div>
                    <div className="font-semibold">
                      {order.country} · {order.state} · {order.city}
                    </div>
                    <div className="mt-2 text-[12px] text-muted">Search Radius</div>
                    <div className="font-semibold">{order.radiusKm} km radius</div>
                  </>
                ),
              },
              {
                title: 'ASSET CRITERIA',
                body: (
                  <div className="flex flex-wrap gap-2">
                    {order.assetTypes.map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-border bg-gray-50 px-3 py-1 text-[12px]"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                title: 'INVESTMENT PARAMETERS',
                body: (
                  <>
                    <div className="text-[12px] text-muted">Ticket Size</div>
                    <div className="font-semibold">
                      €{(order.ticketMin / 1e6).toFixed(0)}M – €{(order.ticketMax / 1e6).toFixed(0)}M
                    </div>
                  </>
                ),
              },
              {
                title: 'SIGNALS',
                body: (
                  <div className="flex flex-wrap gap-2">
                    {order.signals.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-border px-3 py-1 text-[11px] text-muted"
                      >
                        {s}
                      </span>
                    ))}
                    {order.signals.length > 4 && (
                      <span className="text-[11px] text-muted">+{order.signals.length - 4} more</span>
                    )}
                  </div>
                ),
              },
            ].map((section) => (
              <div key={section.title} className="mb-5 border-b border-border pb-5 last:border-0">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.1em] text-muted">
                    {section.title}
                  </span>
                  <button type="button" className="text-[11px] text-muted hover:text-ink">
                    Edit
                  </button>
                </div>
                {section.body}
              </div>
            ))}

            <div className="rounded-lg bg-tan p-4">
              <div className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                Estimated scan scope
              </div>
              <div className="mt-1 text-[28px] font-semibold">~{scanScope.toLocaleString('de-DE')}</div>
              <p className="mt-2 text-[11px] leading-snug text-muted">
                Estimate recalculates as strategy, geography, asset and signal criteria change.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setStep(6)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-sidebar py-3 text-[12px] font-semibold text-white hover:bg-black"
            >
              CONTINUE TO REVIEW <ArrowRight size={14} />
            </button>
            <button type="button" className="mt-3 w-full text-center text-[12px] text-muted hover:text-ink">
              Save as Draft
            </button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
