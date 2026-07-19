/**
 * @typedef {Object} BuildingLink
 * @property {unknown} gml_id
 * @property {string|null} function_name
 * @property {unknown} lage_id
 * @property {unknown} hochhaus
 * @property {boolean} is_residential
 */

/**
 * @typedef {Object} ParcelCandidate
 * @property {string} feature_id
 * @property {string} flurstueckskennzeichen
 * @property {number} parcel_m2
 * @property {number} centroid_x
 * @property {number} centroid_y
 * @property {number} radius
 * @property {unknown} gemarkung_name
 * @property {unknown} flurnummer
 * @property {unknown} zaehler
 * @property {unknown} nenner
 * @property {unknown} gemeinde_name
 * @property {BuildingLink[]} buildings
 * @property {Set<string>} addresses
 * @property {Set<string>} land_uses
 * @property {string[]} legal_entries
 * @property {string[]} infrastructure
 * @property {string|null} nearest_street
 * @property {number} nearest_street_dist
 * @property {number|null} soil_bodenzahl
 * @property {number|null} soil_ackerzahl
 * @property {string|null} soil_nutzungsart
 * @property {number|null} soil_year
 * @property {string|null} land_valuation_class
 * @property {boolean} heritage_detected
 */

/**
 * @typedef {Object} PropertyOverlay
 * @property {boolean} [heritage_protected]
 * @property {boolean} [allows_densification]
 * @property {number} [allowed_floors]
 * @property {number} [built_floors]
 * @property {number} [allowed_gfa]
 * @property {number} [built_gfa]
 * @property {number} [construction_year]
 * @property {number} [last_renovation_year]
 * @property {'oil'|'old_gas'|'modern'|string} [heating_signal]
 */

/**
 * @typedef {Object} ScoredProperty
 * @property {string} flurstueckskennzeichen
 * @property {string|null} address
 * @property {string|null} nearest_street
 * @property {string|null} municipality
 * @property {number} parcel_m2
 * @property {string|null} land_use
 * @property {string|null} legal_restrictions
 * @property {string|null} land_valuation_class
 * @property {number|null} soil_bodenzahl
 * @property {number|null} soil_ackerzahl
 * @property {string|null} soil_nutzungsart
 * @property {number|null} built_floors
 * @property {number|null} allowed_floors
 * @property {number|null} built_gfa
 * @property {number|null} allowed_gfa
 * @property {number|null} utilization_pct
 * @property {number|null} construction_year
 * @property {string|null} renovation_status
 * @property {string|null} heating_signal
 * @property {number} floor_upside_score
 * @property {number} utilization_gap_score
 * @property {number} renovation_neglect_score
 * @property {number} heating_distress_score
 * @property {number} age_bonus_score
 * @property {number} parcel_bonus_score
 * @property {number} total_score
 * @property {string} score_reason
 * @property {string[]} data_gaps
 * @property {number} building_count
 * @property {number} residential_building_count
 * @property {number} infrastructure_count
 * @property {number} centroid_x
 * @property {number} centroid_y
 */

export {};
