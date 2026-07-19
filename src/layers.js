/**
 * Layers without geometry (WFS abstract: "ohne Geometrien").
 * BBOX GetFeature fails; fetch via FES filter on reference layer IDs instead.
 * @type {Record<string, { referenceLayer: string, referenceProperty: string, matchProperty: string, batchSize?: number }>}
 */
export const NON_SPATIAL_LAYERS = {
  v_al_zuordnung_lagebezeichnung: {
    referenceLayer: 'v_al_lagebezeichnung',
    referenceProperty: 'gml_id',
    matchProperty: 'gml_id_lagebezeichnung',
    batchSize: 200,
  },
};

/** All nora:v_al_* ALKIS layers from WFS_LGL-BW_ALKIS capabilities */
export const ALKIS_LAYERS = [
  'v_al_flurstueck',
  'v_al_gebaeude',
  'v_al_grenzpunkt',
  'v_al_sonstiger_punkt',
  'v_al_tatsaechliche_nutzung',
  'v_al_bauwerk_einrichtung_p',
  'v_al_bauwerk_einrichtung_l',
  'v_al_bauwerk_einrichtung_f',
  'v_al_festlegung_recht',
  'v_al_strasse_gewann',
  'v_al_lagebezeichnung',
  'v_al_zuordnung_lagebezeichnung',
  'v_al_grenzlinie',
  'v_al_flur',
  'v_al_gemarkung',
  'v_al_gemeinde',
  'v_al_kreis',
  'v_al_region',
  'v_al_regierungsbezirk',
  'v_al_land',
  'v_al_label_nummer1',
  'v_al_label_nummer2',
  'v_al_label_name1',
  'v_al_label_name2',
  'v_al_label_nutzung',
  'v_al_label_punktnummer',
  'v_al_bodenbewertung',
  'v_al_bodenschaetzung_f',
  'v_al_grabloch',
  'v_al_vergleichsstueck',
  'v_al_tagesabschnitt',
];
