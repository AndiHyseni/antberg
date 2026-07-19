import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Card, SectionLabel } from '../components/ui/primitives';
import { displayCode, fetchCatalog } from '../api/client';
import { useApp } from '../context/AppContext';
import type { Catalog, Dossier } from '../types';

export function MandatePage() {
  const { selection, toggleSelection } = useApp();
  const [catalog, setCatalog] = useState<Catalog | null>(null);

  useEffect(() => {
    fetchCatalog().then(setCatalog);
  }, []);

  const rows = selection
    .map((id) => catalog?.dossiers[id])
    .filter(Boolean) as Dossier[];

  const totalLow = rows.reduce((s, r) => s + r.ticket_low, 0);
  const totalHigh = rows.reduce((s, r) => s + r.ticket_high, 0);

  return (
    <div className="px-8 py-8">
      <h1 className="text-[32px] font-semibold">Selected & Mandate</h1>
      <p className="mt-1 text-[15px] text-muted">
        {rows.length} object(s) · €{Math.round(totalLow / 1e6)}M – €{Math.round(totalHigh / 1e6)}M estimated ticket
      </p>

      <Card className="mt-6 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-gray-50 text-[10px] font-semibold tracking-wider text-muted uppercase">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Score</th>
              <th className="px-4 py-3 text-left">Ticket</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.object_id} className="border-b border-border">
                  <td className="px-4 py-3 font-semibold">{displayCode(r.object_id)}</td>
                  <td className="px-4 py-3">{r.district}</td>
                  <td className="px-4 py-3">{r.score}</td>
                  <td className="px-4 py-3">{r.ticket_range}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSelection(r.object_id)}
                      className="text-muted hover:text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No objects selected —{' '}
                  <Link to="/catalogue" className="font-semibold text-ink underline">
                    open catalogue
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {rows.length > 0 && (
        <Card className="mt-6 p-6">
          <SectionLabel>Contract preview (draft)</SectionLabel>
          <div className="font-serif text-[14px] leading-relaxed">
            <strong>BUY-SIDE MANDATE (DRAFT)</strong>
            <br />
            <br />
            Client: Freeman Capital Partners · Advisor: Antberg GmbH
            <br />
            <br />
            Properties:
            <ul className="ml-5 list-disc">
              {rows.map((r) => (
                <li key={r.object_id}>
                  {displayCode(r.object_id)} — {r.district}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 flex gap-3">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[12px]">Draft</span>
            <span className="text-[12px] text-muted">→ Client signs → Active</span>
          </div>
          <button
            type="button"
            className="mt-4 rounded-md bg-sidebar px-5 py-2.5 text-[12px] font-semibold text-white"
          >
            Download for signing
          </button>
        </Card>
      )}
    </div>
  );
}
