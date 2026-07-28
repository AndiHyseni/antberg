import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Card, SectionLabel } from '../components/ui/primitives';
import {
  displayCode,
  fetchCatalog,
  parseTicketMid,
  upsideFromDossier,
} from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, Dossier } from '../types';

const TABS = [
  'Value Upside',
  'Unused Potential',
  'Signals & Risks',
  'Deal Parameters',
  'Property',
  'Confidence',
];

function utilizationPct(d: Dossier): number {
  if (!d.allowed_gfa || !d.built_gfa) return 73;
  return Math.round((d.built_gfa / d.allowed_gfa) * 100);
}

export function AnalysisPage() {
  const { objectId = '' } = useParams();
  const navigate = useNavigate();
  const { isSelected, toggleSelection } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState('Value Upside');

  useEffect(() => {
    fetchCatalog().then(setCatalog);
  }, []);

  const cardIndex = useMemo(
    () => catalog?.cards.findIndex((c) => c.object_id === objectId) ?? 0,
    [catalog, objectId]
  );

  const dossier = catalog?.dossiers[objectId];
  const selected = isSelected(objectId);

  if (!dossier || !catalog) {
    return (
      <div className="px-8 py-8">
        <p className="text-muted">Loading analysis…</p>
      </div>
    );
  }

  const code = displayCode(objectId);
  const util = utilizationPct(dossier);
  const upside = upsideFromDossier(dossier);
  const gfaHeadroom =
    dossier.allowed_gfa && dossier.built_gfa
      ? dossier.allowed_gfa - dossier.built_gfa
      : 990;

  const prevId = catalog.cards[cardIndex - 1]?.object_id;
  const nextId = catalog.cards[cardIndex + 1]?.object_id;

  return (
    <div className="min-h-screen pb-28">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-white px-6 py-4">
        <button
          type="button"
          onClick={() => navigate('/catalogue')}
          className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-wide text-muted uppercase hover:text-ink"
        >
          <X size={16} /> Close
        </button>
        <div className="text-[15px] font-semibold">
          {code} {dossier.asset_type} · {dossier.district}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && navigate(`/analysis/${prevId}`)}
              className="disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {cardIndex + 1} of {catalog.cards.length}
            </span>
            <button
              type="button"
              disabled={!nextId}
              onClick={() => nextId && navigate(`/analysis/${nextId}`)}
              className="disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {dossier.score >= 15 && (
            <span className="rounded bg-lime px-3 py-1 text-[10px] font-bold tracking-wide text-ink">
              HIGH PRIORITY
            </span>
          )}
        </div>
      </div>

      <div className="bg-sidebar px-8 py-8 text-white">
        <div className="flex items-start justify-between gap-8">
          <div className="max-w-2xl">
            <div className="text-[10px] font-semibold tracking-[0.14em] text-lime uppercase">
              Antberg recommendation
            </div>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight">
              Pursue — priority acquisition
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-white/70">
              {dossier.strategy_fit}
            </p>
          </div>
          <div className="flex shrink-0 gap-8 text-right">
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                Conviction
              </div>
              <div className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-[11px] font-bold">
                HIGH
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                Match score
              </div>
              <div className="mt-1 text-[28px] font-semibold leading-none">{dossier.score}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-white/50 uppercase">
                Data as of
              </div>
              <div className="mt-1 text-[13px]">updated 2d ago</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-white px-8">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'py-4 text-[13px] font-medium',
                tab === t ? 'border-b-2 border-ink text-ink' : 'text-muted hover:text-ink',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6 px-8 py-6">
        {(tab === 'Value Upside' || tab === 'Overview') && (
          <>
            <Card className="p-6">
              <SectionLabel>The opportunity — value upside</SectionLabel>
              <div className="flex items-start gap-4">
                <div className="text-[42px] font-semibold leading-none text-[#2d5a27]">{upside}</div>
                <div>
                  <div className="text-[13px] text-muted">value upside after optimization</div>
                  <span className="mt-1 inline-block rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted">
                    ANTBERG ESTIMATE
                  </span>
                </div>
              </div>
              <p className="mt-4 text-[14px] text-muted">
                {dossier.values.today_label} today → {dossier.values.after_label} after optimization
              </p>

              <div className="relative mt-8 h-16">
                <div className="absolute inset-x-0 top-6 h-2 rounded-full bg-gray-200" />
                <div className="absolute top-4 left-[15%] h-6 w-0.5 bg-ink" />
                <div className="absolute top-4 right-[20%] h-6 w-0.5 bg-lime" />
                <div className="absolute top-[18px] left-[25%] right-[30%] h-2 rounded-full bg-ink/80" />
                <div className="absolute top-10 left-[15%] text-[11px] font-medium">
                  {dossier.values.today_label}
                </div>
                <div className="absolute top-10 right-[20%] text-[11px] font-medium text-[#2d5a27]">
                  {dossier.values.after_label}
                </div>
              </div>
              <div className="mt-8 flex gap-6 text-[11px] text-muted">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-ink" /> Offer corridor (entry)
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-lime" /> Value creation range (exit)
                </span>
              </div>

              <div className="mt-8 space-y-3 border-t border-border pt-6">
                {dossier.weakness_upside.slice(0, 3).map((pair, i) => (
                  <div key={i} className="flex items-center gap-3 text-[13px]">
                    <span className="font-medium">{pair.weakness.split('.')[0]}</span>
                    <span className="text-muted">→</span>
                    <span className="text-muted">{pair.upside.split('.')[0]}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {(tab === 'Unused Potential' || tab === 'Value Upside') && (
          <Card className="p-6">
            <SectionLabel>Unused potential — why it exists</SectionLabel>
            <div className="grid grid-cols-[1fr_120px_1fr] items-end gap-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Utilization today
                </div>
                <div className="text-[28px] font-semibold">{util}%</div>
                <div className="mt-2 h-24 rounded-lg bg-gray-100" style={{ width: `${util}%`, maxWidth: '100%' }} />
              </div>
              <div className="rounded-lg bg-lime/40 p-4 text-center">
                <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                  GFA headroom
                </div>
                <div className="mt-1 text-[22px] font-semibold text-[#2d5a27]">
                  +{gfaHeadroom.toLocaleString('de-DE')} m²
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Permitted capacity
                </div>
                <div className="text-[28px] font-semibold">{Math.min(95, util + 22)}%</div>
                <div
                  className="mt-2 h-24 rounded-lg bg-lime/30"
                  style={{ width: `${Math.min(95, util + 22)}%`, maxWidth: '100%' }}
                />
              </div>
            </div>
          </Card>
        )}

        {tab === 'Property' && (
          <Card className="p-6">
            <SectionLabel>Property snapshot</SectionLabel>
            <div className="grid grid-cols-4 gap-6 text-[13px]">
              {[
                ['PARCEL AREA', `${dossier.parcel_m2.toLocaleString('de-DE')} m²`],
                ['LAND USE', dossier.land_use ?? '—'],
                ['BUILT GFA', dossier.built_gfa ? `${dossier.built_gfa} m²` : '—'],
                ['ALLOWED GFA', dossier.allowed_gfa ? `${dossier.allowed_gfa} m²` : '—'],
                ['TICKET', parseTicketMid(dossier.ticket_range)],
                ['STRATEGY', dossier.strategy_label],
                ['ASSET TYPE', dossier.asset_type],
                ['DISTRICT', dossier.district],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[10px] font-semibold tracking-wider text-muted">{k}</div>
                  <div className="mt-1 font-medium">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {(tab === 'Signals & Risks' || tab === 'Confidence') && (
          <Card className="divide-y divide-border">
            {dossier.risks.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div>
                  <div className="text-[13px] font-semibold">{r.label}</div>
                </div>
                <span
                  className={[
                    'rounded px-2 py-0.5 text-[10px] font-bold uppercase',
                    r.severity === 'low'
                      ? 'bg-lime/40 text-forest'
                      : r.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700',
                  ].join(' ')}
                >
                  {r.severity}
                </span>
              </div>
            ))}
          </Card>
        )}

        {tab === 'Deal Parameters' && (
          <Card className="p-6">
            <SectionLabel>Deal parameters</SectionLabel>
            <div className="grid grid-cols-3 gap-6 text-[13px]">
              <div>
                <div className="text-[10px] text-muted">RECOMMENDED OFFER</div>
                <div className="mt-1 text-[18px] font-semibold">{dossier.ticket_range}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted">CURRENT VALUE</div>
                <div className="mt-1 text-[18px] font-semibold">{dossier.values.today_label}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted">UPSIDE RANGE</div>
                <div className="mt-1 text-[18px] font-semibold">{dossier.values.upside_range}</div>
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-[260px] right-0 z-30 border-t border-border bg-white px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            {selected && <Check size={16} className="text-forest" />}
            {selected ? 'Selected' : 'Not selected'}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md bg-lime px-5 py-2.5 text-[12px] font-semibold text-ink hover:bg-lime-soft"
            >
              REQUEST DEEPER EVALUATION
            </button>
            <Link
              to="/mandate"
              className="rounded-md border border-ink px-5 py-2.5 text-[12px] font-semibold text-ink hover:bg-gray-50"
            >
              CONTINUE TO SELECTED
            </Link>
            <button
              type="button"
              onClick={() => toggleSelection(objectId)}
              className="rounded-md border border-red-200 px-5 py-2.5 text-[12px] font-semibold text-red-500 hover:bg-red-50"
            >
              {selected ? 'REMOVE FROM SELECTED' : 'ADD TO SELECTED'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
