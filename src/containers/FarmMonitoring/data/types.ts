
/** A score's rating band, shared by the health and IER cards. */
export type Rating = "excellent" | "good" | "fair" | "poor";

export type TreeHealthStatus = "Healthy" | "Monitor" | "At Risk" | string;

export interface TreeHealthScoreResponse {
  /** CHI, 0-100; null when the farm has no satellite data yet. */
  overall_score: number | null;
  status_label: TreeHealthStatus;
  trees_surveyed: number;
  healthy_count: number;
  monitor_count: number;
  at_risk_count: number;
  no_data_count: number;
  /** Newest satellite date among the palms read. */
  latest_capture_date: string | null;
  trees_total?: number;
  trees_scored?: number;
  headline_available?: boolean;
  median_canopy_health_index?: number | null;
  status_shares_percent?: Record<"Healthy" | "Monitor" | "At Risk", number>;
  sub_scores: {
    canopy_health_index: number | null;
    frond_count: number | null;
    trunk_condition: number | null;
    pest_pressure: number | null;
  };
}

/** How many date palms a CHI figure rests on. */
export interface ChiCoverage {
  trees_scored: number | null;
  trees_total: number | null;
  /** False when too few palms have a valid reading for a score. */
  headline_available: boolean;
  as_of: string | null;
}

/** The Health card's view of the farm gauge (converted from TreeHealthScoreResponse). */
export interface TreeHealthScore extends ChiCoverage {
  /** Farm health score (CHI), 0-100; null when there is no score. */
  health_pct: number | null;
  /** Null with no score: "No Data" gets no rating and no colour. */
  rating: Rating | null;
  status_label: TreeHealthStatus | null;
  median_pct: number | null;
  shares: { healthy: number; monitor: number; at_risk: number } | null;
}

export interface TreeHealthMonitoringResponse {
  items: Array<{
    field_id: string;
    field_name: string | null;
    tree_count: number;
    health_status: TreeHealthStatus;
    health_color: string;
    average_canopy_health_index: number | null;
    stress_flags: string[];
    latitude: number | null;
    longitude: number | null;
    trees_total?: number;
    trees_scored?: number;
    headline_available?: boolean;
    latest_capture_date?: string | null;
  }>;
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TreeHealthMonitoring {
  fields: Array<ChiCoverage & { field_id: number; health_pct: number | null; rating: Rating | null }>;
}

export interface FarmIerField {
  field_id: number | string;
  /** 0-100. */
  ier_pct: number;
  class: Rating;
  area_ha: number | null;
  is_tree_field: boolean;
  /** Only on the tree-field row ("Tree field"). */
  name?: string;
}

export interface FarmIer {
  /** 0-100; null when the farm's score could not be calculated. */
  ier_pct: number | null;
  class: Rating | null;
  /** null when unknown (the card shows "—"). */
  delivery_method: string | null;
  /** Real fields only; the tree-field is not counted. */
  field_count: number;
  fields: FarmIerField[];
  as_of?: string;
  period_start?: string;
  period_days?: number;
  /** IER's own band name (Excellent / Good / Acceptable / Poor / Critical); `class` is this app's four-band vocabulary. */
  ier_rating?: string | null;
  tree_field_ier_pct?: number | null;
}
