export const FARM_ENDPOINTS = {
  FARMS: "/api/v1/farms/",
  FARM_BY_ID: (farmId: string | number) => `/api/v1/farms/${farmId}`,
  FARM_MONITORING: (farmId: string | number) =>
    `/api/v1/farms/${farmId}/monitoring`,
  FIELD_MONITORING: (farmId: string | number, fieldId: string | number) =>
    `/api/v1/farms/${farmId}/fields/${fieldId}/monitoring`,
  FIELDS: "/api/v1/fields/",
  FIELDS_BY_FARM: (farmId: string | number) =>
    `/api/v1/fields/?farm_id=${farmId}`,
  PORTFOLIO_SUMMARY: "/api/v1/analytics/portfolio-summary",
  FIELD_MODEL_VERSIONS: "/api/v1/analytics/field-model-versions",
} as const;

export type PortfolioSummary = {
  total_farms: number;
  total_fields: number;
  total_trees: number;
  tree_split: {
    date_palm: { count: number; pct: number | null };
    other: { count: number; pct: number | null };
  };
  boundary_verified_pct: number | null;
};

export type FarmServiceFarm = {
  id: number;
  uid: string;
  name?: string | null;
  owner_name: string | null;
  area_ha: string | null;
  area_dunum: string | null;
  boundary: string | null; // WKT, SRID 3857
  zone_id: number | null;
  imagery_batch: number | null;
  org_id: number | null;
  created_at: string;
  updated_at: string;
};

export type FarmServiceField = {
  id: number;
  uid: string;
  farm_id: number;
  owner_name: string | null;
  area_ha: string | null;
  area_dunum: string | null;
  boundary: string | null; // WKT, SRID 3857
  imagery_batch: number | null;
  created_at: string;
  updated_at: string;
};
