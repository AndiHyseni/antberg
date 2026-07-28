import { useState } from 'react';
import {
  BarChart3,
  Building2,
  Calculator,
  ClipboardCheck,
  FileText,
  Gauge,
  Layers,
  Shield,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { Card, PageHeader, SectionLabel, StatusPill } from '../components/ui/primitives';

const OBJECTS = ['NA-011', 'NB-017', 'NC-023', 'ND-031', 'A-041', 'A-058', 'B-017'];

const SECTIONS = [
  { id: 'general', label: 'General', icon: FileText },
  { id: 'planning', label: 'Planning', icon: Layers },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'valuation', label: 'Valuation', icon: BarChart3 },
  { id: 'capex', label: 'Capex', icon: Building2 },
  { id: 'risk', label: 'Risk', icon: Shield },
  { id: 'scenarios', label: 'Scenarios', icon: Gauge },
  { id: 'sensitivity', label: 'Sensitivity', icon: SlidersHorizontal },
  { id: 'verify', label: 'Verify', icon: ClipboardCheck },
  { id: 'decisioning', label: 'Decisioning', icon: Calculator },
];

function SectionHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded bg-ink text-[12px] font-bold text-white">
        {n}
      </span>
      <h2 className="text-[13px] font-semibold tracking-wide uppercase">{title}</h2>
    </div>
  );
}

function NumberedCard({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <SectionHeader n={n} title={title} />
      {children}
    </Card>
  );
}

