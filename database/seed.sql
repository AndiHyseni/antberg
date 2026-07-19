-- Antberg — seed data for local MySQL Workbench
USE antberg;

INSERT INTO clients (id, name, slug) VALUES
  (1, 'Freeman Capital Partners', 'freeman-capital')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO users (id, client_id, email, display_name, role) VALUES
  (1, 1, 'alex@freemancapital.example', 'Alex Freeman', 'client')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

-- Access tokens: insert after hashing your token (never store plain text).
-- In Node: crypto.createHash('sha256').update('your-token').digest('hex')
-- Example:
-- INSERT INTO access_tokens (client_id, token_hash, label)
-- VALUES (1, '<sha256-hex>', 'Local dev link');

-- D6 capex cost table (office-editable defaults)
INSERT INTO capex_cost_components (component, label, unit, cost_low_eur, cost_high_eur, updated_by) VALUES
  ('roof',            'Roof',                    'm2',   85,   140, 'system'),
  ('facade',          'Facade',                  'm2',  120,   220, 'system'),
  ('windows',         'Windows',                 'm2',  450,   750, 'system'),
  ('heating',         'Heating system',          'unit', 12000, 22000, 'system'),
  ('electricity',     'Electrical installation', 'unit', 3500,  8000, 'system'),
  ('pipes',           'Pipes / sanitation',      'unit', 4500,  9000, 'system'),
  ('bathrooms',       'Bathrooms',               'unit', 8000, 15000, 'system'),
  ('floors',          'Floors / interior',       'm2',   45,    95, 'system'),
  ('basement',        'Basement / cellar',       'm2',   35,    75, 'system'),
  ('moisture',        'Moisture remediation',    'flat', 8000, 25000, 'system'),
  ('fire_protection', 'Fire protection',         'flat', 5000, 18000, 'system'),
  ('energy_upgrade',  'Energy upgrade package',  'm2',  180,   320, 'system'),
  ('common_areas',    'Common areas',            'm2',  250,   450, 'system')
ON DUPLICATE KEY UPDATE
  cost_low_eur = VALUES(cost_low_eur),
  cost_high_eur = VALUES(cost_high_eur),
  updated_at = CURRENT_TIMESTAMP;
