import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, PageHeader, TabBar } from '../components/ui/primitives';
import { useApp, estimateScanScope } from '../context/AppContext';
import { submitOrder } from '../api/client';
import {
  ASSET_OPTIONS,
  SIGNAL_OPTIONS,
  STRATEGY_OPTIONS,
  type OrderStep,
  type StrategyId,
} from '../types';

const ACTIVE_ORDERS = [
  {
    name: 'Stuttgart Metro Value-Add',
    thesis: 'Value Add',
    region: 'Stuttgart ±40km',
    ticket: '€2M–€10M',
    matches: 18,
    activity: '+4 new matches · updated 2d ago',
    submitted: 'Submitted 12 days ago',
  },
  {
    name: 'Baden-Württemberg Distressed',
    thesis: 'Distressed',
    region: 'BW ±60km',
    ticket: '€1M–€5M',
    matches: 9,
    activity: 'Scanning · updated 5h ago',
    submitted: 'Submitted 3 days ago',
  },
];

const DRAFT_ORDERS = [
  {
    name: 'Heilbronn Core Residential',
    thesis: 'Core',
    region: 'Heilbronn ±25km',
    ticket: '€3M–€8M',
    saved: 'Saved 2 days ago',
  },
];

const COMPLETED_ORDERS = [
  { name: 'Stuttgart Q1 Value-Add', matches: 24, completed: 'Completed 18 Jun 2026' },
  { name: 'Karlsruhe Mixed-Use Scan', matches: 11, completed: 'Completed 4 Jun 2026' },
  { name: 'Esslingen Residential', matches: 7, completed: 'Completed 22 May 2026' },
];

const STEPS = [
  'Strategy',
  'Geography',
  'Asset Criteria',
  'Investment Parameters',
  'Signals',
  'Review',
];

