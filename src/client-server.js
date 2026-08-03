import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildCatalog, scoredPropertyFromRow } from './potential/catalog.js';
import { readExcelRows } from './filter/readExcel.js';
import { STRATEGIES } from './potential/strategies.js';
import {
  createEvaluation,
  findEvaluationByObject,
  listEvaluations,
  loadEvaluation,
  saveEvaluation,
  loadCostTable,
} from './evaluation/store.js';
import { confirmFact, syncDocumentsFromIntake } from './evaluation/facts.js';
import { runEvaluationPipeline, recomputeFromCapex, renderReportHtml } from './evaluation/engine.js';
import { buildSample28UnitIntake } from './evaluation/sampleObject.js';
import { updateCapexComponent } from './evaluation/capex.js';
import { isDatabaseAvailable } from './db/pool.js';
import { fetchCatalogFromDb } from './db/catalog.js';
import {
  listSelections,
  toggleSelection,
  clearSelections,
  listSaved,
} from './db/selections.js';
import {
  createScoutingOrder,
  listScoutingOrders,
  formatOrderForApi,
  saveDraftOrder,
} from './db/scoutingOrders.js';
import { listPipeline } from './db/pipeline.js';
import { listDocuments } from './db/documents.js';
import {
  listNotifications,
  listRecentActivity,
  getOverviewStats,
  markAllNotificationsRead,
} from './db/activity.js';
import { listEvaluationsFromDb, listMandateSummary } from './db/evaluations.js';
import { adminLogin, adminLogout, resolveAdminSession } from './db/adminAuth.js';
import { getAdminStats, listAllActivity } from './db/adminDashboard.js';
import { listUsers, createUser, updateUser } from './db/adminUsers.js';
import { listClients, createClient } from './db/adminClients.js';
import {
  listAccessTokens,
  createAccessToken,
  revokeAccessToken,
} from './db/adminAccessTokens.js';
import { validateClientAccessToken } from './db/accessTokens.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CLIENT_DIST = path.join(ROOT, 'client-app', 'dist');
const BUILD_ID =
  process.env.RENDER_GIT_COMMIT?.slice(0, 7) ??
  process.env.BUILD_ID ??
  'local-dev';
const ACCESS_TOKEN = (process.env.ANTBERG_ACCESS_TOKEN ?? 'antberg-internal-2026').trim();
const DEFAULT_CATALOG = path.join(ROOT, 'data', 'catalog.json');
const DEFAULT_CANDIDATES =
  'output/stuttgart-alkis-2026-07-03/redevelopment-candidates.xlsx';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

/**
 * @param {import('http').IncomingMessage} req
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * @param {string} filePath
 */
async function serveStatic(filePath) {
  const data = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  return { data, type: MIME[ext] ?? 'application/octet-stream' };
}

/**
 * @param {Record<string, unknown>} body
 */
async function buildCatalogFromOrder(body) {
  const candidatesPath = path.join(ROOT, DEFAULT_CANDIDATES);
  const { rows } = await readExcelRows(candidatesPath, 'redevelopment_candidates');
  const candidates = rows.map(scoredPropertyFromRow);

  const ticket = body.ticket ?? {};
  /** @type {import('./potential/strategies.js').StrategyId} */
  const strategyId = String(body.strategy ?? 'value_add');

  return buildCatalog(
    candidates,
    {
      strategy: strategyId,
      ticketMin: ticket.min != null ? Number(ticket.min) : undefined,
      ticketMax: ticket.max != null ? Number(ticket.max) : undefined,
      assetTypes: Array.isArray(body.assetTypes) ? body.assetTypes.map(String) : undefined,
      excludeAssetTypes: Array.isArray(body.excludeAssetTypes)
        ? body.excludeAssetTypes.map(String)
        : undefined,
      excludeMonuments: body.excludeMonuments === true,
      excludeSingleFamily: body.excludeSingleFamily === true,
      city: body.city != null ? String(body.city) : 'Stuttgart',
      limit: 100,
    },
    { scanned: 151139, eliminated: 144855 }
  );
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {unknown} payload
 * @param {number} [status]
 */
function json(res, payload, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(payload));
}

