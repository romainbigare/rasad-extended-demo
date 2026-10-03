import type { LandUseClass } from "@/lib/analytics/types";

export interface ReportsSummary {
  arable_area_du: number | null;
  forecast_yield_t: number | null;
  active_advisories: number | null;
}

export type IerClass = "excellent" | "good" | "fair" | "poor";
export type AdvisoryStatus = "none" | "active" | "critical";

export interface FarmReportExtra {
  farm_id: number;
  /** Sub-zone / sector within the region, e.g. "Al Ain Oasis Belt". */
  sub_zone: string | null;
  /** The farm's crop mix as published, e.g. "Date Palm & Fruit Trees". */
  crop_mix: string | null;
  /** Leading cultivars / crops, e.g. ["Mejdhol", "Fardh"]. */
  cultivars: string[];
  forecast_yield_t: number | null;
  /** Irrigation efficiency ratio, 0-100. */
  ier_score: number | null;
  ier_class: IerClass | null;
  /** This month's metered use and quota, m³ (null when not on file). */
  water_used_m3: number | null;
  water_allocated_m3: number | null;
  /** Allocated minus used this month, m³ (negative = overdraft). null when no quota is on file. */
  water_balance_m3: number | null;
  advisory_status: AdvisoryStatus;
  advisory_count: number;
}

export type FieldHealth = "healthy" | "moderate" | "stressed";

export interface FieldReportExtra {
  field_id: number;
  land_use: LandUseClass | null;
  /** Mean NDVI, 0-1. */
  ndvi: number | null;
  health: FieldHealth | null;
  watering_method: string | null;
  growth_status: string | null;
  ier?: number | null;
  /** The field's crop, e.g. "Date Palm" - optional until published. */
  crop?: string | null;
  /** Trees on the field (tree crops), e.g. 1763 - optional until published. */
  tree_count?: number | null;
  /** e.g. "No Till", "Reduced Till" - optional until published. */
  tillage?: string | null;
}

export interface CropReportExtra {
  farm_id: number;
  crop: string;
  /** e.g. "Winter 2026". */
  season: string | null;
  /** e.g. "Growing", "Harvested", "Fallow". */
  status: string | null;
  ier?: number | null;
  /** e.g. "Vegetables", "Protected Greenhouse", "Forage & Fodder" - optional until published. */
  category?: string | null;
  /** ISO dates - optional until published. */
  planting_date?: string | null;
  harvest_date?: string | null;
  forecast_yield_t?: number | null;
  /** The target / benchmark yield for this planting, tonnes - optional until published. */
  target_yield_t?: number | null;
}

export type WeevilRisk = "low" | "medium" | "high";

export interface DateCultivarRow {
  farm_id: number;
  farm_uid: string;
  cultivar: string;
  palm_count: number;
  planted_area_du: number | null;
  avg_age_years: number | null;
  /** e.g. "Juvenile", "Productive", "Mature". */
  maturity_stage: string | null;
  est_yield_t: number | null;
  /** Canopy vigour, 0-100. */
  vigor_score: number | null;
  weevil_risk: WeevilRisk | null;
  /** e.g. "Drip", "Bubbler", "Flood". */
  irrigation: string | null;
}

export interface WaterQuotaRow {
  farm_id: number;
  farm_uid: string;
  zone_name: string | null;
  holding_area_du: number | null;
  allocated_m3: number | null;
  consumed_m3: number | null;
  /** allocated - consumed, m³. */
  net_balance_m3: number | null;
  /** Irrigation efficiency ratio, 0-100. */
  ier: number | null;
}

export type PermitStatus = "permitted" | "pending" | "unpermitted";

export interface StructureReportRow {
  structure_id: number;
  farm_id: number;
  farm_uid: string;
  /** e.g. "Multi-Span Polycarbonate Greenhouse A". */
  name: string | null;
  /** The structure's own code, e.g. "STR-SWH-01". */
  code: string | null;
  /** e.g. "Protected Agriculture", "Irrigation & Utilities", "Storage & Logistics", "Livestock". */
  category: string | null;
  /** e.g. "Climate-Controlled Greenhouse". */
  structure_type: string | null;
  area_du: number | null;
  /** e.g. "Optimal", "Compliant". */
  condition: string | null;
  permit_status: PermitStatus | null;
  built_year: number | null;
  cadastre_code: string | null;
}

export interface ReportRows<T> {
  rows: T[];
}
