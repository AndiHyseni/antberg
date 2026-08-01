import { DEFAULT_CLIENT_ID, query } from './pool.js';

const STAGE_UI = {
  docs: { label: 'Documentation', idx: 1, pct: 15 },
  owner_contact: { label: 'Owner Research', idx: 2, pct: 25 },
  evaluation: { label: 'Evaluation', idx: 5, pct: 45 },
  offer: { label: 'Offer', idx: 6, pct: 70 },
  closing: { label: 'Closing', idx: 9, pct: 90 },
};

const STAGE_LABELS = [
  'Mandated',
  'Documentation',
  'Owner Research',
  'Outreach',
  'Owner Response',
  'Evaluation',
  'Offer',
  'Negotiation',
  'Notary',
  'Closing',
];

/**
 * @param {number} [clientId]
 */
export async function listPipeline(clientId = DEFAULT_CLIENT_ID) {
  const [rows] = await query(
    `SELECT pi.*, p.object_id, p.district_label AS district,
            ps.total_score AS score, d.strategy_label
     FROM pipeline_items pi
     JOIN properties p ON p.id = pi.property_id
     JOIN mandates m ON m.id = pi.mandate_id
     LEFT JOIN property_scores ps ON ps.property_id = p.id
     LEFT JOIN catalog_items ci ON ci.property_id = p.id
     LEFT JOIN dossiers d ON d.catalog_item_id = ci.id
     WHERE m.client_id = ?
     ORDER BY pi.updated_at DESC`,
    [clientId]
  );

  return rows.map((row) => {
    const stageInfo = STAGE_UI[row.stage] ?? STAGE_UI.docs;
    const risk =
      row.blocker_label && row.blocker_label !== 'None' ? 'medium' : row.progress_pct >= 60 ? 'low' : 'medium';

    return {
      id: row.object_id,
      code: row.object_id,
      location: row.district ?? '—',
      stage: stageInfo.label,
      stageIdx: stageInfo.idx,
      pct: Number(row.progress_pct),
      risk,
      agent: row.assigned_agent ?? 'M. K.',
      updated: relativeTime(row.updated_at),
      next: row.next_line ?? '—',
      missing: row.blocker_label ?? 'None',
      stages: STAGE_LABELS,
    };
  });
}

/**
 * @param {Date | string | null | undefined} date
 */
function relativeTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${mins || 5}h ago`;
  const days = Math.floor(mins / 1440);
  if (days < 1) return `${Math.floor(mins / 60)}h ago`;
  return `${days}d ago`;
}

export { STAGE_LABELS };
