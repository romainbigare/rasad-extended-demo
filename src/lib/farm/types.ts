import type { LandUseClass } from "@/lib/analytics/types";

export interface FarmMonitoringField {
  id: number;
  uid: string;
  name?: string | null;
  owner_name: string | null;
  area_ha: string | null;
  area_dunum: string | null;
  imagery_batch: number | null;
  share_of_farm_area_pct: string | null;
  tree_count: number;
  crop_types: unknown[];
  ndvi?: number | null;
  ndvi_as_of?: string | null;
  land_use?: LandUseClass | null;
}

export interface FarmMonitoringInfo {
  id: number;
  uid: string;
  name?: string | null;
  owner_name: string | null;
  area_ha: string | null;
  area_dunum: string | null;
  zone_id: number | null;
  zone_name: string | null;
  imagery_batch: number | null;
  org_id: number | null;
  field_count: number;
  tree_count: number;
  crop_types: unknown[];
  mean_ndvi?: number | null;
  ndvi_as_of?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FarmMonitoringResponse {
  farm: FarmMonitoringInfo;
  fields: FarmMonitoringField[];
}

export interface FieldCropType {
  crop_type: string;
  cultivated_area_dunum: string | null;
}

export interface FieldMonitoringDetail {
  id: number;
  uid: string;
  farm_id: number;
  owner_name: string | null;
  area_ha: string | null;
  area_dunum: string | null;
  boundary: string | null;
  centroid_lat: number | null;
  centroid_lon: number | null;
  imagery_batch: number | null;
  tree_count: number;
  avg_canopy_health_index: number | null;
  chi_latest_capture_date?: string | null;
  chi_trees_scored?: number | null;
  chi_trees_total?: number | null;
  crop_types: FieldCropType[];
  created_at: string;
  updated_at: string;
}
