export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

export const ADAFSA_FE_URL = (process.env.NEXT_PUBLIC_ADAFSA_FE_URL ?? "").replace(/\/+$/, "");

/** Browser key for Google's Map Tiles API (the official satellite basemap). Empty = the
 * maps show no satellite basemap - there is no fallback (see components/map/googleMapTiles.ts). */
export const GOOGLE_MAPS_API_KEY = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "").trim();

/** "esri" = demo build: Esri World Imagery instead of the Google Map Tiles API (see useOlMap). */
export const BASEMAP = process.env.NEXT_PUBLIC_BASEMAP ?? "google";
