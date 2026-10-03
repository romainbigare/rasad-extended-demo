
export type LandUseClass =
  | "open_agriculture"
  | "protected_agriculture"
  | "structures"
  | "barren_land"
  | "fallow_land";

export interface LandUseEntry {
  class: LandUseClass;
  label: string;
  parcels: number;
  area_ha: number | null;
  area_du: number | null;
  /** Share of all non-fallow land by area, 0-100. null for fallow land. */
  share_pct: number | null;
}

export interface LandUseSummary {
  classes: LandUseEntry[];
  total_area_ha: number | null;
  total_area_du: number | null;
  total_structures: number;
}

export interface LandUseBreakdownRow {
  sub_class: string;
  parcels: number;
  area_ha: number | null;
  area_du: number | null;
  /** Share of the class's area, 0-100. */
  share_pct: number | null;
  farm_count: number;
}

export type OperationsDomain = "open_agriculture" | "protected_agriculture" | "structures";

/** What a category's headline count counts - the UI translates these. */
export type DomainCountUnit = "plots" | "palms" | "trees" | "parcels" | "houses" | "units";

export interface DomainBreakdownRow {
  /** Stable id, e.g. "palm_trees". */
  key: string;
  label: string;
  count: number;
  count_unit: DomainCountUnit;
  /** Share of the domain, 0-100. null when a share doesn't apply (e.g. fallow land). */
  share_pct: number | null;
  area_ha: number | null;
  area_du: number | null;
  /** Current state line, e.g. "Active vegetative & harvesting cycle". */
  status: string | null;
  /** Representative crops/species/assets, e.g. "Tomatoes, Cucumbers, Forage". */
  examples: string | null;
  /** Flags a category that needs attention (drawn in orange instead of green). */
  attention: boolean;
}

export interface DomainSummary {
  domain: OperationsDomain;
  parcels: number;
  /** Distinct farms across all LULC parcels (not just this domain). */
  farms: number;
  footprint_ha: number | null;
  breakdown: DomainBreakdownRow[];
}

export interface ModelVersionOption {
  id: number;
  model_name: string;
  version: string | null;
  approval_status: string | null;
  is_default: boolean;
  tree_count?: number | null;
  field_count?: number | null;
}

export interface TreeSummary {
  total: number;
  date_palm: number;
  fruit: number;
  olive: number;
  native_forest: number;
  /** Estimated date palm yield in tonnes (yield-forecast rollup). null until forecast. */
  date_palm_yield_t: number | null;
  /** Estimated fruit orchard volume in tonnes. null until forecast. */
  fruit_volume_t: number | null;
  /** Total tree canopy area in dunums. */
  canopy_area_du: number | null;
}

export interface CropShare {
  crop: string;
  area_du: number | null;
  /** Share of all crop area, 0-100. */
  share_pct: number | null;
  field_count: number;
}

export interface FarmCrops {
  farm_id: number;
  farm_name: string;
  crops: CropShare[];
}

export interface CropSummary {
  crops: CropShare[];
  /** Present when requested with group_by=farm. */
  farms: FarmCrops[] | null;
}

export interface StructureTypeRow {
  type: string;
  count: number;
  area_du: number | null;
}

export interface StructuresSummary {
  total_count: number;
  total_area_du: number | null;
  farms_with_structures: number;
  largest_holding: { farm_id: number; farm_name: string; area_du: number | null } | null;
  largest_structure: { type: string; area_du: number | null } | null;
  by_type: StructureTypeRow[];
}

export interface EnterpriseKpi {
  value: number;
  unit: string;
  label: string;
  subtext: string | null;
  rolled_up_at: string;
  badges: Array<{ label: string; tone: "neutral" | "positive" | "warning" | "critical" }>;
  scored_trees?: number | null;
  average_score?: number | null;
  stressed_trees?: number | null;
  critical_trees?: number | null;
  as_of?: string | null;
  scored_farms?: number | null;
  low_farms?: number | null;
  average_class?: "excellent" | "good" | "fair" | "poor" | null;
  class_counts?: Record<"excellent" | "good" | "fair" | "poor", number>;
  period_days?: number | null;
  /** Yield KPI only: the newest 60-day forecast window behind the total (YYYY-MM-DD).
   *  Returned for information; not shown in the UI. */
  window_start?: string | null;
  window_end?: string | null;
}

/** The Farm page's deep-dive widgets that return an EnterpriseKpi. */
export type EnterpriseKpiKind = "advisories" | "ier" | "yield" | "treeHealth" | "water";

export interface WaterCalculatorSummary {
  total_demand_m3: number;
  total_allocated_m3: number;
  total_farms: number;
  farms_above_allocation: number;
  farms_within_allocation: number;
  demand_rate_min_m3_per_dunum: number;
  demand_rate_max_m3_per_dunum: number;
}

export interface WaterFarmTotals {
  rows: Array<{
    farm_id: string;
    farm_name: string;
    region: string;
    area_dunums: number;
    daily_demand_m3: number;
    weekly_demand_m3: number;
    monthly_demand_m3: number;
    allocation_m3: number;
  }>;
}

export interface FarmWaterDemand {
  farm_id: string;
  daily_demand_m3: number;
  weekly_demand_m3: number;
  monthly_demand_m3: number;
  allocation_m3: number;
}

export type YieldCategory = "crop" | "date_palm" | "fruit";

export interface YieldForecastWindow {
  forecast_date?: string | null;
  window_start?: string | null;
  window_end?: string | null;
  counted_from?: string | null;
}

