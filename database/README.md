# Antberg MySQL database

Schema for the full platform: scouting orders → catalogue → dossiers → selections → mandates → pipeline → D6 evaluations → offers.

## Import in MySQL Workbench

**Requires MySQL 5.7+** (recommended: **MySQL 8.0**). Workbench 8.0 is just the UI — check your server version:

```sql
SELECT VERSION();
```

If you see `5.5.x` or `5.6.x`, upgrade MySQL Server to 8.0 (or use the compatibility notes below).

1. Open **MySQL Workbench** and connect to your local server (e.g. `localhost:3306`, user `root`).
2. **File → Open SQL Script…** → select `database/schema.sql`
3. Click the **⚡ Execute** button (or Ctrl+Shift+Enter).
4. Optional: run `database/seed.sql` the same way for demo client + capex cost table.

You should see database **`antberg`** with ~30 tables.

## Add data

### Option 1 — Starter rows (Workbench)

Run `database/seed.sql` in Workbench (⚡ Execute). Adds demo client + D6 capex cost table.

### Option 2 — Import your real platform data (recommended)

This loads `data/catalog.json` (100 Stuttgart properties + dossiers) and `data/evaluations/*.json`.

1. Copy env file and set your MySQL password:

```powershell
copy database\.env.example database\.env
# Edit database\.env → set MYSQL_PASSWORD
```

2. Install dependency and import:

```powershell
npm install
npm run import:db -- --reset
```

`--reset` clears previously imported rows (keeps tables). Omit it if you only want to append.

Verify in Workbench:

```sql
USE antberg;
SELECT COUNT(*) FROM properties;
SELECT COUNT(*) FROM catalog_items;
SELECT COUNT(*) FROM dossiers;
SELECT COUNT(*) FROM evaluations;
```

### Option 3 — Manual inserts in Workbench

1. In **Schemas**, expand `antberg` → right-click a table → **Select Rows - Limit 1000**
2. Click **Insert row** (toolbar) or run SQL, e.g.:

```sql
USE antberg;

INSERT INTO clients (name, slug) VALUES ('My Company', 'my-company');

INSERT INTO scouting_orders (
  client_id, strategy_id, strategy_label, city, status
) VALUES (1, 'buy_hold', 'Buy & Hold', 'Stuttgart', 'active');
```

### Data pipeline (future runs)

When you regenerate the catalogue from Excel:

```powershell
npm run export:catalog
npm run import:db -- --reset
```

### Workbench shows red squiggles but server is MySQL 8?

Edit → Preferences → **SQL Editor** → set **SQL Mode** / target version to match your server, or ignore editor warnings and click **Execute** — the server decides, not the syntax highlighter.

### Older MySQL versions

| Issue | Cause | Fix |
|-------|--------|-----|
| `DATETIME(3)` invalid | MySQL &lt; 5.6.4 | Fixed in current `schema.sql` (plain `DATETIME`) |
| `JSON` type invalid | MySQL &lt; 5.7.8 | Fixed — uses `LONGTEXT` with JSON stored as text |
| `DEFAULT CURRENT_TIMESTAMP` on `DATETIME` | MySQL &lt; 5.6.5 | Upgrade to MySQL 8.0 |

## Entity map (matches the app)

| App area | Tables |
|----------|--------|
| Access / clients | `clients`, `users`, `access_tokens` |
| C1 Scouting order | `scouting_orders`, `scouting_order_assets`, `scouting_order_signals` |
| Open geo properties | `properties`, `property_geo_overlay`, `property_scores` |
| C2 Catalogue | `scan_runs`, `catalog_items` |
| C3 Analysis | `dossiers`, `dossier_insights`, `dossier_risks`, `property_views` |
| C4 Mandate | `selections`, `mandates`, `mandate_items`, `mandate_contracts` |
| C6 Pipeline | `pipeline_items` |
| D6 Evaluation | `evaluations`, `evaluation_*`, `capex_cost_components` |
| C5 Offers | `offers` |
| Audit | `activity_log` |

## Data flow

```
ALKIS export + GFZ + Wärmeatlas
        → properties + property_geo_overlay + property_scores
        → scan_runs + catalog_items + dossiers
        → selections → mandates → pipeline_items
        → evaluations (after documents) → offers
```

## Connection settings (for later Node.js integration)

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=antberg
```

## Access tokens

Store **hashed** tokens only (`access_tokens.token_hash`). The app currently uses plain `antberg-internal-2026` in memory; when you wire MySQL, hash with SHA-256 before insert.

## Notes

- `properties.flurstueckskennzeichen` = ALKIS parcel ID (unique key from geo pipeline).
- `properties.object_id` = display code (`STG-000601`) shown in UI.
- JSON columns hold flexible D6 payloads (`intake_json`, `inputs_json`, `report_json`) matching current file-based evaluation store.
- Re-run `schema.sql` on a fresh database only; for changes use migrations later.
