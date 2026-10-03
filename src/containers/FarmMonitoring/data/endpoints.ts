export const MONITORING_ENDPOINTS = {
  treeHealthScore: (farmId: number) => `/api/v1/farms/${farmId}/tree-health/score`,
  treeHealthMonitoring: (farmId: number) => `/api/v1/farms/${farmId}/tree-health/monitoring`,
  ier: (farmId: number) => `/api/v1/farms/${farmId}/ier`,
} as const;