/**
 * @param {import('http').IncomingMessage} req
 */
function bearerToken(req) {
  const auth = req.headers.authorization ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7).trim();
  return '';
}

/**
 * @param {import('http').IncomingMessage} req
 */
async function requireAdmin(req) {
  return resolveAdminSession(bearerToken(req));
}

/**
 * @param {string} relativePath
 */
function cacheControlFor(relativePath) {
  if (relativePath === 'index.html' || !path.extname(relativePath)) {
    return 'no-cache, no-store, must-revalidate';
  }
  if (relativePath.startsWith('assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

async function loadCatalogPayload() {
  if (await isDatabaseAvailable()) {
    const fromDb = await fetchCatalogFromDb();
    if (fromDb) return fromDb;
  }
  return JSON.parse(await fs.readFile(DEFAULT_CATALOG, 'utf8'));
}

async function main() {
  const port = Number(process.env.PORT) || 4173;
  const dbOk = await isDatabaseAvailable();

  try {
    await fs.access(path.join(CLIENT_DIST, 'index.html'));
  } catch {
    console.error('React UI not built. Run: npm run client:build');
    process.exit(1);
  }

  const CLIENT = CLIENT_DIST;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', `http://localhost:${port}`);

      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        });
        res.end();
        return;
      }

      if (url.pathname === '/api/admin/login' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const email = String(body.email ?? '');
        const password = String(body.password ?? '');
        const result = await adminLogin(email, password);
        if (!result) {
          json(res, { error: 'Invalid credentials' }, 401);
          return;
        }
        json(res, { user: result.user, token: result.token });
        return;
      }

      if (url.pathname === '/api/admin/logout' && req.method === 'POST') {
        await adminLogout(bearerToken(req));
        json(res, { ok: true });
        return;
      }

      if (url.pathname === '/api/admin/me' && req.method === 'GET') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        json(res, { user: admin });
        return;
      }

      const adminDbRequired = async () => {
        if (!(await isDatabaseAvailable())) {
          json(res, { error: 'Database required for this admin action' }, 503);
          return false;
        }
        return true;
      };

      if (url.pathname === '/api/admin/stats' && req.method === 'GET') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        json(res, await getAdminStats());
        return;
      }

      if (url.pathname === '/api/admin/activity' && req.method === 'GET') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        const limit = Math.min(Number(url.searchParams.get('limit') ?? 100), 500);
        json(res, { items: await listAllActivity(limit) });
        return;
      }

      if (url.pathname === '/api/admin/users' && req.method === 'GET') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        const users = await listUsers({
          q: url.searchParams.get('q') ?? undefined,
          role: url.searchParams.get('role') ?? undefined,
          clientId: url.searchParams.get('client_id')
            ? Number(url.searchParams.get('client_id'))
            : undefined,
        });
        json(res, { users });
        return;
      }

      if (url.pathname === '/api/admin/users' && req.method === 'POST') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        const body = JSON.parse((await readBody(req)) || '{}');
        try {
          const created = await createUser({
            client_id: Number(body.client_id),
            email: String(body.email ?? ''),
            display_name: String(body.display_name ?? ''),
            role: String(body.role ?? 'client'),
            password: body.password ? String(body.password) : undefined,
            is_active: body.is_active !== false,
          });
          json(res, created, 201);
        } catch (err) {
          json(res, { error: err.message }, 400);
        }
        return;
      }

      const adminUserMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
      if (adminUserMatch && req.method === 'PATCH') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        const body = JSON.parse((await readBody(req)) || '{}');
        try {
          await updateUser(Number(adminUserMatch[1]), {
            display_name: body.display_name != null ? String(body.display_name) : undefined,
            role: body.role != null ? String(body.role) : undefined,
            is_active: body.is_active != null ? Boolean(body.is_active) : undefined,
            client_id: body.client_id != null ? Number(body.client_id) : undefined,
            password: body.password ? String(body.password) : undefined,
          });
          json(res, { ok: true });
        } catch (err) {
          json(res, { error: err.message }, 400);
        }
        return;
      }

      if (url.pathname === '/api/admin/clients' && req.method === 'GET') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        json(res, { clients: await listClients() });
        return;
      }

      if (url.pathname === '/api/admin/clients' && req.method === 'POST') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        const body = JSON.parse((await readBody(req)) || '{}');
        const created = await createClient({
          name: String(body.name ?? ''),
          slug: String(body.slug ?? body.name ?? ''),
        });
        json(res, created, 201);
        return;
      }

      if (url.pathname === '/api/admin/access-tokens' && req.method === 'GET') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        json(res, { tokens: await listAccessTokens() });
        return;
      }

      if (url.pathname === '/api/admin/access-tokens' && req.method === 'POST') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        const body = JSON.parse((await readBody(req)) || '{}');
        const created = await createAccessToken({
          client_id: Number(body.client_id),
          label: body.label != null ? String(body.label) : undefined,
          expires_in_days: body.expires_in_days != null ? Number(body.expires_in_days) : undefined,
        });
        json(res, created, 201);
        return;
      }

      const adminTokenMatch = url.pathname.match(/^\/api\/admin\/access-tokens\/(\d+)\/revoke$/);
      if (adminTokenMatch && req.method === 'POST') {
        const admin = await requireAdmin(req);
        if (!admin) {
          json(res, { error: 'Unauthorized' }, 401);
          return;
        }
        if (!(await adminDbRequired())) return;
        await revokeAccessToken(Number(adminTokenMatch[1]));
        json(res, { ok: true });
        return;
      }

      if (url.pathname === '/api/strategies' && req.method === 'GET') {
        json(res, { strategies: STRATEGIES });
        return;
      }

      if (url.pathname === '/api/access/validate' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const token = String(body.token ?? '').trim();
        if (!token) {
          json(res, { valid: false });
          return;
        }
        if (token === ACCESS_TOKEN) {
          json(res, { valid: true });
          return;
        }
        const dbResult = await validateClientAccessToken(token);
        if (dbResult.valid) {
          json(res, dbResult);
          return;
        }
        json(res, { valid: false });
        return;
      }

      if (url.pathname === '/api/version' && req.method === 'GET') {
        json(res, {
          build_id: BUILD_ID,
          render: Boolean(process.env.RENDER),
          node_env: process.env.NODE_ENV ?? 'development',
        });
        return;
      }

      if (url.pathname === '/api/catalog' && req.method === 'GET') {
        const catalog = await loadCatalogPayload();
        json(res, catalog);
        return;
      }

      if (url.pathname === '/api/selections' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          const rows = await listSelections();
          json(res, { selections: rows.map((r) => r.object_id) });
          return;
        }
        json(res, { selections: [] });
        return;
      }

      if (url.pathname === '/api/selections/toggle' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const objectId = String(body.object_id ?? '');
        if (!objectId) {
          json(res, { error: 'object_id required' }, 400);
          return;
        }
        if (await isDatabaseAvailable()) {
          const result = await toggleSelection(objectId);
          json(res, result);
          return;
        }
        json(res, { selected: true, object_id: objectId, fallback: true });
        return;
      }

      if (url.pathname === '/api/selections' && req.method === 'DELETE') {
        if (await isDatabaseAvailable()) {
          await clearSelections();
        }
        json(res, { ok: true });
        return;
      }

      if (url.pathname === '/api/scouting-orders' && req.method === 'GET') {
        const status = url.searchParams.get('status') ?? undefined;
        if (await isDatabaseAvailable()) {
          const rows = await listScoutingOrders(status ?? undefined);
          json(res, { orders: rows.map(formatOrderForApi) });
          return;
        }
        json(res, { orders: [] });
        return;
      }

      if (url.pathname === '/api/scouting-orders/draft' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        if (await isDatabaseAvailable()) {
          const id = await saveDraftOrder(body);
          json(res, { ok: true, id });
          return;
        }
        json(res, { ok: true, fallback: true });
        return;
      }

      if (url.pathname === '/api/pipeline' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          json(res, { items: await listPipeline() });
          return;
        }
        json(res, { items: [] });
        return;
      }

      if (url.pathname === '/api/documents' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          json(res, { documents: await listDocuments() });
          return;
        }
        json(res, { documents: [] });
        return;
      }

      if (url.pathname === '/api/notifications' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          json(res, { notifications: await listNotifications() });
          return;
        }
        json(res, { notifications: [] });
        return;
      }

      if (url.pathname === '/api/notifications/read' && req.method === 'POST') {
        if (await isDatabaseAvailable()) {
          await markAllNotificationsRead();
        }
        json(res, { ok: true });
        return;
      }

      if (url.pathname === '/api/overview' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          const stats = await getOverviewStats();
          const activity = await listRecentActivity(undefined, 5);
          const pipeline = await listPipeline();
          json(res, {
            stats: {
              active_searches: Number(stats.active_searches ?? 0),
              catalog_total: Number(stats.catalog_total ?? 0),
              selected_count: Number(stats.selected_count ?? 0),
              pipeline_count: Number(stats.pipeline_count ?? 0),
              pipeline_capital: Number(stats.pipeline_capital ?? 0),
            },
            activity,
            pipeline: pipeline.slice(0, 3).map((p) => ({
              code: p.code,
              place: p.location,
              status: p.stage,
              pct: p.pct,
            })),
          });
          return;
        }
        json(res, { stats: null, activity: [], pipeline: [] });
        return;
      }

      if (url.pathname === '/api/saved' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          const rows = await listSaved();
          json(res, {
            items: rows.map((r) => {
              const ticketMin = r.ticket_low_eur != null ? Number(r.ticket_low_eur) : null;
              const ticketMax = r.ticket_high_eur != null ? Number(r.ticket_high_eur) : null;
              const mid =
                ticketMin != null && ticketMax != null
                  ? (ticketMin + ticketMax) / 2
                  : ticketMax ?? ticketMin ?? 0;
              const ticket =
                mid >= 1_000_000
                  ? `€${(mid / 1_000_000).toFixed(1)}M`
                  : `€${Math.round(mid / 1000)}K`;
              return {
                id: r.object_id,
                code: r.object_id,
                location: r.district ?? '—',
                type: r.asset_type ?? '—',
                thesis: r.strategy_label ?? '—',
                risk: 'medium',
                score: Math.round(Number(r.score ?? 0)),
                ticket,
              };
            }),
          });
          return;
        }
        json(res, { items: [] });
        return;
      }

      if (url.pathname === '/api/mandate/summary' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          const rows = await listMandateSummary();
          json(res, { items: rows });
          return;
        }
        json(res, { items: [] });
        return;
      }

      if (url.pathname === '/api/order' && req.method === 'POST') {
        const text = await readBody(req);
        const body = JSON.parse(text || '{}');
        const catalog = await buildCatalogFromOrder(body);
        await fs.mkdir(path.dirname(DEFAULT_CATALOG), { recursive: true });
        await fs.writeFile(DEFAULT_CATALOG, JSON.stringify(catalog, null, 2), 'utf8');

        if (await isDatabaseAvailable()) {
          await createScoutingOrder({
            strategy: body.strategy,
            strategyLabel: body.strategyLabel,
            country: body.country ?? 'Germany',
            state: body.state,
            city: body.city,
            radiusKm: body.radiusKm ?? 40,
            ticket: body.ticket,
            assetTypes: body.assetTypes,
            signals: body.signals,
            estimatedScanScope: body.estimatedScanScope,
          });
        }

        json(res, { ok: true, catalog });
        return;
      }

      if (url.pathname === '/api/dossier' && req.method === 'GET') {
        const id = url.searchParams.get('id');
        const raw = await loadCatalogPayload();
        const dossier = raw.dossiers?.[id ?? ''];
        if (!dossier) {
          json(res, { error: 'Not found' }, 404);
          return;
        }
        json(res, dossier);
        return;
      }

      if (url.pathname === '/api/evaluations' && req.method === 'GET') {
        if (await isDatabaseAvailable()) {
          const evaluations = await listEvaluationsFromDb();
          if (evaluations.length) {
            json(res, { evaluations });
            return;
          }
        }
        json(res, { evaluations: await listEvaluations() });
        return;
      }

      if (url.pathname === '/api/evaluation/cost-table' && req.method === 'GET') {
        json(res, { components: await loadCostTable() });
        return;
      }

      if (url.pathname === '/api/evaluation/sample' && req.method === 'POST') {
        const intake = buildSample28UnitIntake();
        let record = await createEvaluation({
          object_id: intake.object_id,
          mandate_id: intake.mandate_id,
          intake,
        });
        record = await runEvaluationPipeline(record);
        json(res, { evaluation: record });
        return;
      }

      if (url.pathname === '/api/evaluation' && req.method === 'GET') {
        const objectId = url.searchParams.get('object_id');
        const evalId = url.searchParams.get('eval_id');
        const record = await findEvaluationByObject(objectId ?? '', evalId ?? undefined);
        if (!record) {
          json(res, { error: 'Not found' }, 404);
          return;
        }
        json(res, record);
        return;
      }

      if (url.pathname === '/api/evaluation/start' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        const objectId = String(body.object_id ?? '');
        if (!objectId) {
          json(res, { error: 'object_id required' }, 400);
          return;
        }

        let existing = await findEvaluationByObject(objectId);
        if (existing) {
          json(res, { evaluation: existing });
          return;
        }

        const intake = {
          ...(body.intake ?? {}),
          object_id: objectId,
          documents_received: body.documents_received ?? [],
        };
        let record = await createEvaluation({
          object_id: objectId,
          mandate_id: body.mandate_id ?? null,
          intake,
        });
        syncDocumentsFromIntake(record);
        await saveEvaluation(record);
        json(res, { evaluation: record });
        return;
      }

      const evalRunMatch = url.pathname.match(/^\/api\/evaluation\/([^/]+)\/run$/);
      if (evalRunMatch && req.method === 'POST') {
        let record = await loadEvaluation(evalRunMatch[1]);
        record = await runEvaluationPipeline(record);
        json(res, { evaluation: record });
        return;
      }

      const evalReportMatch = url.pathname.match(/^\/api\/evaluation\/([^/]+)\/report$/);
      if (evalReportMatch && req.method === 'GET') {
        const record = await loadEvaluation(evalReportMatch[1]);
        const html = renderReportHtml(record);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      const evalFactMatch = url.pathname.match(/^\/api\/evaluation\/([^/]+)\/facts$/);
      if (evalFactMatch && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        let record = await loadEvaluation(evalFactMatch[1]);
        if (body.key != null) {
          confirmFact(record, String(body.key), body.value, body.confirmed_by ?? 'office');
        }
        if (body.intake) {
          record.intake = { ...record.intake, ...body.intake };
        }
        record = await runEvaluationPipeline(record);
        json(res, { evaluation: record });
        return;
      }

      const evalCapexMatch = url.pathname.match(/^\/api\/evaluation\/([^/]+)\/capex$/);
      if (evalCapexMatch && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        let record = await loadEvaluation(evalCapexMatch[1]);
        const costTable = await loadCostTable();
        if (body.component) {
          updateCapexComponent(record, String(body.component), body.patch ?? {}, costTable);
        }
        record = await recomputeFromCapex(record);
        json(res, { evaluation: record });
        return;
      }

      const relativePath =
        url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
      const filePath = path.normalize(path.join(CLIENT, relativePath));
      if (!filePath.startsWith(CLIENT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      try {
        const { data, type } = await serveStatic(filePath);
        res.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': cacheControlFor(relativePath),
        });
        res.end(data);
      } catch {
        const { data, type } = await serveStatic(path.join(CLIENT, 'index.html'));
        res.writeHead(200, {
          'Content-Type': type,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(data);
      }
    } catch (err) {
      json(res, { error: err.message }, 500);
    }
  });

  server.listen(port, () => {
    console.log(`Antberg Program → http://localhost:${port}`);
    console.log(`  Internal link: http://localhost:${port}/access/${ACCESS_TOKEN}`);
    console.log(`  Admin panel:   http://localhost:${port}/admin/login`);
    console.log(`  Serving UI from ${CLIENT}`);
    console.log(`  Database: ${dbOk ? 'connected (MySQL)' : 'unavailable — using JSON files'}`);
    console.log(`  Build: ${BUILD_ID}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
