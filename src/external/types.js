/**
 * @typedef {Object} ParcelPoint
 * @property {string} flurstueckskennzeichen
 * @property {number} parcel_m2
 * @property {number} centroid_x
 * @property {number} centroid_y
 */

/**
 * @typedef {Object} ParcelWithBuildings
 * @property {string} flurstueckskennzeichen
 * @property {number} parcel_m2
 * @property {number} centroid_x
 * @property {number} centroid_y
 * @property {{ gml_id?: unknown }[]} buildings
 */

/**
 * @typedef {Object} GfzOverlayEntry
 * @property {string} flurstueckskennzeichen
 * @property {number} allowed_gfa
 * @property {number} allowed_floors
 * @property {boolean} allows_densification
 * @property {number} gfz
 * @property {number} grz
 * @property {string|null} fnp_land_use_code
 * @property {string} fnp_zone
 * @property {string} gfz_source
 */

/**
 * @typedef {Object} HeatingOverlayEntry
 * @property {string} flurstueckskennzeichen
 * @property {number|null} built_gfa
 * @property {number|null} built_floors
 * @property {number|null} construction_year
 * @property {string|null} heating_signal
 * @property {string} heating_source
 */

export {};