export function EvaluationPage() {
  const [activeObject, setActiveObject] = useState('A-041');
  const [activeSection, setActiveSection] = useState('general');

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Evaluation & Offers"
        subtitle="Bank-grade valuation, capex modelling and offer preparation for mandated objects."
      />

      <div className="flex gap-6">
        {/* Left object list + section nav */}
        <aside className="w-[140px] shrink-0 space-y-6">
          <div>
            <div className="mb-2 text-[10px] font-semibold tracking-wider text-muted uppercase">
              Objects
            </div>
            <div className="space-y-1">
              {OBJECTS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveObject(id)}
                  className={[
                    'block w-full rounded-md px-3 py-2 text-left text-[12px] font-medium',
                    activeObject === id
                      ? 'bg-white shadow-sm ring-1 ring-border'
                      : 'text-muted hover:bg-white/60',
                  ].join(' ')}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold tracking-wider text-muted uppercase">
              Sections
            </div>
            <div className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={[
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px]',
                    activeSection === id ? 'font-semibold text-ink' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  <Icon size={13} strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-5">
          {/* Object header */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[22px] font-semibold">#A-041 · Stuttgart-Süd</h2>
              <StatusPill label="Priced" tone="success" />
              <span className="text-[12px] text-muted">OFFER SENT: 01.07.2023</span>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-4 rounded-lg border border-border bg-white px-5 py-4">
              {[
                { label: 'Yield spread', value: '0.1%' },
                { label: 'ESG Rating', value: 'A-' },
                { label: 'Risk score', value: 'Low' },
                { label: 'Grade', value: 'Grade A' },
                { label: 'Assets', value: '7 Units' },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                    {kpi.label}
                  </div>
                  <div className="mt-1 text-[14px] font-semibold">{kpi.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing banner */}
          <div className="rounded-[12px] bg-sidebar p-6 text-white">
            <div className="flex items-start justify-between gap-6">
              <div>
                <div className="text-[36px] font-semibold leading-none">€3.90–4.40M</div>
                <div className="mt-2 text-[13px] text-white/60">Recommended offer range</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] text-white/50">Offer period</div>
                <div className="mt-1 text-[14px] font-semibold">01.06–14.06.23</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {[
                'Feedback about amount',
                'Recalculate yield model',
                'Refactor integrated model',
                'Expose offer in the market (admin only)',
              ].map((btn) => (
                <button
                  key={btn}
                  type="button"
                  className="rounded-md border border-white/25 px-4 py-2 text-[11px] font-semibold text-white/90 hover:bg-white/10"
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1 — Portfolio Overview */}
          <NumberedCard n={1} title="Portfolio Overview">
            <div className="grid grid-cols-[200px_1fr] gap-6">
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-gray-50">
                <svg viewBox="0 0 120 100" className="h-28 w-32 text-muted/40" fill="currentColor">
                  <rect x="10" y="20" width="45" height="35" rx="2" />
                  <rect x="60" y="20" width="50" height="55" rx="2" />
                  <rect x="10" y="60" width="45" height="25" rx="2" />
                </svg>
              </div>
              <div className="divide-y divide-border text-[13px]">
                {[
                  ['Land area', '2,840 m²'],
                  ['Unit count', '7 (5 res. · 2 com.)'],
                  ['Floor space', '1,920 m² GFA'],
                  ['Construction year', '1968 (partially modernized 2014)'],
                  ['Occupancy', '86%'],
                  ['Current rent roll', '€184K p.a.'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2.5">
                    <span className="text-muted">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </NumberedCard>

          {/* Section 2 — Planning Envelope */}
          <NumberedCard n={2} title="Planning Envelope">
            <p className="mb-4 text-[13px] text-muted">
              Zoning permits mixed-use up to 2.4 GFZ. Densification potential confirmed via ALKIS
              overlay. No heritage restrictions on main building.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="rounded-md bg-ink px-4 py-2 text-[11px] font-semibold text-white">
                VIEW AS JSON
              </button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[11px] font-semibold">
                OPEN OBJECT BLUEPRINT
              </button>
              <button type="button" className="rounded-md border border-border px-4 py-2 text-[11px] font-semibold">
                EXPORT MEMO
              </button>
            </div>
          </NumberedCard>

          {/* Section 3 — Income Modeller */}
          <NumberedCard n={3} title="Income Modeller">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
                  <th className="pb-3 text-left">Category</th>
                  <th className="pb-3 text-left">Current</th>
                  <th className="pb-3 text-left">Modernized gross rent</th>
                  <th className="pb-3 text-left">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { cat: 'Residential', cur: '€142K', mod: '€198K', src: 'PRICE', tone: 'info' as const },
                  { cat: 'Commercial', cur: '€42K', mod: '€58K', src: 'MARKET', tone: 'warning' as const },
                  { cat: 'Parking', cur: '€8K', mod: '€12K', src: 'PRICE', tone: 'info' as const },
                  { cat: 'Total', cur: '€192K', mod: '€268K', src: '', tone: 'neutral' as const },
                ].map((row) => (
                  <tr key={row.cat}>
                    <td className="py-3 font-medium">{row.cat}</td>
                    <td className="py-3">{row.cur}</td>
                    <td className="py-3 font-semibold">{row.mod}</td>
                    <td className="py-3">
                      {row.src && <StatusPill label={row.src} tone={row.tone} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </NumberedCard>

          {/* Section 4 — Valuation */}
          <NumberedCard n={4} title="Valuation">
            <div className="space-y-4">
              {[
                { label: 'Comparable sales', low: 35, high: 72, val: '€4.1M' },
                { label: 'Land + Building', low: 28, high: 65, val: '€3.8M' },
                { label: 'Income approach', low: 42, high: 88, val: '€4.4M' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex justify-between text-[12px]">
                    <span>{m.label}</span>
                    <span className="font-semibold">{m.val}</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-gray-100">
                    <div
                      className="absolute h-full rounded-full bg-gradient-to-r from-gray-300 to-lime"
                      style={{ left: `${m.low}%`, width: `${m.high - m.low}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-4 rounded-lg bg-lime/20 px-4 py-3">
                <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                  Recommended offer range
                </div>
                <div className="mt-1 text-[18px] font-semibold">€3.90M – €4.40M</div>
              </div>
            </div>
          </NumberedCard>

          {/* Section 5 — Capex */}
          <NumberedCard n={5} title="Capex – Three Intervention Levels">
            <div className="space-y-5">
              {[
                { label: 'Minimum', range: '€180K – €240K', pct: 30, active: false },
                { label: 'Moderate', range: '€420K – €580K', pct: 55, active: true },
                { label: 'Comprehensive', range: '€780K – €960K', pct: 80, active: false },
              ].map((level) => (
                <div key={level.label}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className={level.active ? 'font-semibold' : ''}>{level.label}</span>
                    <span className="font-semibold">{level.range}</span>
                  </div>
                  <div className="h-2 rounded-full bg-tan">
                    <div
                      className={`h-full rounded-full ${level.active ? 'bg-lime' : 'bg-gray-300'}`}
                      style={{ width: `${level.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </NumberedCard>

          {/* Section 6 — Risk & Legal */}
          <NumberedCard n={6} title="Risk & Legal Review">
            <div className="divide-y divide-border">
              {[
                { factor: 'Contaminated land', desc: 'No evidence in ALKIS or WFS layers', status: 'NOT LIKELY', tone: 'success' as const },
                { factor: 'Flood risk', desc: 'Zone 1 — low probability', status: 'NOT LIKELY', tone: 'success' as const },
                { factor: 'Heritage protection', desc: 'Partial listing on annex building', status: 'MEDIUM', tone: 'warning' as const },
                { factor: 'Tenant protection', desc: '2 commercial leases below market', status: 'RISK', tone: 'danger' as const },
                { factor: 'Energy certificate', desc: 'Class G — mandatory upgrade by 2028', status: 'MEDIUM', tone: 'warning' as const },
              ].map((r) => (
                <div key={r.factor} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-[13px] font-medium">{r.factor}</div>
                    <div className="text-[12px] text-muted">{r.desc}</div>
                  </div>
                  <StatusPill label={r.status} tone={r.tone} />
                </div>
              ))}
            </div>
          </NumberedCard>

          {/* Section 7 — Investor Scenarios */}
          <NumberedCard n={7} title="Investor Scenarios">
            <div className="grid grid-cols-3 gap-4">
              {[
                { title: 'Buy and Hold', irr: '6.2%', exit: 'Year 10', rec: false },
                { title: 'Renovate and Hold', irr: '8.4%', exit: 'Year 7', rec: false },
                { title: 'Renovate and Exit', irr: '14.1%', exit: 'Year 4', rec: true },
              ].map((s) => (
                <div
                  key={s.title}
                  className={[
                    'rounded-lg border p-4',
                    s.rec ? 'border-lime bg-lime/5 ring-1 ring-lime' : 'border-border',
                  ].join(' ')}
                >
                  {s.rec && (
                    <span className="mb-2 inline-block rounded bg-lime px-2 py-0.5 text-[9px] font-bold tracking-wide text-ink">
                      RECOMMENDED
                    </span>
                  )}
                  <div className="text-[14px] font-semibold">{s.title}</div>
                  <div className="mt-3 text-[12px] text-muted">Target IRR</div>
                  <div className="text-[20px] font-semibold">{s.irr}</div>
                  <div className="mt-2 text-[12px] text-muted">Exit · {s.exit}</div>
                </div>
              ))}
            </div>
          </NumberedCard>

          {/* Section 8 — Sensitivity */}
          <NumberedCard n={8} title="Sensitivity & Stress Test">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                {[
                  { label: 'Purchase price', value: '€4.15M' },
                  { label: 'Market rent', value: '+12%' },
                  { label: 'Capex overrun', value: '+15%' },
                  { label: 'Exit cap rate', value: '4.8%' },
                ].map((s) => (
                  <label key={s.label} className="block">
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span>{s.label}</span>
                      <span className="font-semibold">{s.value}</span>
                    </div>
                    <input type="range" className="w-full" defaultValue={50} />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total investment', base: '€4.8M', stress: '€5.2M' },
                  { label: 'Stabilized NOI', base: '€268K', stress: '€241K' },
                  { label: 'Exit value', base: '€5.9M', stress: '€5.1M' },
                  { label: 'Net profit', base: '€1.1M', stress: '€620K' },
                ].map((r) => (
                  <div key={r.label} className="rounded-lg bg-gray-50 p-3">
                    <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                      {r.label}
                    </div>
                    <div className="mt-1 text-[16px] font-semibold">{r.base}</div>
                    <div className="mt-1 text-[12px] text-red-500">Stress: {r.stress}</div>
                  </div>
                ))}
              </div>
            </div>
          </NumberedCard>

          {/* Section 9 — Verify */}
          <NumberedCard n={9} title="Why Only The Index Can Confirm">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
                  <th className="pb-3 text-left">Category</th>
                  <th className="pb-3 text-left">SDA</th>
                  <th className="pb-3 text-left">Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Building condition', 'Estimated', 'Verified'],
                  ['Rent roll', 'Partial', 'Complete'],
                  ['Energy certificate', 'Missing', 'Available'],
                  ['Ownership structure', 'Unknown', 'Confirmed'],
                  ['Zoning capacity', 'Modeled', 'Official'],
                ].map(([cat, sda, idx]) => (
                  <tr key={cat}>
                    <td className="py-3 font-medium">{cat}</td>
                    <td className="py-3 text-muted">{sda}</td>
                    <td className="py-3 font-semibold text-[#2d5a27]">{idx}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </NumberedCard>

          {/* Section 10 — Recommendation */}
          <NumberedCard n={10} title="Recommendation & Decision">
            <p className="mb-5 text-[14px] leading-relaxed text-muted">
              Proceed with a non-binding offer in the €3.90–4.40M corridor. Renovate-and-exit scenario
              delivers the strongest risk-adjusted return given current rent gap and capex envelope.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <SectionLabel>Risks</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {['Tenant protection', 'Energy upgrade mandatory', 'Partial heritage'].map((r) => (
                    <span key={r} className="rounded bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <SectionLabel>Benefits</SectionLabel>
                <div className="flex flex-wrap gap-2">
                  {['Rent gap vs market', 'Densification upside', 'Owner motivated'].map((b) => (
                    <span key={b} className="rounded bg-lime/30 px-2 py-1 text-[11px] font-medium text-forest">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </NumberedCard>
        </div>
      </div>
    </div>
  );
}
