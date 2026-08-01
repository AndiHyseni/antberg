import { DEFAULT_CLIENT_ID, query } from './pool.js';

/**
 * @param {number} [clientId]
 */
export async function listDocuments(clientId = DEFAULT_CLIENT_ID) {
  const [evalDocs] = await query(
    `SELECT ed.label AS name,
            CASE ed.doc_type
              WHEN 'grundbuch' THEN 'Bank Files'
              WHEN 'energy' THEN 'Evaluation Files'
              WHEN 'rent_roll' THEN 'Evaluation Files'
              WHEN 'site_photos' THEN 'Evaluation Files'
              ELSE 'Evaluation Files'
            END AS category,
            p.object_id AS object_ref,
            ed.status,
            ed.uploaded_at AS doc_date,
            ed.filename
     FROM evaluation_documents ed
     JOIN evaluations e ON e.id = ed.evaluation_id
     JOIN properties p ON p.id = e.property_id
     LEFT JOIN mandates m ON m.id = e.mandate_id
     WHERE m.client_id = ?
        OR EXISTS (
          SELECT 1 FROM catalog_items ci
          JOIN scan_runs sr ON sr.id = ci.scan_run_id
          WHERE ci.property_id = p.id AND sr.client_id = ?
        )`,
    [clientId, clientId]
  );

  const [contracts] = await query(
    `SELECT CONCAT('Buy-Side Mandate Agreement v', mc.version_no) AS name,
            'Contracts' AS category,
            'Portfolio' AS object_ref,
            CASE m.status WHEN 'active' THEN 'SIGNED' ELSE 'DRAFT' END AS status,
            mc.created_at AS doc_date,
            NULL AS filename
     FROM mandate_contracts mc
     JOIN mandates m ON m.id = mc.mandate_id
     WHERE m.client_id = ?`,
    [clientId]
  );

  const mapStatus = (status) => {
    const s = String(status).toLowerCase();
    if (s === 'verified' || s === 'received') return { label: 'FINAL', tone: 'success' };
    if (s === 'signed' || s === 'active') return { label: 'SIGNED', tone: 'success' };
    if (s === 'pending') return { label: 'MISSING', tone: 'danger' };
    if (s === 'draft') return { label: 'DRAFT', tone: 'warning' };
    return { label: String(status).toUpperCase(), tone: 'neutral' };
  };

  return [...contracts, ...evalDocs].map((row) => {
    const st = mapStatus(row.status);
    const size = row.filename ? estimateSize(row.filename) : '—';
    return {
      name: row.name,
      category: row.category,
      object: formatObjectRef(row.object_ref),
      status: st.label,
      tone: st.tone,
      date: row.doc_date ? formatDocDate(new Date(row.doc_date)) : '—',
      size,
    };
  });
}

/**
 * @param {string} objectRef
 */
function formatObjectRef(objectRef) {
  if (objectRef === 'Portfolio') return 'Portfolio';
  const tail = String(objectRef).replace(/\D/g, '').slice(-3).padStart(3, '0');
  return `A-${tail}`;
}

/**
 * @param {string} filename
 */
function estimateSize(filename) {
  if (filename.endsWith('.zip')) return '14.2 MB';
  if (filename.endsWith('.pdf')) return '420 KB';
  return '—';
}

/**
 * @param {Date} date
 */
function formatDocDate(date) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
