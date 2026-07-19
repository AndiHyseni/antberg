/**
 * D6 test object — 28-apartment mixed-use (PDF definition of done).
 * @param {string} [objectId]
 */
export function buildSample28UnitIntake(objectId = 'STG-TEST28') {
  return {
    object_id: objectId,
    mandate_id: 'MND-SAMPLE-001',
    label: '28-unit mixed-use · Stuttgart-West',
    address: 'Samplestraße 12, 70178 Stuttgart',
    municipality: 'Stuttgart',
    district: 'Stuttgart-West',
    micro_location: 'Near Feuersee · mixed residential / ground-floor retail',
    auto_confirm: true,
    documents_received: [
      'grundbuch',
      'g vz',
      'plans',
      'mietvertraege',
      'energy',
      'photos',
      'expose',
    ],
    living_area_m2: 2180,
    commercial_area_m2: 320,
    unit_count: 28,
    annual_net_rent_eur: 286400,
    annual_market_rent_eur: 312000,
    vacancy_pct: 3.5,
    non_recoverables_eur: 18400,
    maintenance_eur: 22600,
    land_area_m2: 1420,
    bodenrichtwert_eur_m2: 890,
    construction_year: 1962,
    replacement_cost_eur_m2: 2450,
    comparable_price_eur: 4200000,
    comparable_adjustment_pct: -4,
    owner_name: 'Sample Eigentümer GmbH',
    grundschuld_eur: 980000,
    allowed_gfa_m2: 3850,
    built_gfa_m2: 2500,
    location_score: 78,
    transport_note: 'U-Bahn Feuersee 6 min walk',
    rent_level: 'mid-high',
    bebauungsplan_note: 'WR / mixed use · FNP proxy GFZ from scan',
    component_conditions: {
      roof: 'fair',
      facade: 'fair',
      windows: 'fair',
      heating: 'poor',
      electricity: 'good',
      pipes: 'fair',
      bathrooms: 'fair',
      floors: 'good',
      basement: 'good',
      moisture: 'good',
      fire_protection: 'good',
      energy_upgrade: 'fair',
      common_areas: 'fair',
    },
  };
}

export const SAMPLE_OBJECT_ID = 'STG-TEST28';
