import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, KpiCard, PageHeader, SectionLabel } from '../components/ui/primitives';
import { displayCode, fetchCatalog, parseTicketMid } from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, Dossier } from '../types';

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

    if (fromCatalog.length > 0) {
      return fromCatalog.map((r) => ({
        id: r.object_id,
        code: displayCode(r.object_id),
        location: r.district,
        thesis: r.strategy_label,
        score: r.score,
        ticket: parseTicketMid(r.ticket_range),
        ticketLow: r.ticket_low ?? 0,
        ticketHigh: r.ticket_high ?? 0,
      }));
    }

    return [];
  }, [selection, catalog]);

  const count = rows.length;
  const avgScore = count ? Math.round(rows.reduce((s, r) => s + r.score, 0) / count) : 0;
  const theses = [...new Set(rows.map((r) => r.thesis))].join(' · ');
  const totalTicket = rows.reduce((s, r) => s + (r.ticketLow + r.ticketHigh) / 2, 0);
  const totalTicketLabel =
    totalTicket >= 1_000_000
      ? `€${(totalTicket / 1_000_000).toFixed(1)}M`
      : totalTicket > 0
        ? `€${Math.round(totalTicket / 1000)}K`
        : '—';

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Selected Opportunities"
        subtitle="Chosen opportunities become a generated buy-side contract you sign — one by one or all at once."
      />

      <div className="mb-8 grid grid-cols-4 gap-4">
        <KpiCard value={String(count)} label="SELECTED OPPORTUNITIES" />
        <KpiCard value={totalTicketLabel} label="TOTAL ESTIMATED TICKET" />
        <KpiCard value={count ? String(avgScore) : '—'} label="AVERAGE SCORE" />
        <KpiCard value={count ? `${count} / 0 / 0` : '—'} label="RISK (LOW/MED/HIGH)" />
      </div>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted">
            No objects selected —{' '}
            <Link to="/catalogue" className="font-semibold text-ink underline">
              open catalogue
            </Link>
          </div>
        ) : (
          <>
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
              <span className="text-[12px] text-muted">Investment thesis: {theses || '—'}</span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-2.5 text-[12px] font-semibold text-white"
              >
                PREPARE MANDATE <ArrowRight size={14} />
              </button>
            </div>
          </>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <SectionLabel>Mandate</SectionLabel>
        <p className="text-[14px] leading-relaxed text-muted">
          Once you prepare the mandate, a buy-side contract covering all {count} selected properties
          will be generated here for review and signature.
        </p>
      </Card>
    </div>
  );
}
