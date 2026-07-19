import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ChevronDown, Search } from 'lucide-react';
import { Card } from '../components/ui/primitives';
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
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-emerald-500',
  };

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-1 flex items-start justify-between">
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

      <div className="my-4 grid grid-cols-4 gap-2 rounded-lg bg-gray-50 p-3">
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
            <span className={`h-2 w-2 rounded-full ${dotColor[risk === 'low' ? 'low' : risk === 'medium' ? 'medium' : 'high']}`} />
            {risk}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded bg-lime/30 px-2 py-1 text-[10px] font-bold tracking-wide text-ink">
          {strategyTag}
        </span>
        <span className="rounded border border-border px-2 py-1 text-[10px] text-muted">
          {card.leading_signal.split(' ').slice(0, 2).join(' ')}
        </span>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <Link
          to={`/analysis/${card.object_id}`}
          className="text-[12px] font-semibold text-ink hover:underline"
        >
          View Analysis →
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
  const { selection, toggleSelection, isSelected, setCatalogCount } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
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
      if (filter !== 'All' && c.asset_type !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        c.object_id.toLowerCase().includes(q) ||
        c.district.toLowerCase().includes(q) ||
        c.asset_type.toLowerCase().includes(q) ||
        displayCode(c.object_id).toLowerCase().includes(q)
      );
    });
  }, [catalog, filter, query]);

  const scanned = catalog?.context.scanned ?? 100000;
  const detected = catalog?.cards.length ?? 100;
  const highPri = catalog?.cards.filter((c) => c.score >= 15).length ?? 24;
  const avgScore = catalog
    ? Math.round(catalog.cards.reduce((s, c) => s + c.score, 0) / Math.max(1, catalog.cards.length))
    : 87;

  return (
    <div className="px-8 py-8">
      <h1 className="text-[32px] font-semibold tracking-tight">Opportunity Catalogue</h1>
      <p className="mt-1 text-[15px] text-muted">
        The delivered short list — ranked, scored, and matched to your strategy.
      </p>

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
        <div className="relative min-w-[320px] flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by code, location or asset type"
            className="w-full rounded-full border border-border bg-white py-2.5 pl-11 pr-4 text-[13px] outline-none focus:border-ink"
          />
        </div>
        <span className="text-[13px] text-muted">{filtered.length} results</span>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-[12px] font-semibold text-white"
        >
          Sort by: Match Score <ChevronDown size={14} />
        </button>
        <div className="flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setView('cards')}
            className={view === 'cards' ? 'bg-ink px-4 py-2 text-[11px] font-semibold text-white' : 'bg-white px-4 py-2 text-[11px] font-semibold text-muted'}
          >
            CARDS
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            className={view === 'table' ? 'bg-ink px-4 py-2 text-[11px] font-semibold text-white' : 'bg-white px-4 py-2 text-[11px] font-semibold text-muted'}
          >
            TABLE
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['All', 'Mixed-use', 'Residential', 'Commercial', 'Industrial'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f === 'Mixed-use' ? 'Mixed-use' : f)}
            className={[
              'rounded-full px-4 py-1.5 text-[12px] font-medium',
              filter === f || (f === 'Mixed-use' && filter === 'Mixed-use')
                ? 'bg-ink text-white'
                : 'border border-border bg-white text-muted',
            ].join(' ')}
          >
            {f}
          </button>
        ))}
        <button type="button" className="rounded-full border border-border px-4 py-1.5 text-[12px] text-muted">
          All Filters
        </button>
      </div>

      {selection.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-sidebar px-5 py-3 text-white">
          <span className="text-[13px]">
            {selection.length} selected:{' '}
            {selection
              .slice(0, 3)
              .map((id) => displayCode(id))
              .join(', ')}
            {selection.length > 3 ? ` +${selection.length - 3} more` : ''}
          </span>
          <div className="flex gap-2">
            <button type="button" className="rounded border border-white/30 px-3 py-1.5 text-[11px] font-semibold">
              Compare
            </button>
            <button type="button" className="rounded border border-white/30 px-3 py-1.5 text-[11px] font-semibold">
              Save
            </button>
            <Link
              to="/mandate"
              className="rounded bg-white px-3 py-1.5 text-[11px] font-semibold text-ink"
            >
              Add to Mandate →
            </Link>
          </div>
        </div>
      )}

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
        <Card className="mt-6 overflow-hidden">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-gray-50 text-[10px] font-semibold tracking-wider text-muted uppercase">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((card) => (
                <tr key={card.object_id} className="border-b border-border">
                  <td className="px-4 py-3 font-semibold">{displayCode(card.object_id)}</td>
                  <td className="px-4 py-3 text-muted">
                    {card.district} · {card.asset_type}
                  </td>
                  <td className="px-4 py-3 font-semibold">{card.score}</td>
                  <td className="px-4 py-3">{parseTicketMid(card.ticket_range)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/analysis/${card.object_id}`} className="font-semibold hover:underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
