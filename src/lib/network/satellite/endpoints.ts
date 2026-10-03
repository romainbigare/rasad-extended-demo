export const SATELLITE_ENDPOINTS = {
  CATALOG: "/satellite/",
  INDICES: "/satellite/indices",
  DATES: "/satellite/dates",
  NEXT_ACQUISITION: "/satellite/next-acquisition",
  FIELD_IMAGERY: "/satellite/field-imagery",
} as const;

/** `GET /satellite/` (`?farm_id=`) -- the satellites this farm actually has
 * data for, and each one's available index aliases. Drives both the
 * multi-select dropdown's options and the index-select's per-satellite
 * gating, so the index list is never hardcoded. */
export type SatelliteCatalogEntry = {
  satellite: string;
  indices: string[];
};

export type SatelliteIndexEntry = {
  category: string;
  rank: number;
  description: string | null;
  alias: string;
  process: boolean;
  statistics: boolean;
  satellite: string;
  is_available: boolean;
};

export type SatelliteDateItem = {
  satellite: string;
  spacecraft_id: string | null;
  datetime: string; // ISO 8601, UTC
  cloud_cover: number | null;
  is_active: boolean;
};

export type NextAcquisitionItem = {
  satellite: string;
  last_pass_date: string; // YYYY-MM-DD
  next_estimated_date: string; // YYYY-MM-DD
  repeat_cycle_days: number;
};

/** `GET /satellite/field-imagery` legend entry -- one class/break in the
 * rendered raster, in the same units as `unit` below. */
export type FieldImageryLegendEntry = {
  hex: string;
  min: number;
  max: number;
  unit?: string;
  area: number;
  "area%": string;
};

export type FieldImageryResponse = {
  image: string;
  dynamic: boolean;
  legends: FieldImageryLegendEntry[];
  unit: "hectare" | "acre";
};
