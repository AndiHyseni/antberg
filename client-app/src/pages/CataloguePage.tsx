import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, ChevronDown, Search } from 'lucide-react';
import { Card, PageHeader, TabBar } from '../components/ui/primitives';
import {
  displayCode,
  fetchCatalog,
  parseTicketMid,
  upsideFromDossier,
} from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, CatalogCard } from '../types';

function confidenceFromScore(score: number): 'high' | 'medium' | 'low' {
  if (score >= 15) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

function riskFromScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 14) return 'low';
  if (score >= 9) return 'medium';
  return 'high';
}

const UPDATED_LABELS = ['2d ago', '5h ago', '1d ago', '3d ago', '4h ago', '6d ago', '12h ago', '1d ago', '3d ago'];
const SOURCE_ORDERS = [
  'Stuttgart Metro Value-Add',
  'Stuttgart Metro Value-Add',
  'Stuttgart Metro Value-Add',
  'Stuttgart Metro Value-Add',
  'Baden-Württemberg Distressed',
  'Stuttgart Metro Value-Add',
  'Karlsruhe Mixed-Use',
  'Esslingen Residential',
  'Heilbronn Core',
];

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-lime/40 text-forest',
    medium: 'bg-amber-100 text-amber-800',
    low: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles[level]}`}>
      {level === 'high' ? 'HIGH' : level === 'medium' ? 'MEDIUM' : 'LOW'}
    </span>
  );
}

function RiskText({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'text-emerald-600',
    medium: 'text-amber-600',
    high: 'text-red-600',
  };
  return <span className={`text-[12px] font-semibold uppercase ${styles[level]}`}>{level === 'low' ? 'LOW' : level === 'medium' ? 'MEDIUM' : 'HIGH'}</span>;
}

function StatusBadge({
  status,
}: {
  status: 'selected' | 'saved' | 'not_reviewed';
}) {
  if (status === 'selected') {
    return (
      <span className="rounded bg-lime px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-ink uppercase">
        Selected
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="rounded bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
        Saved
      </span>
    );
  }
  return (
    <span className="rounded border border-border bg-gray-50 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
      Not reviewed
    </span>
  );
}

function OpportunityTable({
  cards,
  catalog,
  isSelected,
  toggleSelection,
}: {
  cards: CatalogCard[];
  catalog: Catalog;
  isSelected: (id: string) => boolean;
  toggleSelection: (id: string) => void;
}) {
  return (
    <Card className="mt-6 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left text-[13px]">
          <thead className="border-b border-border bg-gray-50/80 text-[10px] font-semibold tracking-wider text-muted uppercase">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Location</th>
              <th className="px-3 py-3">Asset type</th>
              <th className="px-3 py-3">Thesis fit</th>
              <th className="px-3 py-3">
                Score <span className="text-ink">↓</span>
              </th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Ticket</th>
              <th className="px-3 py-3">Risk</th>
              <th className="px-3 py-3">Updated</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {cards.map((card, i) => {
              const dossier = catalog.dossiers[card.object_id];
              const selected = isSelected(card.object_id);
              const conf = confidenceFromScore(card.score);
              const risk = riskFromScore(card.score);
              const thesis = dossier?.strategy_label ?? 'Value Add';
              const status = selected
                ? ('selected' as const)
                : i === 4
                  ? ('saved' as const)
                  : ('not_reviewed' as const);

              return (
                <tr
                  key={card.object_id}
                  className={[
                    'border-b border-border transition-colors',
                    selected ? 'bg-lime/8' : 'hover:bg-gray-50/50',
                  ].join(' ')}
                >
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => toggleSelection(card.object_id)}
                      className={[
                        'flex h-4 w-4 items-center justify-center rounded border transition',
                        selected ? 'border-lime bg-lime text-ink' : 'border-gray-300 bg-white',
                      ].join(' ')}
                    >
                      {selected && <Check size={10} strokeWidth={3} />}
                    </button>
                  </td>
                  <td className="px-3 py-4 font-semibold">{displayCode(card.object_id)}</td>
                  <td className="px-3 py-4">
                    <div className="font-semibold">{card.district}</div>
                    <div className="text-[12px] text-muted">
                      {SOURCE_ORDERS[i] ?? 'Stuttgart Metro Value-Add'}
                    </div>
                  </td>
                  <td className="px-3 py-4">{card.asset_type}</td>
                  <td className="px-3 py-4">{thesis}</td>
                  <td className="px-3 py-4 text-[15px] font-semibold">{card.score}</td>
                  <td className="px-3 py-4">
                    <ConfidenceBadge level={conf} />
                  </td>
                  <td className="px-3 py-4 font-medium">{parseTicketMid(card.ticket_range)}</td>
                  <td className="px-3 py-4">
                    <RiskText level={risk} />
                  </td>
                  <td className="px-3 py-4 text-muted">{UPDATED_LABELS[i] ?? '2d ago'}</td>
                  <td className="px-3 py-4">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      to={`/analysis/${card.object_id}`}
                      className="text-[12px] font-semibold text-ink underline underline-offset-2 hover:text-forest"
                    >
                      Analysis
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function OpportunityCard({
  card,
  catalog,
  selected,
  onToggle,
}: {
  card: CatalogCard;
  catalog: Catalog;
  selected: boolean;
  onToggle: () => void;
}) {
  const dossier = catalog.dossiers[card.object_id];
  const code = displayCode(card.object_id);
  const conf = confidenceFromScore(card.score);
  const risk = card.score >= 14 ? 'low' : card.score >= 9 ? 'medium' : 'high';
  const upside = dossier ? upsideFromDossier(dossier) : '—';
  const strategyTag = dossier?.strategy_label?.toUpperCase() ?? 'VALUE ADD';

  const dotColor = {
    high: 'bg-emerald-500',
    medium: 'bg-amber-500',
    low: 'bg-red-500',
  };

  return (
    <Card className={`flex flex-col p-5 ${selected ? 'ring-1 ring-lime/50' : ''}`}>
      <div className="mb-2 flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition',
            selected ? 'border-lime bg-lime text-ink' : 'border-border bg-white',
          ].join(' ')}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[15px] font-semibold">{code}</div>
              <div className="text-[12px] text-muted">
                {card.district} · {card.asset_type}
              </div>
            </div>
            <div className="text-right">
              <Bookmark size={14} className="ml-auto text-muted" />
              <div className="text-[22px] font-semibold leading-none">{card.score}</div>
              <div className="text-[9px] font-semibold tracking-widest text-muted">SCORE</div>
            </div>
          </div>
          {selected && (
            <span className="mt-2 inline-block rounded bg-lime px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink">
              SELECTED
            </span>
          )}
        </div>
      </div>

      <div className="my-4 grid grid-cols-4 gap-2 rounded-lg bg-gray-50/80 p-3">
        <div>
          <div className="text-[9px] font-semibold tracking-wider text-muted">TICKET</div>
          <div className="text-[14px] font-semibold">{parseTicketMid(card.ticket_range)}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold tracking-wider text-muted">UPSIDE</div>
          <div className="text-[14px] font-semibold">{upside}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold tracking-wider text-muted">CONFIDENCE</div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium capitalize">
            <span className={`h-2 w-2 rounded-full ${dotColor[conf]}`} />
            {conf}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-semibold tracking-wider text-muted">RISK</div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium capitalize">
            <span
              className={`h-2 w-2 rounded-full ${dotColor[risk === 'low' ? 'low' : risk === 'medium' ? 'medium' : 'high']}`}
            />
            {risk}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded bg-lime/50 px-2 py-1 text-[10px] font-bold tracking-wide text-ink">
          {strategyTag}
        </span>
        <span className="rounded border border-border px-2 py-1 text-[10px] text-muted">
          {card.leading_signal.split(' ').slice(0, 2).join(' ')}
        </span>
        <span className="rounded border border-dashed border-border px-2 py-1 text-[10px] text-muted">
          +1 more
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <Link
          to={`/analysis/${card.object_id}`}
          className="text-[12px] font-semibold text-ink hover:underline"
        >
          View Full Analysis →
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className={[
            'rounded-md px-4 py-2 text-[12px] font-semibold',
            selected
              ? 'bg-ink text-white'
              : 'border border-border bg-white text-ink hover:bg-gray-50',
          ].join(' ')}
        >
          {selected ? '✓ Selected' : 'Select'}
        </button>
      </div>
    </Card>
  );
}

export function CataloguePage() {
  const { selection, toggleSelection, isSelected, clearSelection, setCatalogCount } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchCatalog().then((c) => {
      setCatalog(c);
      setCatalogCount(c.cards.length);
    });
  }, [setCatalogCount]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    return catalog.cards.filter((c) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        c.object_id.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.asset_type.toLowerCase().includes(q) ||
        displayCode(c.object_id).toLowerCase().includes(q)
      );
    });
  }, [catalog, query]);

  const total = catalog?.cards.length ?? 0;
  const scanned = catalog?.context.scanned ?? 100000;
  const detected = catalog?.cards.length ?? 100;
  const highPri = catalog?.cards.filter((c) => c.score >= 15).length ?? 24;
  const avgScore = catalog
    ? Math.round(catalog.cards.reduce((s, c) => s + c.score, 0) / Math.max(1, catalog.cards.length))
    : 87;

  return (
    <div className={`px-8 py-8 ${selection.length > 0 ? 'pb-28' : ''}`}>
      <PageHeader
        title="Opportunity Catalogue"
        subtitle="The delivered short list — ranked, scored, and matched to your strategy."
      />

      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'all', label: `All Objects (${total || 9})` },
          { id: 'new', label: 'New / Unreviewed (3)' },
          { id: 'rejected', label: 'Rejected (0)' },
        ]}
      />

      <Card className="mt-6 grid grid-cols-4 divide-x divide-border py-5">
        {[
          { n: scanned.toLocaleString('de-DE'), l: 'OBJECTS SCANNED' },
          { n: String(detected), l: 'OPPORTUNITIES DETECTED' },
          { n: String(highPri), l: 'HIGH-PRIORITY' },
          { n: String(avgScore), l: 'AVG. MATCH SCORE' },
        ].map((s) => (
          <div key={s.l} className="px-6 text-center">
            <div className="text-[22px] font-semibold">{s.n}</div>
            <div className="mt-1 text-[10px] font-semibold tracking-[0.08em] text-muted">{s.l}</div>
          </div>
        ))}
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="relative min-w-[280px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, location or asset type"
            className="w-full rounded-full border border-border bg-white py-2.5 pl-11 pr-4 text-[13px] outline-none focus:border-ink"
          />
        </div>
        <span className="text-[13px] text-muted">
          Showing {filtered.length} of {total || filtered.length} objects
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 text-[12px] font-semibold text-white"
        >
          Sort by: Match Score <ChevronDown size={14} />
        </button>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView('cards')}
            className={
              view === 'cards'
                ? 'bg-forest px-4 py-2 text-[11px] font-semibold text-white'
                : 'bg-white px-4 py-2 text-[11px] font-semibold text-muted'
            }
          >
            CARDS
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={
              view === 'table'
                ? 'bg-forest px-4 py-2 text-[11px] font-semibold text-white'
                : 'bg-white px-4 py-2 text-[11px] font-semibold text-muted'
            }
          >
            TABLE
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Filter</span>
        {['Asset type', 'Thesis fit', 'Risk', 'Confidence'].map((f) => (
          <button
            key={f}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-4 py-1.5 text-[12px] text-muted"
          >
            {f} <ChevronDown size={12} />
          </button>
        ))}
      </div>

      {catalog && view === 'cards' && (
        <div className="mt-6 grid grid-cols-2 gap-5">
          {filtered.map((card) => (
            <OpportunityCard
              key={card.object_id}
              card={card}
              catalog={catalog}
              selected={isSelected(card.object_id)}
              onToggle={() => toggleSelection(card.object_id)}
            />
          ))}
        </div>
      )}

      {catalog && view === 'table' && (
        <OpportunityTable
          cards={filtered}
          catalog={catalog}
          isSelected={isSelected}
          toggleSelection={toggleSelection}
        />
      )}

      {selection.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-320px)] max-w-5xl -translate-x-1/2 items-center justify-between rounded-xl bg-sidebar px-6 py-4 text-white shadow-xl">
          <div>
            <div className="text-[14px] font-semibold">{selection.length} objects selected</div>
            <div className="mt-1 text-[11px] text-white/50">
              {selection
                .slice(0, 4)
                .map((id) => {
                  const card = catalog?.cards.find((c) => c.object_id === id);
                  return `${displayCode(id)}${card ? ` · ${card.district}` : ''}`;
                })
                .join('   ')}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-md border border-white/30 px-4 py-2 text-[12px] font-semibold text-white hover:bg-white/10"
            >
              Clear Selection
            </button>
            <Link
              to="/compare"
              className="rounded-md bg-white px-4 py-2 text-[12px] font-semibold text-ink"
            >
              Compare Selected
            </Link>
            <Link
              to="/mandate"
              className="rounded-md bg-forest px-4 py-2 text-[12px] font-semibold text-white"
            >
              Add {selection.length} to Mandate →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
