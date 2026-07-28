import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, KpiCard, PageHeader, SectionLabel } from '../components/ui/primitives';
import { displayCode, fetchCatalog, parseTicketMid } from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, Dossier } from '../types';

const DEMO_ROWS = [
  { id: 'A-041', location: 'Stuttgart-Süd', thesis: 'Value Add', score: 87, ticket: '€4.6M' },
  { id: 'B-017', location: 'Karlsruhe', thesis: 'Distressed', score: 82, ticket: '€3.1M' },
  { id: 'A-058', location: 'Stuttgart-Ost', thesis: 'Repositioning', score: 85, ticket: '€6.4M' },
  { id: 'C-102', location: 'Heilbronn', thesis: 'Value Add', score: 81, ticket: '€4.5M' },
];

export function MandatePage() {
  const { selection, toggleSelection } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    fetchCatalog().then(setCatalog);
  }, []);

  const rows = useMemo(() => {
    const fromCatalog = selection
      .map((id) => catalog?.dossiers[id])
      .filter(Boolean) as Dossier[];

    if (fromCatalog.length >= 2) {
      return fromCatalog.map((r) => ({
        id: r.object_id,
        code: displayCode(r.object_id),
        location: r.district,
        thesis: r.strategy_label,
        score: r.score,
        ticket: parseTicketMid(r.ticket_range),
      }));
    }

    return DEMO_ROWS.map((r) => ({
      id: r.id,
      code: `#${r.id}`,
      location: r.location,
      thesis: r.thesis,
      score: r.score,
      ticket: r.ticket,
    }));
  }, [selection, catalog]);

  const count = rows.length;
  const avgScore = count ? Math.round(rows.reduce((s, r) => s + r.score, 0) / count) : 0;
  const theses = [...new Set(rows.map((r) => r.thesis))].join(' · ');

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Selected Opportunities"
        subtitle="Chosen opportunities become a generated buy-side contract you sign — one by one or all at once."
      />

      <div className="mb-8 grid grid-cols-4 gap-4">
        <KpiCard value={String(count)} label="SELECTED OPPORTUNITIES" />
        <KpiCard value="€18.6M" label="TOTAL ESTIMATED TICKET" />
        <KpiCard value={String(avgScore || 84)} label="AVERAGE SCORE" />
        <KpiCard value="2 / 2 / 0" label="RISK (LOW/MED/HIGH)" />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Thesis</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Ticket</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border">
                <td className="px-6 py-4 font-semibold">{r.code}</td>
                <td className="px-4 py-4">{r.location}</td>
                <td className="px-4 py-4">{r.thesis}</td>
                <td className="px-4 py-4 font-semibold">{r.score}</td>
                <td className="px-4 py-4">{r.ticket}</td>
                <td className="px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSelection(r.id)}
                    className="text-[12px] font-medium text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-[12px] text-muted">Investment thesis: {theses}</span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[12px] font-semibold text-white"
          >
            PREPARE MANDATE <ArrowRight size={14} />
          </button>
        </div>
      </Card>

      <Card className="mt-6 p-6">
        <SectionLabel>Mandate</SectionLabel>
        <p className="text-[14px] leading-relaxed text-muted">
          Once you prepare the mandate, a buy-side contract covering all {count} selected properties
          will be generated here for review and signature.
        </p>
        {rows.length === 0 && (
          <p className="mt-4 text-[13px]">
            No objects selected —{' '}
            <Link to="/catalogue" className="font-semibold text-ink underline">
              open catalogue
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}
