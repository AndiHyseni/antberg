import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/primitives';
import { displayCode, fetchCatalog, parseTicketMid, upsideFromDossier } from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, Dossier } from '../types';

const COMPARE_ROWS = [
  { key: 'location', label: 'Location' },
  { key: 'asset_type', label: 'Asset type' },
  { key: 'thesis', label: 'Thesis fit' },
  { key: 'score', label: 'Match score' },
  { key: 'confidence', label: 'Confidence' },
  { key: 'risk', label: 'Overall risk' },
  { key: 'ticket', label: 'Ticket' },
  { key: 'upside', label: 'Value upside' },
  { key: 'play', label: 'Recommended play' },
  { key: 'pressure', label: 'Owner pressure' },
  { key: 'probability', label: 'Acquisition probability' },
  { key: 'source', label: 'Source order' },
  { key: 'updated', label: 'Last updated' },
];

const DEMO_OBJECTS = [
  {
    id: 'A-041',
    code: '#A-041',
    location: 'Stuttgart-Süd',
    asset_type: 'Mixed-Use',
    thesis: 'Value Add',
    score: '87 / 100',
    confidence: 'High',
    risk: 'Low',
    ticket: '€4.6M',
    upside: '+38–45%',
    play: 'Renovation and repositioning',
    pressure: 'Medium',
    probability: '68%',
    source: 'Stuttgart Metro Value-Add',
    updated: '2d ago',
  },
  {
    id: 'B-017',
    code: '#B-017',
    location: 'Karlsruhe',
    asset_type: 'Residential',
    thesis: 'Distressed',
    score: '82 / 100',
    confidence: 'High',
    risk: 'Medium',
    ticket: '€3.1M',
    upside: '+28–35%',
    play: 'Distressed acquisition and hold',
    pressure: 'High',
    probability: '55%',
    source: 'Stuttgart Metro Value-Add',
    updated: '5h ago',
  },
  {
    id: 'A-058',
    code: '#A-058',
    location: 'Stuttgart-Ost',
    asset_type: 'Commercial',
    thesis: 'Repositioning',
    score: '85 / 100',
    confidence: 'Medium',
    risk: 'Low',
    ticket: '€6.4M',
    upside: '+32–40%',
    play: 'Lease-up and repositioning',
    pressure: 'Low',
    probability: '72%',
    source: 'Stuttgart Metro Value-Add',
    updated: '1d ago',
  },
  {
    id: 'C-102',
    code: '#C-102',
    location: 'Heilbronn',
    asset_type: 'Mixed-Use',
    thesis: 'Value Add',
    score: '81 / 100',
    confidence: 'Medium',
    risk: 'Medium',
    ticket: '€4.5M',
    upside: '+25–32%',
    play: 'Value-add renovation',
    pressure: 'Medium',
    probability: '61%',
    source: 'Stuttgart Metro Value-Add',
    updated: '3d ago',
  },
];

function dossierToCompareRow(d: Dossier) {
  const risk = d.score >= 14 ? 'Low' : d.score >= 9 ? 'Medium' : 'High';
  return {
    id: d.object_id,
    code: displayCode(d.object_id),
    location: d.district,
    asset_type: d.asset_type,
    thesis: d.strategy_label,
    score: `${d.score} / 100`,
    confidence: d.score >= 15 ? 'High' : 'Medium',
    risk,
    ticket: parseTicketMid(d.ticket_range),
    upside: upsideFromDossier(d),
    play: d.strategy_fit || 'Renovation and repositioning',
    pressure: 'Medium',
    probability: `${Math.min(95, 50 + d.score)}%`,
    source: 'Stuttgart Metro Value-Add',
    updated: '2d ago',
  };
}

export function ComparePage() {
  const { selection } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    fetchCatalog().then(setCatalog);
  }, []);

  const objects = useMemo(() => {
    const fromCatalog = selection
      .map((id) => catalog?.dossiers[id])
      .filter(Boolean)
      .map((d) => dossierToCompareRow(d as Dossier));

    if (fromCatalog.length >= 2) return fromCatalog.slice(0, 4);
    return DEMO_OBJECTS.slice(0, Math.max(2, selection.length || 4));
  }, [selection, catalog]);

  return (
    <div className="px-8 py-8">
      <Link
        to="/catalogue"
        className="mb-4 inline-block text-[11px] font-semibold tracking-wider text-lime-muted uppercase hover:text-lime"
      >
        ← Back to Opportunity Catalogue
      </Link>

      <PageHeader
        title="Compare Objects"
        subtitle={`${objects.length} of your selected objects, side by side. Values are pre-mandate Antberg estimates.`}
      />

      <div className="overflow-hidden rounded-[16px] bg-card shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div
          className="grid border-b border-border"
          style={{ gridTemplateColumns: `180px repeat(${objects.length}, 1fr)` }}
        >
          <div className="px-6 py-5" />
          {objects.map((obj) => (
            <div key={obj.id} className="border-l border-border px-5 py-5">
              <div className="text-[15px] font-semibold">{obj.code}</div>
              <div className="text-[12px] text-muted">{obj.location}</div>
              <Link
                to={`/analysis/${obj.id}`}
                className="mt-1 inline-block text-[12px] font-semibold text-lime-muted hover:text-lime"
              >
                Open analysis →
              </Link>
            </div>
          ))}
        </div>

        {COMPARE_ROWS.map((row) => (
          <div
            key={row.key}
            className="grid border-b border-border last:border-0"
            style={{ gridTemplateColumns: `180px repeat(${objects.length}, 1fr)` }}
          >
            <div className="px-6 py-4 text-[10px] font-semibold tracking-wider text-muted uppercase">
              {row.label}
            </div>
            {objects.map((obj) => (
              <div
                key={`${row.key}-${obj.id}`}
                className="border-l border-border px-5 py-4 text-[13px]"
              >
                <span
                  className={
                    ['score', 'ticket', 'upside'].includes(row.key) ? 'font-semibold' : ''
                  }
                >
                  {obj[row.key as keyof typeof obj]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
