export type StrategyId =
  | 'value_add'
  | 'buy_hold'
  | 'fix_flip'
  | 'core'
  | 'distressed'
  | 'repositioning'
  | 'development';

export interface CatalogCard {
  object_id: string;
  district: string;
  asset_type: string;
  score: number;
  ticket_range: string;
  leading_signal: string;
  centroid_x?: number;
  centroid_y?: number;
}

export interface DossierValues {
  today: number;
  today_label: string;
  after: number;
  after_label: string;
  upside_range: string;
  upside_low: number;
  upside_high: number;
}

export interface WeaknessUpside {
  weakness: string;
  upside: string;
}

export interface DossierRisk {
  label: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Dossier {
  object_id: string;
  flurstueckskennzeichen: string;
  strategy_id: string;
  strategy_label: string;
  asset_type: string;
  district: string;
  municipality: string | null;
  score: number;
  ticket_range: string;
  ticket_low: number;
  ticket_high: number;
  leading_signal: string;
  parcel_m2: number;
  land_use: string | null;
  strategy_fit: string;
  weakness_upside: WeaknessUpside[];
  values: DossierValues;
  risks: DossierRisk[];
  data_gaps: string[];
  built_gfa?: number | null;
  allowed_gfa?: number | null;
}

export interface Catalog {
  generated_at: string;
  strategy_id: string;
  context: {
    opportunities_found: number;
    scanned: number;
    eliminated: number;
    context_line: string;
  };
  cards: CatalogCard[];
  dossiers: Record<string, Dossier>;
}

export interface ScoutingOrder {
  strategy: StrategyId;
  strategyLabel: string;
  country: string;
  state: string;
  city: string;
  radiusKm: number;
  assetTypes: string[];
  ticketMin: number;
  ticketMax: number;
  signals: string[];
  exclusions: string[];
}

export type OrderStep = 1 | 2 | 3 | 4 | 5 | 6;

export const STRATEGY_OPTIONS: { id: StrategyId; label: string }[] = [
  { id: 'value_add', label: 'Value Add' },
  { id: 'distressed', label: 'Distressed' },
  { id: 'repositioning', label: 'Repositioning' },
  { id: 'core', label: 'Core' },
  { id: 'buy_hold', label: 'Buy and Hold' },
  { id: 'development', label: 'Development' },
];

export const SIGNAL_OPTIONS = [
  'Energy pressure',
  'Zoning upside',
  'Underutilized land',
  'Low rent vs market',
  'Ownership age',
  'Distress signals',
];

export const ASSET_OPTIONS = ['Mixed-Use', 'Residential', 'Commercial', 'Industrial', 'Land'];
