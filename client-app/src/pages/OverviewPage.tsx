import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, OutlineButton, PageHeader, SectionLabel } from '../components/ui/primitives';
import { displayCode, fetchCatalog, fetchOverview, parseTicketMid } from '../api/client';
import { useApp } from '../context/AppContext';

function formatCapital(eur: number): string {
  if (eur >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (eur >= 1_000) return `€${Math.round(eur / 1000)}K`;
  return `€${Math.round(eur)}`;
}

export function OverviewPage() {
  const { selection, setCatalogCount } = useApp();
  const [topMatches, setTopMatches] = useState<
    { id: string; label: string; score: number; ticket: string }[]
  >([]);
  const [kpis, setKpis] = useState({
    activeSearches: '—',
    newMatches: '—',
    inEvaluation: '—',
    capital: '—',
  });
  const [pipeline, setPipeline] = useState<
    { code: string; place: string; status: string; pct: number }[]
  >([]);
  const [activity, setActivity] = useState<{ text: string; time: string }[]>([]);

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

    fetchOverview().then((data) => {
      if (data.stats) {
        setKpis({
          activeSearches: String(data.stats.active_searches),
          newMatches: String(Math.min(3, data.stats.catalog_total)),
          inEvaluation: String(data.stats.pipeline_count),
          capital: formatCapital(data.stats.pipeline_capital),
        });
      }
      if (data.pipeline.length) {
        setPipeline(
          data.pipeline.map((p) => ({
            code: displayCode(p.code),
            place: p.place,
            status: p.status,
            pct: p.pct,
          }))
        );
      }
      if (data.activity.length) setActivity(data.activity);
    });
  }, [setCatalogCount]);

  const selectedCount = selection.length;

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Hey, Alex"
        subtitle="Here's what needs your attention across your acquisition program."
        action={
          <Link
            to="/scouting-orders"
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-black"
          >
            <Plus size={16} />
            CREATE SCOUTING ORDER
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: 'ACTIVE SEARCHES', value: kpis.activeSearches, sub: 'Scouting orders currently scanning' },
          { label: 'NEW MATCHES', value: kpis.newMatches, sub: 'Unreviewed in the catalogue' },
          { label: 'IN EVALUATION', value: kpis.inEvaluation, sub: 'Mandated objects in process' },
          { label: 'CAPITAL IN PIPELINE', value: kpis.capital, sub: 'Across mandated objects' },
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
            title: 'SELECTED',
            desc: `${selectedCount} opportunit${selectedCount === 1 ? 'y' : 'ies'} selected — ready to generate mandate`,
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
        {(topMatches.length ? topMatches : []).map((m) => (
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
        {!topMatches.length && (
          <div className="px-6 py-4 text-[13px] text-muted">Loading catalogue matches…</div>
        )}
      </Card>

      <SectionLabel>Pipeline highlights</SectionLabel>
      <Card className="mb-8 divide-y divide-border">
        {(pipeline.length ? pipeline : []).map((p) => (
          <div key={p.code} className="px-6 py-4">
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <div>
                <span className="font-semibold">{p.code}</span>
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
        {!pipeline.length && (
          <div className="px-6 py-4 text-[13px] text-muted">No pipeline items yet.</div>
        )}
      </Card>

      <SectionLabel>Recent activity</SectionLabel>
      <Card className="divide-y divide-border">
        {(activity.length ? activity : []).map((a) => (
          <div key={a.text} className="flex items-center justify-between px-6 py-4 text-[13px]">
            <div className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-muted" />
              {a.text}
            </div>
            <span className="text-[12px] text-muted">{a.time}</span>
          </div>
        ))}
        {!activity.length && (
          <div className="px-6 py-4 text-[13px] text-muted">No recent activity.</div>
        )}
      </Card>
    </div>
  );
}
