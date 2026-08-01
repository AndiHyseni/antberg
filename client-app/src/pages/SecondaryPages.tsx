import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import {
  Card,
  PageHeader,
  SectionLabel,
  StatusPill,
} from '../components/ui/primitives';
import {
  displayCode,
  fetchDocuments,
  fetchPipeline,
  fetchSaved,
  toggleSelectionApi,
  type DocumentRow,
  type PipelineItem,
  type SavedItem,
} from '../api/client';
import { useApp } from '../context/AppContext';

export function PipelinePage() {
  const [items, setItems] = useState<PipelineItem[]>([]);

  useEffect(() => {
    fetchPipeline().then(setItems);
  }, []);

  if (!items.length) {
    return (
      <div className="px-8 py-8">
        <PageHeader
          title="Pipeline"
          subtitle="Live progress on every mandated object — what stage it's in, what happens next, what's blocking it."
        />
        <Card className="p-8 text-center text-[13px] text-muted">
          No pipeline items yet. Select opportunities and prepare a mandate to begin.
        </Card>
      </div>
    );
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Pipeline"
        subtitle="Live progress on every mandated object — what stage it's in, what happens next, what's blocking it."
      />

      {items.map((item) => (
        <Card key={item.code} className="mb-5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[16px] font-semibold">
                {displayCode(item.code)} · {item.location}
              </div>
              <div className="mt-0.5 text-[12px] text-muted">Stage: {item.stage}</div>
            </div>
            <div className="text-right">
              <div className="text-[22px] font-semibold">{item.pct}%</div>
              <StatusPill
                label={`Risk: ${item.risk}`}
                tone={item.risk === 'low' ? 'success' : 'warning'}
              />
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-tan">
            <div className="h-full rounded-full bg-forest" style={{ width: `${item.pct}%` }} />
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4 text-[12px]">
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">Agent</div>
              <div className="mt-1 font-medium">{item.agent}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                Last update
              </div>
              <div className="mt-1 font-medium">{item.updated}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                Next action
              </div>
              <div className="mt-1 font-medium">{item.next}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-muted uppercase">
                Missing
              </div>
              <div className="mt-1 font-medium">{item.missing}</div>
            </div>
          </div>

          <div className="relative mt-8">
            <div className="absolute top-1.5 right-0 left-0 h-px bg-border" />
            <div className="relative flex justify-between">
              {item.stages.map((stage, i) => (
                <div
                  key={stage}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / item.stages.length}%` }}
                >
                  <div
                    className={[
                      'relative z-10 h-3 w-3 rounded-full border-2',
                      i <= item.stageIdx ? 'border-ink bg-ink' : 'border-border bg-white',
                      i === item.stageIdx ? 'ring-2 ring-ink/20' : '',
                    ].join(' ')}
                  />
                  <span className="mt-2 max-w-[72px] text-center text-[8px] leading-tight text-muted">
                    {stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function DocumentsPage() {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [documents, setDocuments] = useState<DocumentRow[]>([]);

  useEffect(() => {
    fetchDocuments().then(setDocuments);
  }, []);

  const categories = ['All', 'Contracts', 'Bank Files', 'Evaluation Files', 'Offer Documents'];

  const filtered = documents.filter((d) => {
    if (filter !== 'All' && d.category !== filter) return false;
    if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Documents"
        subtitle="Every contract, evaluation file and offer document in one organized place."
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={[
                'rounded-full px-4 py-1.5 text-[12px] font-medium',
                filter === c ? 'bg-ink text-white' : 'border border-border bg-white text-ink',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents"
            className="w-full rounded-lg border border-border py-2 pl-10 pr-4 text-[13px] outline-none focus:border-ink"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-muted">No documents found.</div>
        ) : (
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border text-[10px] font-semibold tracking-wider text-muted uppercase">
              <tr>
                <th className="px-6 py-3">Document</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Object</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr key={`${doc.name}-${doc.object}`} className="border-b border-border">
                  <td className="px-6 py-4 font-semibold">{doc.name}</td>
                  <td className="px-4 py-4 text-muted">{doc.category}</td>
                  <td className="px-4 py-4 text-muted">{doc.object}</td>
                  <td className="px-4 py-4">
                    <StatusPill label={doc.status} tone={doc.tone} />
                  </td>
                  <td className="px-4 py-4 text-muted">{doc.date}</td>
                  <td className="px-4 py-4 text-muted">{doc.size}</td>
                  <td className="px-4 py-4 text-right">
                    <button type="button" className="text-muted hover:text-ink">
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function SavedOpportunitiesPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const { refreshSelection } = useApp();

  useEffect(() => {
    fetchSaved().then(setItems);
  }, []);

  async function moveToSelected(objectId: string) {
    await toggleSelectionApi(objectId);
    await refreshSelection();
    setItems((prev) => prev.filter((i) => i.id !== objectId));
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Saved Opportunities"
        subtitle={`${items.length} opportunit${items.length === 1 ? 'y' : 'ies'} saved for later — not yet selected for mandate.`}
      />

      {items.length === 0 ? (
        <Card className="p-8 text-center text-[13px] text-muted">
          No saved opportunities. Bookmark items from the catalogue to review later.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="p-5">
                <div className="text-[18px] font-semibold">{displayCode(item.id)}</div>
                <div className="text-[13px] text-muted">
                  {item.location} · {item.type}
                </div>
                <div className="mt-3 flex gap-2">
                  <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-muted">
                    {item.thesis}
                  </span>
                  <StatusPill
                    label={`Risk: ${item.risk}`}
                    tone={item.risk === 'low' ? 'success' : 'warning'}
                  />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-tan">
                        <div
                          className="h-full rounded-full bg-ink"
                          style={{ width: `${Math.min(100, item.score)}%` }}
                        />
                      </div>
                      <span className="text-[13px] font-semibold">{item.score}</span>
                    </div>
                  </div>
                  <div className="text-[18px] font-semibold">{item.ticket}</div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <Link
                  to="/catalogue"
                  className="text-[12px] font-semibold text-ink hover:underline"
                >
                  View Analysis
                </Link>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold"
                  >
                    REMOVE
                  </button>
                  <button
                    type="button"
                    onClick={() => moveToSelected(item.id)}
                    className="rounded-md bg-ink px-3 py-1.5 text-[11px] font-semibold text-white"
                  >
                    MOVE TO SELECTED
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className={[
        'relative h-6 w-11 rounded-full transition',
        on ? 'bg-ink' : 'bg-gray-200',
      ].join(' ')}
    >
      <div
        className={[
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
          on ? 'left-[22px]' : 'left-0.5',
        ].join(' ')}
      />
    </div>
  );
}

export function SettingsPage() {
  const profileRows = [
    { label: 'Name', value: 'Alex Freeman' },
    { label: 'Email', value: 'alex@freemancapital.com' },
    { label: 'Role', value: 'Managing Director' },
    { label: 'Phone', value: '+49 711 555 0148' },
  ];
  const companyRows = [
    { label: 'Firm', value: 'Freeman Capital Partners' },
    { label: 'Registered Address', value: 'Königstraße 26, 70173 Stuttgart' },
    { label: 'VAT ID', value: 'DE 813 245 990' },
  ];
  const prefRows = [
    { label: 'Currency', value: 'EUR (€)' },
    { label: 'Units', value: 'Metric' },
    { label: 'Language', value: 'English' },
  ];
  const notifications = [
    { title: 'Email notifications', desc: 'New matches and offer updates', on: true },
    { title: 'SMS alerts', desc: 'Critical pipeline milestones only', on: false },
    { title: 'Weekly digest', desc: 'Summary of activity every Monday', on: true },
    { title: 'Mandate status alerts', desc: 'Contract signed or pending action', on: true },
  ];

  function SettingsCard({
    title,
    rows,
  }: {
    title: string;
    rows: { label: string; value: string }[];
  }) {
    return (
      <Card className="p-6">
        <SectionLabel>{title}</SectionLabel>
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3 text-[13px]">
              <span className="text-muted">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <div className="px-8 py-8">
      <PageHeader
        title="Settings"
        subtitle="Account, company and platform preferences."
      />

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <SettingsCard title="Profile" rows={profileRows} />
          <SettingsCard title="Company" rows={companyRows} />
          <SettingsCard title="Preferences" rows={prefRows} />
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <SectionLabel>Notifications</SectionLabel>
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <div key={n.title} className="flex items-center justify-between py-4">
                  <div>
                    <div className="text-[13px] font-medium">{n.title}</div>
                    <div className="text-[12px] text-muted">{n.desc}</div>
                  </div>
                  <Toggle on={n.on} />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <SectionLabel>Data, Legal & Privacy</SectionLabel>
            <div className="space-y-3 text-[13px]">
              {['Download my data', 'Privacy Policy', 'Terms of Service'].map((link) => (
                <button key={link} type="button" className="block font-medium hover:underline">
                  {link}
                </button>
              ))}
              <button type="button" className="block font-medium text-red-500 hover:underline">
                Delete Account
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
