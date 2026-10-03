import { useQuery } from "react-query";

import { rbacRequest } from "@shared/network/rbacRequest";

import { MONITORING_ENDPOINTS } from "../data/endpoints";
import type {
  ChiCoverage,
  FarmIer,
  Rating,
  TreeHealthMonitoring,
  TreeHealthMonitoringResponse,
  TreeHealthScore,
  TreeHealthScoreResponse,
  TreeHealthStatus,
} from "../data/types";

function useFarmQuery<T>(name: string, farmId: number | null, url: (id: number) => string, params: Record<string, string> = {}) {
  return useQuery<T, Error>(
    ["monitoring", name, farmId, params],
    async () => (await rbacRequest<T>(url(farmId as number), "GET", undefined, { params }, { silent: true })).data,
    { enabled: farmId !== null },
  );
}

function chiRating(score: number | null, status: TreeHealthStatus): Rating | null {
  if (score === null) return null;
  if (score >= 90) return "excellent";
  if (status === "Healthy") return "good";
  if (status === "Monitor") return "fair";
  if (status === "At Risk") return "poor";
  return score >= 70 ? "good" : score >= 50 ? "fair" : "poor";
}

function chiCoverage(raw: {
  trees_scored?: number;
  trees_total?: number;
  headline_available?: boolean;
  latest_capture_date?: string | null;
}, score: number | null): ChiCoverage {
  return {
    trees_scored: raw.trees_scored ?? null,
    trees_total: raw.trees_total ?? null,
    headline_available: raw.headline_available ?? score !== null,
    as_of: raw.latest_capture_date ?? null,
  };
}

export function useTreeHealthScore(farmId: number | null) {
  return useQuery<TreeHealthScore, Error>(
    ["monitoring", "tree-health-score", farmId],
    async () => {
      const raw = (
        await rbacRequest<TreeHealthScoreResponse>(MONITORING_ENDPOINTS.treeHealthScore(farmId as number), "GET", undefined, {}, { silent: true })
      ).data;
      const shares = raw.status_shares_percent;
      return {
        ...chiCoverage(raw, raw.overall_score),
        health_pct: raw.overall_score,
        rating: chiRating(raw.overall_score, raw.status_label),
        status_label: raw.overall_score === null ? null : raw.status_label,
        median_pct: raw.median_canopy_health_index ?? null,
        shares: shares ? { healthy: shares.Healthy, monitor: shares.Monitor, at_risk: shares["At Risk"] } : null,
      };
    },
    { enabled: farmId !== null },
  );
}

export function useTreeHealthMonitoring(farmId: number | null) {
  return useQuery<TreeHealthMonitoring, Error>(
    ["monitoring", "tree-health-monitoring", farmId],
    async () => {
      const raw = (
        await rbacRequest<TreeHealthMonitoringResponse>(
          MONITORING_ENDPOINTS.treeHealthMonitoring(farmId as number),
          "GET",
          undefined,
          { params: { page: 1, size: 200 } },
          { silent: true },
        )
      ).data;
      return {
        fields: raw.items.map((f) => ({
          ...chiCoverage(f, f.average_canopy_health_index),
          field_id: Number(f.field_id),
          health_pct: f.average_canopy_health_index,
          rating: chiRating(f.average_canopy_health_index, f.health_status),
        })),
      };
    },
    { enabled: farmId !== null },
  );
}
export const useFarmIer = (farmId: number | null) => useFarmQuery<FarmIer>("ier", farmId, MONITORING_ENDPOINTS.ier);
