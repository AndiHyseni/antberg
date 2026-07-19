import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, OutlineButton, SectionLabel } from '../components/ui/primitives';
import { displayCode, fetchCatalog, parseTicketMid } from '../api/client';
import { useApp } from '../context/AppContext';

export function OverviewPage() {
  const { selection, setCatalogCount } = useApp();
  const [topMatches, setTopMatches] = useState<
    { id: string; label: string; score: number; ticket: string }[]
  >([]);

  useEffect(() => {
    fetchCatalog()
      .then((c) => {
        setCatalogCount(c.cards.length);
        setTopMatches(
          c.cards.slice(0, 3).map((card) => ({
            id: displayCode(card.object_id),
            label: `${card.district} · ${card.asset_type}`,
            score: card.score,
            ticket: parseTicketMid(card.ticket_range),
          }))
        );
      })
      .catch(() => {});
  }, [setCatalogCount]);

  return (
    <div className="px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight text-ink">Hey, Alex</h1>
          <p className="mt-1 text-[15px] text-muted">
            Here&apos;s what needs your attention across your acquisition program.
          </p>
        </div>
        <Link
          to="/scouting-orders"
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-black"
        >
          <Plus size={16} />
          CREATE SCOUTING ORDER
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: 'ACTIVE SEARCHES', value: '2', sub: 'Scouting orders currently scanning' },
          { label: 'NEW MATCHES', value: '3', sub: 'Unreviewed in the catalogue' },
          { label: 'IN EVALUATION', value: '4', sub: 'Mandated objects in process' },
          { label: 'CAPITAL IN PIPELINE', value: '€18.6M', sub: 'Across mandated objects' },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="text-[10px] font-semibold tracking-[0.1em] text-muted">{kpi.label}</div>
            <div className="mt-2 text-[28px] font-semibold leading-none">{kpi.value}</div>
            <div className="mt-2 text-[12px] text-muted">{kpi.sub}</div>
          </Card>
        ))}
      </div>

      <SectionLabel>Needs your attention</SectionLabel>
      <Card className="mb-8 divide-y divide-border">
        {[
          {
            title: 'EVALUATION & OFFERS',
            desc: '2 offer(s) awaiting your approval',
            to: '/evaluation',
            btn: 'REVIEW OFFERS',
          },
          {
            title: 'SELECTED & MANDATE',
            desc: `${selection.length || 4} opportunities selected — ready to generate mandate`,
            to: '/mandate',
            btn: 'PREPARE MANDATE',
          },
          {
            title: 'DOCUMENTS',
            desc: '4 document(s) missing across mandated objects',
            to: '/documents',
            btn: 'VIEW DOCUMENTS',
          },
        ].map((row) => (
          <div key={row.title} className="flex items-center justify-between px-6 py-5">
            <div>
              <div className="text-[13px] font-semibold">{row.title}</div>
              <div className="mt-1 text-[13px] text-muted">{row.desc}</div>
            </div>
            <Link to={row.to}>
              <OutlineButton>{row.btn}</OutlineButton>
            </Link>
          </div>
        ))}
      </Card>

      <SectionLabel>New matches</SectionLabel>
      <Card className="mb-8 divide-y divide-border">
        {(topMatches.length ? topMatches : [
          { id: '#A-023', label: 'Ludwigsburg · Residential · Core', score: 79, ticket: '€2.8M' },
          { id: '#A-041', label: 'Stuttgart-Süd · Mixed-Use', score: 87, ticket: '€4.6M' },
          { id: '#A-058', label: 'Esslingen · Residential', score: 74, ticket: '€3.1M' },
        ]).map((m) => (
          <div key={m.id} className="flex items-center justify-between px-6 py-4">
            <div>
              <span className="font-semibold">{m.id}</span>
              <span className="ml-2 text-[13px] text-muted">{m.label}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{m.score}</div>
              <div className="text-[12px] text-muted">{m.ticket}</div>
            </div>
          </div>
        ))}
      </Card>

      <SectionLabel>Pipeline highlights</SectionLabel>
      <Card className="mb-8 divide-y divide-border">
        {[
          { id: 'A-041', place: 'Stuttgart-Süd', status: 'Owner Response', pct: 55 },
          { id: 'B-017', place: 'Zuffenhausen', status: 'Evaluation', pct: 72 },
          { id: 'A-058', place: 'Bad Cannstatt', status: 'Docs', pct: 28 },
        ].map((p) => (
          <div key={p.id} className="px-6 py-4">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <div>
                <span className="font-semibold">{p.id}</span>
                <span className="mx-2 text-muted">·</span>
                <span>{p.place}</span>
                <span className="mx-2 text-muted">·</span>
                <span className="text-muted">{p.status}</span>
              </div>
              <span className="text-[12px] text-muted">{p.pct}% to close</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-tan">
              <div className="h-full rounded-full bg-ink" style={{ width: `${p.pct}%` }} />
            </div>
          </div>
        ))}
      </Card>

      <SectionLabel>Recent activity</SectionLabel>
      <Card className="divide-y divide-border">
        {[
          { text: '#B-017 — Bank valuation package in preparation', time: '5h ago' },
          { text: 'Scouting order #SO-104 completed — 100 opportunities', time: '1d ago' },
          { text: '#A-041 — Mandate countersigned', time: '2d ago' },
        ].map((a) => (
          <div key={a.text} className="flex items-center justify-between px-6 py-4 text-[13px]">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-muted" />
              {a.text}
            </div>
            <span className="text-[12px] text-muted">{a.time}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
