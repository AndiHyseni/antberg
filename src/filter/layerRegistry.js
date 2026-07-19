/**
 * ALKIS layers used by the redevelopment filter and why others are skipped.
 */

/** @type {{ layer: string, role: string, fields: string[] }[]} */
export const FILTER_INPUT_LAYERS = [
  {
    layer: 'v_al_flurstueck',
    role: 'Core parcel geometry and size',
    fields: ['flurstueckskennzeichen', 'amtliche_flaeche', 'gemeinde_name', 'centroid_x', 'centroid_y'],
  },
  {
    layer: 'v_al_gebaeude',
    role: 'Buildings on parcel (residential check)',
    fields: ['gebaeudefunktion_name', 'lage_id', 'hochhaus'],
  },
  {
    layer: 'v_al_lagebezeichnung',
    role: 'Street names and house numbers',
    fields: ['lage_id', 'lagebezeichnung', 'hausnummer'],
  },
  {
    layer: 'v_al_tatsaechliche_nutzung',
    role: 'Actual land use (developable vs forest/road)',
    fields: ['unterart_name', 'objektname'],
  },
  {
    layer: 'v_al_festlegung_recht',
    role: 'Legal restrictions (heritage / planning law signals)',
    fields: ['objektname', 'unterart_name', 'eigenname'],
  },
  {
    layer: 'v_al_strasse_gewann',
    role: 'Nearest street / Gewann name',
    fields: ['lagebezeichnung'],
  },
  {
    layer: 'v_al_bodenschaetzung_f',
    role: 'Soil assessment (proxy for land quality)',
    fields: ['bodenzahl', 'ackerzahl', 'nutzungsart_name', 'jahr'],
  },
  {
    layer: 'v_al_bodenbewertung',
    role: 'Land valuation classification',
    fields: ['klassifizierung_name', 'flaeche'],
  },
  {
    layer: 'v_al_bauwerk_einrichtung_l',
    role: 'Linear infrastructure intersecting parcel',
    fields: ['objektname', 'unterart_name'],
  },
  {
    layer: 'v_al_bauwerk_einrichtung_f',
    role: 'Area infrastructure on parcel',
    fields: ['objektname', 'unterart_name'],
  },
];

/** @type {{ layer: string, reason: string }[]} */
export const FILTER_SKIPPED_LAYERS = [
  { layer: 'v_al_grenzpunkt', reason: 'Cadastral points — no scoring attributes' },
  { layer: 'v_al_sonstiger_punkt', reason: 'Misc points — no scoring attributes' },
  { layer: 'v_al_grenzlinie', reason: 'Boundary lines — geometry only' },
  { layer: 'v_al_bauwerk_einrichtung_p', reason: 'Only 14 features in Stuttgart export' },
  { layer: 'v_al_zuordnung_lagebezeichnung', reason: 'Join table; addresses resolved via building lage_id' },
  { layer: 'v_al_flur', reason: 'Admin unit; already on parcel' },
  { layer: 'v_al_gemarkung', reason: 'Admin unit; already on parcel' },
  { layer: 'v_al_gemeinde', reason: 'Admin boundary' },
  { layer: 'v_al_kreis', reason: 'Admin boundary' },
  { layer: 'v_al_region', reason: 'Admin boundary' },
  { layer: 'v_al_regierungsbezirk', reason: 'Admin boundary' },
  { layer: 'v_al_land', reason: 'Admin boundary' },
  { layer: 'v_al_label_nummer1', reason: 'Map label text' },
  { layer: 'v_al_label_nummer2', reason: 'Map label text' },
  { layer: 'v_al_label_name1', reason: 'Map label text' },
  { layer: 'v_al_label_name2', reason: 'Map label text' },
  { layer: 'v_al_label_nutzung', reason: 'Map label text' },
  { layer: 'v_al_label_punktnummer', reason: 'Map label text' },
  { layer: 'v_al_grabloch', reason: 'Survey excavation points' },
  { layer: 'v_al_vergleichsstueck', reason: 'Valuation comparison plots' },
  { layer: 'v_al_tagesabschnitt', reason: 'Survey session metadata' },
];

export const FILTER_LAYER_NAMES = FILTER_INPUT_LAYERS.map((entry) => entry.layer);
