-- Antberg Platform — MySQL schema (compatible with MySQL 5.7+ and 8.0)
-- Import in MySQL Workbench: File → Open SQL Script → Run (⚡)
-- Check version first: SELECT VERSION();
-- JSON fields use LONGTEXT so older servers accept the script.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS antberg
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE antberg;

-- ---------------------------------------------------------------------------
-- ORGANISATIONS & ACCESS (internal platform / special link)
-- ---------------------------------------------------------------------------

CREATE TABLE clients (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255)    NOT NULL,
  slug          VARCHAR(64)     NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     BIGINT UNSIGNED NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  display_name  VARCHAR(255)    NOT NULL,
  role          ENUM('admin','analyst','client') NOT NULL DEFAULT 'client',
  password_hash VARCHAR(255)    NULL COMMENT 'scrypt hash for platform login',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at DATETIME        NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_client (client_id),
  KEY idx_users_role (role),
  CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB;

CREATE TABLE admin_sessions (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  token_hash    CHAR(64)        NOT NULL COMMENT 'SHA-256 of session bearer token',
  expires_at    DATETIME        NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_sessions_token (token_hash),
  KEY idx_admin_sessions_user (user_id),
  KEY idx_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE access_tokens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     BIGINT UNSIGNED NOT NULL,
  token_hash    CHAR(64)        NOT NULL COMMENT 'SHA-256 of raw token (never store plain token)',
  label         VARCHAR(128)    NULL,
  expires_at    DATETIME     NULL,
  revoked_at    DATETIME     NULL,
  last_used_at  DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_access_tokens_hash (token_hash),
  KEY idx_access_tokens_client (client_id),
  CONSTRAINT fk_access_tokens_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- C1 SCOUTING ORDERS
-- ---------------------------------------------------------------------------

CREATE TABLE scouting_orders (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id       BIGINT UNSIGNED NOT NULL,
  created_by      BIGINT UNSIGNED NULL,
  status          ENUM('draft','active','scanning','completed','cancelled') NOT NULL DEFAULT 'draft',
  strategy_id     VARCHAR(32)     NOT NULL COMMENT 'value_add, buy_hold, fix_flip, …',
  strategy_label  VARCHAR(64)     NOT NULL,
  country         VARCHAR(64)     NOT NULL DEFAULT 'Germany',
  state           VARCHAR(128)    NULL,
  city            VARCHAR(128)    NOT NULL,
  radius_km       INT UNSIGNED    NOT NULL DEFAULT 40,
  ticket_min_eur  DECIMAL(14,2)   NULL,
  ticket_max_eur  DECIMAL(14,2)   NULL,
  exclude_monuments      TINYINT(1) NOT NULL DEFAULT 0,
  exclude_single_family  TINYINT(1) NOT NULL DEFAULT 0,
  estimated_scan_scope   INT UNSIGNED NULL,
  submitted_at    DATETIME     NULL,
  completed_at    DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scouting_orders_client_status (client_id, status),
  CONSTRAINT fk_scouting_orders_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_scouting_orders_user FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE scouting_order_assets (
  scouting_order_id BIGINT UNSIGNED NOT NULL,
  asset_type        VARCHAR(64)     NOT NULL,
  PRIMARY KEY (scouting_order_id, asset_type),
  CONSTRAINT fk_soa_order FOREIGN KEY (scouting_order_id) REFERENCES scouting_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE scouting_order_signals (
  scouting_order_id BIGINT UNSIGNED NOT NULL,
  signal_name       VARCHAR(128)    NOT NULL,
  PRIMARY KEY (scouting_order_id, signal_name),
  CONSTRAINT fk_sos_order FOREIGN KEY (scouting_order_id) REFERENCES scouting_orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- MASTER PROPERTY REGISTRY (from ALKIS + open geo pipeline)
-- ---------------------------------------------------------------------------

CREATE TABLE properties (
  id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  object_id               VARCHAR(32)     NOT NULL COMMENT 'Display ID e.g. STG-000601',
  flurstueckskennzeichen  VARCHAR(32)     NOT NULL COMMENT 'ALKIS parcel key',
  municipality            VARCHAR(128)    NULL,
  district_label          VARCHAR(255)    NULL COMMENT 'District / street level (hidden until mandate)',
  address_full            VARCHAR(512)    NULL COMMENT 'Revealed after mandate',
  parcel_m2               DECIMAL(12,2)   NULL,
  land_use                VARCHAR(255)    NULL,
  asset_type              VARCHAR(64)     NULL,
  centroid_x              DECIMAL(12,3)   NULL,
  centroid_y              DECIMAL(12,3)   NULL,
  gemarkung_name          VARCHAR(128)    NULL,
  legal_restrictions      TEXT            NULL,
  land_valuation_class    VARCHAR(128)    NULL,
  soil_bodenzahl          DECIMAL(8,2)    NULL,
  soil_ackerzahl          DECIMAL(8,2)    NULL,
  building_count          INT UNSIGNED    NULL,
  residential_building_count INT UNSIGNED NULL,
  alkis_export_batch      VARCHAR(128)    NULL COMMENT 'e.g. stuttgart-alkis-2026-07-03',
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_properties_object_id (object_id),
  UNIQUE KEY uq_properties_flurstueck (flurstueckskennzeichen),
  KEY idx_properties_municipality (municipality)
) ENGINE=InnoDB;

CREATE TABLE property_geo_overlay (
  property_id           BIGINT UNSIGNED NOT NULL,
  overlay_version       VARCHAR(64)     NULL,
  allowed_floors          TINYINT UNSIGNED NULL,
  built_floors            TINYINT UNSIGNED NULL,
  allowed_gfa_m2        DECIMAL(12,2)   NULL,
  built_gfa_m2            DECIMAL(12,2)   NULL,
  utilization_pct         DECIMAL(5,2)    NULL,
  construction_year       SMALLINT UNSIGNED NULL,
  last_renovation_year    SMALLINT UNSIGNED NULL,
  heating_signal          VARCHAR(32)     NULL COMMENT 'oil, old_gas, modern',
  gfz                     DECIMAL(6,3)    NULL,
  grz                     DECIMAL(6,3)    NULL,
  fnp_zone                VARCHAR(16)     NULL,
  fnp_land_use_code       VARCHAR(16)     NULL,
  allows_densification    TINYINT(1)      NULL,
  gfz_source              VARCHAR(128)    NULL,
  heating_source          VARCHAR(128)    NULL,
  fetched_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id),
  CONSTRAINT fk_overlay_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE property_scores (
  property_id               BIGINT UNSIGNED NOT NULL,
  floor_upside_score        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  utilization_gap_score     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  renovation_neglect_score  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  heating_distress_score    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  age_bonus_score           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  parcel_bonus_score        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  total_score               TINYINT UNSIGNED NOT NULL DEFAULT 0,
  score_reason              TEXT            NULL,
  leading_signal            VARCHAR(255)    NULL,
  data_gaps_json            LONGTEXT        NULL COMMENT 'JSON array',
  scored_at                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_id),
  CONSTRAINT fk_scores_property FOREIGN KEY (property_id) REFERENCES properties (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- C2 CATALOGUE / SCAN RUNS
-- ---------------------------------------------------------------------------

CREATE TABLE scan_runs (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scouting_order_id   BIGINT UNSIGNED NULL,
  client_id           BIGINT UNSIGNED NOT NULL,
  strategy_id         VARCHAR(32)     NOT NULL,
  parcels_scanned     INT UNSIGNED    NOT NULL DEFAULT 0,
  parcels_eliminated  INT UNSIGNED    NOT NULL DEFAULT 0,
  opportunities_found INT UNSIGNED    NOT NULL DEFAULT 0,
  avg_match_score     DECIMAL(5,2)    NULL,
  filter_json         LONGTEXT        NULL COMMENT 'JSON: ticket, asset types, city filters used',
  source_manifest     VARCHAR(512)    NULL,
  generated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_scan_runs_client (client_id),
  KEY idx_scan_runs_order (scouting_order_id),
  CONSTRAINT fk_scan_runs_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_scan_runs_order FOREIGN KEY (scouting_order_id) REFERENCES scouting_orders (id)
) ENGINE=InnoDB;

CREATE TABLE catalog_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  scan_run_id     BIGINT UNSIGNED NOT NULL,
  property_id     BIGINT UNSIGNED NOT NULL,
  rank_position   INT UNSIGNED    NOT NULL,
  match_score     TINYINT UNSIGNED NOT NULL,
  strategy_fit_score TINYINT UNSIGNED NULL,
  ticket_low_eur  DECIMAL(14,2)   NULL,
  ticket_high_eur DECIMAL(14,2)   NULL,
  is_high_priority TINYINT(1)     NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_catalog_scan_property (scan_run_id, property_id),
  KEY idx_catalog_items_score (scan_run_id, match_score),
  CONSTRAINT fk_catalog_scan FOREIGN KEY (scan_run_id) REFERENCES scan_runs (id) ON DELETE CASCADE,
  CONSTRAINT fk_catalog_property FOREIGN KEY (property_id) REFERENCES properties (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- C3 POTENTIAL ANALYSIS (DOSSIER)
-- ---------------------------------------------------------------------------

CREATE TABLE dossiers (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  catalog_item_id   BIGINT UNSIGNED NOT NULL,
  strategy_id       VARCHAR(32)     NOT NULL,
  strategy_label    VARCHAR(64)     NOT NULL,
  strategy_fit_text TEXT            NOT NULL,
  value_today_eur   DECIMAL(14,2)   NULL,
  value_after_eur   DECIMAL(14,2)   NULL,
  upside_low_eur    DECIMAL(14,2)   NULL,
  upside_high_eur   DECIMAL(14,2)   NULL,
  generated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dossiers_catalog (catalog_item_id),
  CONSTRAINT fk_dossiers_catalog FOREIGN KEY (catalog_item_id) REFERENCES catalog_items (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dossier_insights (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dossier_id  BIGINT UNSIGNED NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  weakness    TEXT            NOT NULL,
  upside      TEXT            NOT NULL,
  PRIMARY KEY (id),
  KEY idx_dossier_insights (dossier_id),
  CONSTRAINT fk_insights_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE dossier_risks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  dossier_id  BIGINT UNSIGNED NOT NULL,
  label       TEXT            NOT NULL,
  severity    ENUM('low','medium','high') NOT NULL,
  PRIMARY KEY (id),
  KEY idx_dossier_risks (dossier_id),
  CONSTRAINT fk_risks_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Client engagement tracking (C3 intelligent link)
CREATE TABLE property_views (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       BIGINT UNSIGNED NOT NULL,
  property_id   BIGINT UNSIGNED NOT NULL,
  dossier_id    BIGINT UNSIGNED NULL,
  viewed_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_sec  INT UNSIGNED    NULL,
  PRIMARY KEY (id),
  KEY idx_property_views_user (user_id, viewed_at),
  KEY idx_property_views_property (property_id),
  CONSTRAINT fk_views_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_views_property FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_views_dossier FOREIGN KEY (dossier_id) REFERENCES dossiers (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- C4 SELECTION & MANDATE
-- ---------------------------------------------------------------------------

CREATE TABLE selections (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     BIGINT UNSIGNED NOT NULL,
  user_id       BIGINT UNSIGNED NULL,
  property_id   BIGINT UNSIGNED NOT NULL,
  catalog_item_id BIGINT UNSIGNED NULL,
  status        ENUM('selected','saved','rejected') NOT NULL DEFAULT 'selected',
  selected_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  rejected_at   DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_selection_client_property (client_id, property_id),
  KEY idx_selections_status (client_id, status),
  CONSTRAINT fk_selections_client FOREIGN KEY (client_id) REFERENCES clients (id),
  CONSTRAINT fk_selections_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_selections_property FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_selections_catalog FOREIGN KEY (catalog_item_id) REFERENCES catalog_items (id)
) ENGINE=InnoDB;

CREATE TABLE mandates (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id       BIGINT UNSIGNED NOT NULL,
  reference_code  VARCHAR(32)     NOT NULL,
  status          ENUM('draft','client_signs','active','cancelled') NOT NULL DEFAULT 'draft',
  total_ticket_low_eur  DECIMAL(14,2) NULL,
  total_ticket_high_eur DECIMAL(14,2) NULL,
  signed_at       DATETIME     NULL,
  activated_at    DATETIME     NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mandates_reference (reference_code),
  KEY idx_mandates_client (client_id, status),
  CONSTRAINT fk_mandates_client FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB;

CREATE TABLE mandate_items (
  mandate_id    BIGINT UNSIGNED NOT NULL,
  property_id   BIGINT UNSIGNED NOT NULL,
  selection_id  BIGINT UNSIGNED NULL,
  sort_order    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (mandate_id, property_id),
  CONSTRAINT fk_mandate_items_mandate FOREIGN KEY (mandate_id) REFERENCES mandates (id) ON DELETE CASCADE,
  CONSTRAINT fk_mandate_items_property FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_mandate_items_selection FOREIGN KEY (selection_id) REFERENCES selections (id)
) ENGINE=InnoDB;

CREATE TABLE mandate_contracts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mandate_id    BIGINT UNSIGNED NOT NULL,
  version_no    INT UNSIGNED    NOT NULL DEFAULT 1,
  body_html     MEDIUMTEXT      NULL,
  change_notes  TEXT            NULL,
  created_by    BIGINT UNSIGNED NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mandate_contract_version (mandate_id, version_no),
  CONSTRAINT fk_contracts_mandate FOREIGN KEY (mandate_id) REFERENCES mandates (id) ON DELETE CASCADE,
  CONSTRAINT fk_contracts_user FOREIGN KEY (created_by) REFERENCES users (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- C6 PIPELINE
-- ---------------------------------------------------------------------------

CREATE TABLE pipeline_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  mandate_id      BIGINT UNSIGNED NOT NULL,
  property_id     BIGINT UNSIGNED NOT NULL,
  stage           ENUM('docs','owner_contact','evaluation','offer','closing') NOT NULL DEFAULT 'docs',
  progress_pct    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_line       VARCHAR(512)    NULL,
  blocker_label   VARCHAR(255)    NULL,
  assigned_agent  VARCHAR(128)    NULL,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pipeline_mandate_property (mandate_id, property_id),
  CONSTRAINT fk_pipeline_mandate FOREIGN KEY (mandate_id) REFERENCES mandates (id) ON DELETE CASCADE,
  CONSTRAINT fk_pipeline_property FOREIGN KEY (property_id) REFERENCES properties (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- D6 OBJECT EVALUATION ENGINE
-- ---------------------------------------------------------------------------

CREATE TABLE capex_cost_components (
  component     VARCHAR(32)     NOT NULL,
  label         VARCHAR(128)    NOT NULL,
  unit          ENUM('m2','unit','flat') NOT NULL,
  cost_low_eur  DECIMAL(10,2)   NOT NULL,
  cost_high_eur DECIMAL(10,2)   NOT NULL,
  updated_by    VARCHAR(128)    NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (component)
) ENGINE=InnoDB;

CREATE TABLE evaluations (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  eval_code       VARCHAR(16)     NOT NULL COMMENT 'Short ID e.g. 8548e4a9',
  property_id     BIGINT UNSIGNED NOT NULL,
  mandate_id      BIGINT UNSIGNED NULL,
  pipeline_item_id BIGINT UNSIGNED NULL,
  status          ENUM('draft','facts_pending','verified','computed','reported') NOT NULL DEFAULT 'draft',
  confidence_pct  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  missing_docs_json LONGTEXT          NULL COMMENT 'JSON array',
  intake_json     LONGTEXT            NULL COMMENT 'JSON: raw intake / document checklist state',
  income_json     LONGTEXT            NULL,
  location_json   LONGTEXT            NULL,
  verification_json LONGTEXT          NULL,
  report_json     LONGTEXT            NULL,
  recommendation  ENUM('buy','negotiate','reject','need_documents','need_inspection') NULL,
  safe_offer_low_eur  DECIMAL(14,2) NULL,
  safe_offer_high_eur DECIMAL(14,2) NULL,
  do_not_exceed_eur   DECIMAL(14,2) NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_evaluations_code (eval_code),
  KEY idx_evaluations_property (property_id),
  KEY idx_evaluations_mandate (mandate_id),
  CONSTRAINT fk_evaluations_property FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_evaluations_mandate FOREIGN KEY (mandate_id) REFERENCES mandates (id),
  CONSTRAINT fk_evaluations_pipeline FOREIGN KEY (pipeline_item_id) REFERENCES pipeline_items (id)
) ENGINE=InnoDB;

CREATE TABLE evaluation_documents (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluation_id   BIGINT UNSIGNED NOT NULL,
  doc_type        VARCHAR(32)     NOT NULL,
  label           VARCHAR(128)    NOT NULL,
  filename        VARCHAR(512)    NULL,
  storage_path    VARCHAR(1024)   NULL,
  status          ENUM('pending','received','verified') NOT NULL DEFAULT 'pending',
  uploaded_at     DATETIME     NULL,
  PRIMARY KEY (id),
  KEY idx_eval_docs (evaluation_id, status),
  CONSTRAINT fk_eval_docs_eval FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_facts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluation_id   BIGINT UNSIGNED NOT NULL,
  fact_key        VARCHAR(64)     NOT NULL,
  fact_value      TEXT            NULL,
  unit            VARCHAR(32)     NULL,
  source_doc_id   BIGINT UNSIGNED NULL,
  extracted_by    ENUM('system','human') NOT NULL DEFAULT 'system',
  confirmed_by    VARCHAR(128)    NULL,
  confirmed_at    DATETIME     NULL,
  note            TEXT            NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_eval_fact_key (evaluation_id, fact_key),
  CONSTRAINT fk_eval_facts_eval FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE,
  CONSTRAINT fk_eval_facts_doc FOREIGN KEY (source_doc_id) REFERENCES evaluation_documents (id)
) ENGINE=InnoDB;

CREATE TABLE evaluation_capex_items (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluation_id   BIGINT UNSIGNED NOT NULL,
  component       VARCHAR(32)     NOT NULL,
  condition_level ENUM('good','fair','poor','critical') NOT NULL,
  urgency         ENUM('low','medium','high','urgent') NOT NULL,
  cost_low_eur    DECIMAL(14,2)   NOT NULL,
  cost_high_eur   DECIMAL(14,2)   NOT NULL,
  note            TEXT            NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_eval_capex (evaluation_id, component),
  CONSTRAINT fk_eval_capex_eval FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_valuations (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluation_id   BIGINT UNSIGNED NOT NULL,
  method          ENUM('ertragswert','sachwert','vergleichswert','bank') NOT NULL,
  value_low_eur   DECIMAL(14,2)   NOT NULL,
  value_high_eur  DECIMAL(14,2)   NOT NULL,
  inputs_json     LONGTEXT            NOT NULL COMMENT 'JSON object',
  explanation     TEXT            NULL,
  PRIMARY KEY (id),
  KEY idx_eval_valuations (evaluation_id, method),
  CONSTRAINT fk_eval_valuations_eval FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE evaluation_scenarios (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  evaluation_id       BIGINT UNSIGNED NOT NULL,
  scenario            ENUM('as_is','renovate_hold','renovate_sell') NOT NULL,
  label               VARCHAR(64)     NOT NULL,
  total_cost_low_eur  DECIMAL(14,2)   NOT NULL,
  total_cost_high_eur DECIMAL(14,2)   NOT NULL,
  exit_value_low_eur  DECIMAL(14,2)   NOT NULL,
  exit_value_high_eur DECIMAL(14,2)   NOT NULL,
  profit_low_eur      DECIMAL(14,2)   NOT NULL,
  profit_high_eur     DECIMAL(14,2)   NOT NULL,
  max_offer_low_eur   DECIMAL(14,2)   NOT NULL,
  max_offer_high_eur  DECIMAL(14,2)   NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_eval_scenario (evaluation_id, scenario),
  CONSTRAINT fk_eval_scenarios_eval FOREIGN KEY (evaluation_id) REFERENCES evaluations (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- C5 OFFERS
-- ---------------------------------------------------------------------------

CREATE TABLE offers (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  property_id     BIGINT UNSIGNED NOT NULL,
  mandate_id      BIGINT UNSIGNED NOT NULL,
  evaluation_id   BIGINT UNSIGNED NULL,
  status          ENUM('none','in_preparation','submitted','confirmed','withdrawn') NOT NULL DEFAULT 'none',
  offer_amount_eur DECIMAL(14,2)  NULL,
  prepared_at     DATETIME     NULL,
  confirmed_at    DATETIME     NULL,
  notes           TEXT            NULL,
  PRIMARY KEY (id),
  KEY idx_offers_mandate (mandate_id, status),
  CONSTRAINT fk_offers_property FOREIGN KEY (property_id) REFERENCES properties (id),
  CONSTRAINT fk_offers_mandate FOREIGN KEY (mandate_id) REFERENCES mandates (id),
  CONSTRAINT fk_offers_evaluation FOREIGN KEY (evaluation_id) REFERENCES evaluations (id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- ACTIVITY LOG (audit trail — D6 requirement)
-- ---------------------------------------------------------------------------

CREATE TABLE activity_log (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id     BIGINT UNSIGNED NULL,
  user_id       BIGINT UNSIGNED NULL,
  entity_type   VARCHAR(64)     NOT NULL COMMENT 'property, evaluation, mandate, order, …',
  entity_id     BIGINT UNSIGNED NULL,
  action        VARCHAR(128)    NOT NULL,
  detail_json   LONGTEXT            NULL COMMENT 'JSON object',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_client_time (client_id, created_at),
  KEY idx_activity_entity (entity_type, entity_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