export interface YieldFieldBreakdown {
  farm_id: number;
  farm_name: string | null;
  field_count: number;
  total_yield_tons: number;
  total_crop_yield_tons: number;
  total_tree_yield_tons: number;
  fields: Array<
    {
      field_id: number;
      crop: string | null;
      area_ha: number | null;
      area_dunum: number | null;
      yield_tons: number | null;
      crop_yield_tons: number | null;
      tree_yield_tons: number | null;
      tree_count_used: number | null;
      tree_count_skipped: number | null;
    } & YieldForecastWindow
  >;
  unfielded_palms?:
    | ({ tree_yield_tons: number | null; tree_count_used: number | null; tree_count_skipped: number | null } & YieldForecastWindow)
    | null;
}

/** Per-field yield forecast for one farm, as the UI uses it (converted from YieldFieldBreakdown).
 *  A row with `field_id: null` is the farm's palms that are in no field -- it counts in the
 *  farm / date-palm totals but never matches a field. */
export interface FarmYieldFields {
  farm_id: number;
  fields: Array<{ field_id: number | null; field_uid: string; category: YieldCategory; yield_t: number; area_du: number | null } & YieldForecastWindow>;
}

export type RankingMetric = "health" | "yield" | "ier" | "water";
export type RankingOrder = "top" | "bottom";

export type FarmRankingStatus = "optimal" | "watch" | "attention";

/**
 * One ranked farm, with everything its card shows - so the page makes one call,
 * not one advisories + one satellite-passes call per farm.
 */
export interface FarmRankingRow {
  rank: number;
  farm_id: number;
  farm_uid: string;
  /** Display name, e.g. "Farm 101"; falls back to the uid when null. */
  farm_name: string | null;
  zone_name: string | null;
  status: FarmRankingStatus;
  /** Canopy Health Index (CHI, date palms only), 0-100. */
  health_pct: number | null;
  health_as_of?: string | null;
  /** Mean of the farm's field NDVI (0-1): what "Current Health" ranks on. */
  mean_ndvi: number | null;
  /** Newest field date behind mean_ndvi. */
  ndvi_as_of?: string | null;
  has_trees?: boolean;
  has_crops?: boolean;
  yield_t: number | null;
  yield_t_per_du: number | null;
  /** Irrigation efficiency ratio, 0-100. */
  ier: number | null;
  /** Consumption as a share of quota, 0-100+. */
  water_pct_of_quota: number | null;
  water_m3_month: number | null;
  /** Yield split by category, tonnes - optional until the yield service provides it (the Yield card's
   *  three tiles and coloured bar only show when it's there). */
  yield_breakdown?: { crop_t: number | null; date_palm_t: number | null; fruit_t: number | null } | null;
  irrigation_method?: string | null;
  field_count?: number | null;
  /** Main crops, e.g. "Vegetables & Date Palm". */
  crops: string | null;
  /** ISO dates. */
  latest_pass_date: string | null;
  next_pass_date: string | null;
  /** The farm's active advisory, if any (text as published by the advisory service). */
  advisory: string | null;
}

export interface FarmRankings {
  averages: {
    health_pct: number | null;
    mean_ndvi?: number | null;
    yield_t: number | null;
    yield_t_per_du: number | null;
    ier: number | null;
    water_pct_of_quota: number | null;
    water_m3_month: number | null;
  };
  rows: FarmRankingRow[];
}

export type AnalyticsExportDataset = "land-use" | "crops" | "trees" | "species";

export type SpeciesCategory = "date_palm" | "fruit" | "native";

export interface SpeciesRow {
  /** Name as shown in the table, e.g. "Medjool (Date Palm)", "Ghaf (UAE National Tree)". */
  display_name: string;
  species: string;
  cultivar: string | null;
  scientific_name: string | null;
  category: SpeciesCategory;
  tree_count: number;
  /** This row's share of its category's trees, 0-100. */
  category_share_pct: number;
  est_yield_t: number | null;
  est_yield_estimated?: boolean;
  area_ha: number | null;
  area_du: number | null;
}

export interface SpeciesSummary {
  rows: SpeciesRow[];
}

export type CanopyHealthClass = "very_healthy" | "healthy" | "watch" | "stressed" | "critical";

export interface CanopyHealthDistribution {
  /** Date palms only, from farms with a score. */
  scored_trees: number;
  classes: Record<CanopyHealthClass, number>;
  farms_without_headline?: number;
  /** Newest satellite date behind the counted farms. */
  latest_capture_date?: string | null;
}

export interface FarmHealthRankingRow {
  farm_id: string;
  farm_uid: string;
  zone_id: number | null;
  average_canopy_health_index: number | null;
  health_status: string;
  trees_scored: number;
  latest_capture_date: string | null;
}

export interface FarmHealthRankings {
  rows: FarmHealthRankingRow[];
  calibration_status: string;
}

/** One side of the weekly vegetation status - vegetated or fallow. */
export interface VegetationStatusArea {
  area_ha: number | null;
  area_du: number | null;
  /** Share of the assessed area, 0-100. */
  pct: number | null;
}

export interface VegetationStatus {
  /** ISO dates of the week the reading covers; null when no weekly reading exists yet. */
  week_start: string | null;
  week_end: string | null;
  vegetated: VegetationStatusArea;
  fallow: VegetationStatusArea;
}

/** Red Palm Weevil bio-acoustic sensors. */
export interface SensorSummary {
  installed: number;
  online: number;
  /** Sensors currently reporting weevil activity. */
  alerts: number;
}

export interface Zone {
  id: number;
  name: string;
}

export interface SearchResult {
  type: "farm" | "field";
  /** The farm's id for a farm hit, the field's id for a field hit. */
  id: number;
  uid: string;
  owner_name: string | null;
  zone_name: string | null;
  label: string;
  /** Set on field hits: the farm the field belongs to. */
  farm_id: number | null;
  /** [lon, lat], EPSG:4326. */
  centroid: [number, number] | null;
}

export interface SearchResponse {
  results: SearchResult[];
}