function ActiveOrdersTable() {
  return (
    <Card className="mt-8 overflow-hidden">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
          <tr>
            <th className="px-6 py-3">Order</th>
            <th className="px-4 py-3">Thesis</th>
            <th className="px-4 py-3">Region</th>
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3">Matches</th>
            <th className="px-4 py-3">Activity</th>
          </tr>
        </thead>
        <tbody>
          {ACTIVE_ORDERS.map((order) => (
            <tr key={order.name} className="border-b border-border last:border-0">
              <td className="px-6 py-5">
                <div className="font-semibold">{order.name}</div>
                <div className="mt-0.5 text-[12px] text-muted">{order.submitted}</div>
              </td>
              <td className="px-4 py-5">{order.thesis}</td>
              <td className="px-4 py-5 text-muted">{order.region}</td>
              <td className="px-4 py-5">{order.ticket}</td>
              <td className="px-4 py-5 font-semibold">{order.matches}</td>
              <td className="px-4 py-5 text-[#2d5a27]">{order.activity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function DraftOrdersTable() {
  return (
    <Card className="mt-8 overflow-hidden">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
          <tr>
            <th className="px-6 py-3">Order</th>
            <th className="px-4 py-3">Thesis</th>
            <th className="px-4 py-3">Region</th>
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {DRAFT_ORDERS.map((order) => (
            <tr key={order.name} className="border-b border-border">
              <td className="px-6 py-5">
                <div className="font-semibold">{order.name}</div>
                <div className="mt-0.5 text-[12px] text-muted">{order.saved}</div>
              </td>
              <td className="px-4 py-5">{order.thesis}</td>
              <td className="px-4 py-5 text-muted">{order.region}</td>
              <td className="px-4 py-5">{order.ticket}</td>
              <td className="px-4 py-5 text-right">
                <button type="button" className="text-[12px] font-semibold text-ink hover:underline">
                  Continue editing →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function CompletedOrdersTable() {
  return (
    <Card className="mt-8 overflow-hidden">
      <table className="w-full text-left text-[13px]">
        <thead className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
          <tr>
            <th className="px-6 py-3">Order</th>
            <th className="px-4 py-3">Matches found</th>
            <th className="px-4 py-3">Completed</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {COMPLETED_ORDERS.map((order) => (
            <tr key={order.name} className="border-b border-border last:border-0">
              <td className="px-6 py-5 font-semibold">{order.name}</td>
              <td className="px-4 py-5 font-semibold">{order.matches}</td>
              <td className="px-4 py-5 text-muted">{order.completed}</td>
              <td className="px-4 py-5 text-right">
                <button type="button" className="text-[12px] font-semibold text-ink hover:underline">
                  View catalogue →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function StepIndicator({ step }: { step: OrderStep }) {
  return (
    <div className="mb-8 flex items-start">
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
                  active || done ? 'bg-lime text-ink' : 'border border-border bg-white text-muted',
                ].join(' ')}
              >
                {n}
              </div>
              <span
                className={[
                  'mt-2 whitespace-nowrap text-[11px]',
                  active ? 'font-semibold text-ink' : 'font-medium text-muted',
                ].join(' ')}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 mb-5 h-px flex-1 ${done ? 'bg-lime' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-border pb-5 last:border-0">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
          {title}
        </span>
        {onEdit && (
          <button type="button" onClick={onEdit} className="text-[11px] font-medium text-lime-muted hover:text-lime">
            Edit
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export function ScoutingOrdersPage() {
  const { order, setOrder } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<OrderStep>(1);
  const [tab, setTab] = useState('new');
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

  function formatTicket(v: number) {
    return v >= 1_000_000 ? `€${(v / 1e6).toFixed(0)}M` : `€${Math.round(v / 1000)}K`;
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Scouting Orders"
        subtitle="Define what kind of hidden opportunity Antberg should search for."
      />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'new', label: 'New Order' },
          { id: 'active', label: 'Active (2)' },
          { id: 'draft', label: 'Draft (1)' },
          { id: 'completed', label: 'Completed (3)' },
        ]}
      />

      {tab === 'active' && <ActiveOrdersTable />}
      {tab === 'draft' && <DraftOrdersTable />}
      {tab === 'completed' && <CompletedOrdersTable />}

      {tab === 'new' && (
      <div className="mt-8 flex gap-8">
        <div className="min-w-0 flex-1">
          <StepIndicator step={step} />

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
                        'rounded-full border px-6 py-2.5 text-[14px] font-medium transition',
                        order.strategy === s.id
                          ? 'border-ink bg-white text-ink'
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
                  Location
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'COUNTRY', key: 'country', ro: true },
                    { label: 'STATE', key: 'state', ro: false },
                    { label: 'ANCHOR CITY', key: 'city', ro: false },
                  ].map((f) => (
                    <label key={f.key} className="block">
                      <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                        {f.label}
                      </span>
                      <input
                        className="mt-1.5 w-full rounded-lg border border-border px-3 py-2.5 text-[14px]"
                        value={order[f.key as keyof typeof order] as string}
                        readOnly={f.ro}
                        onChange={
                          f.ro
                            ? undefined
                            : (e) => setOrder({ [f.key]: e.target.value } as Partial<typeof order>)
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="relative mt-6 flex h-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-tan">
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)',
                    }}
                  />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-muted/40">
                    <div className="h-2 w-2 rounded-full bg-ink" />
                  </div>
                  <span className="absolute right-3 bottom-3 text-[10px] font-semibold tracking-wider text-muted uppercase">
                    Map preview — {order.city} ± {order.radiusKm}km
                  </span>
                </div>
                <label className="mt-6 block">
                  <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                    Search radius — {order.radiusKm} km
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={80}
                    step={5}
                    value={order.radiusKm}
                    onChange={(e) => setOrder({ radiusKm: Number(e.target.value) })}
                    className="mt-2 w-full"
                  />
                </label>
              </>
            )}

            {step === 3 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Asset type
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
                          'rounded-full border px-6 py-2.5 text-[14px] font-medium',
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
                <div className="mb-6 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Ticket size
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <label className="block">
                    <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                      Minimum — {formatTicket(order.ticketMin)}
                    </span>
                    <input
                      type="range"
                      min={500_000}
                      max={20_000_000}
                      step={500_000}
                      value={order.ticketMin}
                      onChange={(e) =>
                        setOrder({
                          ticketMin: Math.min(Number(e.target.value), order.ticketMax - 500_000),
                        })
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                      Maximum — {formatTicket(order.ticketMax)}
                    </span>
                    <input
                      type="range"
                      min={1_000_000}
                      max={50_000_000}
                      step={500_000}
                      value={order.ticketMax}
                      onChange={(e) =>
                        setOrder({
                          ticketMax: Math.max(Number(e.target.value), order.ticketMin + 500_000),
                        })
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <div className="mb-4 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Economic signals
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
                          on ? 'border-ink bg-white text-ink' : 'border-border text-muted',
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
              <>
                <div className="mb-6 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                  Review your scouting order
                </div>
                <div className="divide-y divide-border">
                  {[
                    { label: 'Investment Thesis', value: order.strategyLabel },
                    { label: 'Geography', value: `${order.city}, ${order.radiusKm}km` },
                    { label: 'Asset Types', value: order.assetTypes.join(', ') },
                    {
                      label: 'Ticket Size',
                      value: `${formatTicket(order.ticketMin)} - ${formatTicket(order.ticketMax)}`,
                    },
                    { label: 'Economic Signals', value: `${order.signals.length} Selected` },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-4">
                      <span className="text-[14px] text-muted">{row.label}</span>
                      <span className="text-[14px] font-semibold">{row.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[12px] text-muted">
                  Confirm details above, then start the scan. Results will appear in your Opportunity
                  Catalogue ranked by match score.
                </p>
              </>
            )}

            <div className="mt-8 flex justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as OrderStep)}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-[12px] font-semibold"
                >
                  <ArrowLeft size={14} /> BACK
                </button>
              ) : (
                <span />
              )}
              {step < 6 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as OrderStep)}
                  className="inline-flex items-center gap-2 rounded-md bg-forest px-5 py-2.5 text-[12px] font-semibold text-white"
                >
                  NEXT <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="rounded-md bg-forest px-5 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
                >
                  {submitting ? 'Scanning…' : 'START SCAN'}
                </button>
              )}
            </div>
          </Card>
        </div>

        <aside className="w-[300px] shrink-0">
          <Card className="sticky top-8 p-6">
            <div className="mb-6 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
              Order summary
            </div>

            <SummarySection title="Strategy" onEdit={() => setStep(1)}>
              <div className="text-[12px] text-muted">Selected Thesis</div>
              <div className="font-semibold">{order.strategyLabel}</div>
            </SummarySection>

            <SummarySection title="Geography" onEdit={() => setStep(2)}>
              <div className="text-[12px] text-muted">Location</div>
              <div className="font-semibold">
                {order.country} · {order.state} · {order.city}
              </div>
              <div className="mt-2 text-[12px] text-muted">Search Radius</div>
              <div className="font-semibold">{order.radiusKm} km radius</div>
            </SummarySection>

            <SummarySection title="Asset Criteria" onEdit={() => setStep(3)}>
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
            </SummarySection>

            <SummarySection title="Investment Parameters" onEdit={() => setStep(4)}>
              <div className="text-[12px] text-muted">Ticket Size</div>
              <div className="font-semibold">
                {formatTicket(order.ticketMin)} – {formatTicket(order.ticketMax)}
              </div>
            </SummarySection>

            <SummarySection title="Signals" onEdit={() => setStep(5)}>
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
                  <span className="rounded-full border border-dashed border-border px-3 py-1 text-[11px] text-muted">
                    +{order.signals.length - 4} more
                  </span>
                )}
              </div>
            </SummarySection>

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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-forest py-3 text-[12px] font-semibold text-white hover:bg-ink"
            >
              CONTINUE TO REVIEW <ArrowRight size={14} />
            </button>
            <button type="button" className="mt-3 w-full text-center text-[12px] text-muted hover:text-ink">
              Save as Draft
            </button>
          </Card>
        </aside>
      </div>
      )}
    </div>
  );
}
