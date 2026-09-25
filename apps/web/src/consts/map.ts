/**
 * OpenStreetMap's own tile server. Attribution is a licence condition, not decoration, and it
 * is the same ODbL obligation the venue coordinates already carry.
 */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Street level. Used when there is nothing to fit bounds to — one pin, or none. */
export const SINGLE_PIN_ZOOM = 15;
