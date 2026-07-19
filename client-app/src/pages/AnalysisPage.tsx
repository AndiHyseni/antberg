import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Card, SectionLabel, StatusPill } from '../components/ui/primitives';
import {
  displayCode,
  fetchCatalog,
  parseTicketMid,
  upsideFromDossier,
} from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, Dossier } from '../types';

const TABS = ['Overview', 'Signals', 'Development', 'Financials', 'Risks', 'Decision'];

function utilizationPct(d: Dossier): number {
  if (!d.allowed_gfa || !d.built_gfa) return 63;
  return Math.round((d.built_gfa / d.allowed_gfa) * 100);
}

export function AnalysisPage() {
  const { objectId = '' } = useParams();
  const { isSelected, toggleSelection } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [tab, setTab] = useState('Overview');

  useEffect(() => {
    fetchCatalog().then(setCatalog);
  }, []);

  const dossier = catalog?.dossiers[objectId];
  const selected = isSelected(objectId);

  if (!dossier) {
    return (
      <div className="px-8 py-8">
        <p>Loading analysis…</p>
      </div>
    );
  }

  const code = displayCode(objectId);
  const util = utilizationPct(dossier);
  const upside = upsideFromDossier(dossier);
  const price = parseTicketMid(dossier.ticket_range);

  return (
    <div className="px-8 py-8 pb-32">
      <Link
        to="/catalogue"
        className="mb-4 inline-flex items-center gap-2 text-[13px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft size={16} />
        Back to Opportunity Catalogue
      </Link>

      <div className="flex items-start justify-between">
        <h1 className="text-[26px] font-semibold">
          {code} {dossier.asset_type} – {dossier.district.split('·')[0]?.trim()}
        </h1>
        {dossier.score >= 15 && (
          <span className="rounded bg-lime/40 px-3 py-1 text-[11px] font-bold tracking-wide text-ink">
            HIGH PRIORITY
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-6 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'pb-3 text-[13px] font-medium',
              tab === t ? 'border-b-2 border-lime text-ink' : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {t}
          </button>
        ))}
      </div>

      <Card className="mt-6 grid grid-cols-[140px_1fr] gap-6 p-6">
        <div className="border-r border-border pr-6">
          <div className="text-[48px] font-semibold leading-none">{dossier.score}</div>
          <div className="mt-1 text-[11px] font-semibold tracking-wider text-muted">
            INVESTMENT SCORE
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {[
            { l: 'INVESTMENT THEME', v: dossier.strategy_label },
            { l: 'PRICE', v: price },
            { l: 'TURNAROUND', v: dossier.score >= 14 ? 'High' : 'Medium' },
            { l: 'OVERALL RISK', v: dossier.risks[0]?.severity === 'high' ? 'Medium' : 'Low' },
            { l: 'EST. UPSIDE', v: upside },
          ].map((item) => (
            <div key={item.l}>
              <div className="text-[10px] font-semibold tracking-wider text-muted">{item.l}</div>
              <div className="mt-1 text-[15px] font-semibold">{item.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <SectionLabel>Executive summary</SectionLabel>
        <p className="text-[14px] leading-relaxed text-muted">{dossier.strategy_fit}</p>
      </Card>

      <Card className="mt-4 p-6">
        <SectionLabel>Property snapshot</SectionLabel>
        <div className="grid grid-cols-4 gap-6 text-[13px]">
          {[
            ['PARCEL AREA', `${dossier.parcel_m2.toLocaleString('de-DE')} m²`],
            ['LAND USE', dossier.land_use ?? '—'],
            ['BUILT GFA', dossier.built_gfa ? `${dossier.built_gfa} m²` : '—'],
            ['ALLOWED GFA', dossier.allowed_gfa ? `${dossier.allowed_gfa} m²` : '—'],
            ['UTILIZATION', `${util}%`],
            ['ZONING CAPACITY', dossier.allowed_gfa ? `${Math.round((dossier.allowed_gfa / dossier.parcel_m2) * 100) / 100} GFZ proxy` : '—'],
            ['ASSET TYPE', dossier.asset_type],
            ['DATA GAPS', String(dossier.data_gaps.length)],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] font-semibold tracking-wider text-muted">{k}</div>
              <div className="mt-1 font-medium">{v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4 divide-y divide-border p-0">
        <div className="px-6 py-4">
          <SectionLabel>Signal intelligence</SectionLabel>
        </div>
        {dossier.weakness_upside.map((pair, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-[13px] font-semibold">{pair.weakness.slice(0, 40)}…</div>
              <div className="mt-1 text-[12px] text-muted">{pair.upside.slice(0, 80)}…</div>
            </div>
            <StatusPill
              label={i === 0 ? 'HIGH' : i === 1 ? 'MEDIUM' : 'LOW'}
              level={i === 0 ? 'high' : i === 1 ? 'medium' : 'low'}
            />
          </div>
        ))}
      </Card>

      <Card className="mt-4 p-6">
        <SectionLabel>Development potential</SectionLabel>
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-[12px]">
            <span>Current utilization</span>
            <span className="font-semibold">{util}%</span>
          </div>
          <div className="h-2 rounded-full bg-tan">
            <div className="h-full rounded-full bg-ink" style={{ width: `${util}%` }} />
          </div>
        </div>
        <div className="mb-6">
          <div className="mb-1 flex justify-between text-[12px]">
            <span>Permitted capacity</span>
            <span className="font-semibold">{Math.min(95, util + 22)}%</span>
          </div>
          <div className="h-2 rounded-full bg-tan">
            <div
              className="h-full rounded-full bg-lime-soft"
              style={{ width: `${Math.min(95, util + 22)}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 text-[13px]">
          <div>
            <div className="text-[10px] text-muted">BUILT GFA</div>
            <div className="font-semibold">{dossier.built_gfa ?? '—'} m²</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">MAX POTENTIAL GFA</div>
            <div className="font-semibold">{dossier.allowed_gfa ?? '—'} m²</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">GFA UPSIDE</div>
            <div className="font-semibold">{upside}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">RECOMMENDED SCENARIO</div>
            <div className="font-semibold">Renovation + densification</div>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <SectionLabel>Financial potential</SectionLabel>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-[10px] text-muted">CURRENT VALUE</div>
            <div className="text-[18px] font-semibold">{dossier.values.today_label}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">AFTER OPTIMIZATION</div>
            <div className="text-[18px] font-semibold">{dossier.values.after_label}</div>
          </div>
          <div>
            <div className="text-[10px] text-muted">UPSIDE RANGE</div>
            <div className="text-[18px] font-semibold">{dossier.values.upside_range}</div>
          </div>
        </div>
        <div className="mt-6 space-y-3 border-t border-border pt-4 text-[13px]">
          <div className="flex justify-between">
            <span className="text-muted">Recommended offer range</span>
            <span className="font-semibold">{dossier.ticket_range}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Valuation confidence</span>
            <StatusPill label="HIGH" level="high" />
          </div>
        </div>
      </Card>

      <Card className="mt-4 divide-y divide-border">
        {dossier.risks.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4">
            <div>
              <div className="text-[13px] font-semibold">Risk factor {i + 1}</div>
              <div className="mt-1 text-[12px] text-muted">{r.label}</div>
            </div>
            <StatusPill label={r.severity.toUpperCase()} level={r.severity} />
          </div>
        ))}
      </Card>

      <Card className="mt-4 p-6">
        <div className="mb-2 text-[11px] font-semibold tracking-wider text-muted">
          DATA CONFIDENCE
        </div>
        <div className="mb-2 flex justify-between text-[12px]">
          <span>Data completeness</span>
          <span>{Math.max(55, 100 - dossier.data_gaps.length * 8)}%</span>
        </div>
        <div className="h-2 rounded-full bg-tan">
          <div
            className="h-full rounded-full bg-ink"
            style={{ width: `${Math.max(55, 100 - dossier.data_gaps.length * 8)}%` }}
          />
        </div>
        {dossier.data_gaps.length > 0 && (
          <p className="mt-3 text-[12px] text-red-600">
            Missing: {dossier.data_gaps.join(', ')}
          </p>
        )}
      </Card>

      <div className="fixed bottom-0 left-[260px] right-0 z-30 border-t border-border bg-white/95 px-8 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-medium">
            {selected && <Check size={16} className="text-emerald-600" />}
            {selected ? 'Selected' : 'Not selected'}
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/mandate"
              className="rounded-md bg-sidebar px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-black"
            >
              CONTINUE TO SELECTED & MANDATE
            </Link>
            <button type="button" className="text-[12px] font-semibold text-muted hover:text-ink">
              REQUEST DEEPER EVALUATION
            </button>
            <button
              type="button"
              onClick={() => toggleSelection(objectId)}
              className="text-[12px] font-semibold text-red-600 hover:text-red-700"
            >
              {selected ? 'REMOVE FROM SELECTED' : 'ADD TO SELECTED'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
