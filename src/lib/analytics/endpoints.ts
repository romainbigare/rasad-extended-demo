export const ANALYTICS_ENDPOINTS = {
  landUse: "/api/v1/analytics/land-use",
  landUseBreakdown: (landUseClass: string) => `/api/v1/analytics/land-use/${landUseClass}/breakdown`,
  domain: (domain: string) => `/api/v1/analytics/domains/${domain}`,
  trees: "/api/v1/analytics/trees",
  species: "/api/v1/analytics/trees/species",
  treeModelVersions: "/api/v1/analytics/tree-model-versions",
  crops: "/api/v1/analytics/crops",
  structures: "/api/v1/analytics/structures",
  export: (dataset: string) => `/api/v1/analytics/${dataset}/export`,
  // Farm page deep-dive widgets (EnterpriseKpi shape).
  advisoriesSummary: "/api/v1/advisories/summary",
  ierSummary: "/api/v1/ier/enterprise/summary",
  enterpriseYield: "/api/v1/enterprise/yield-forecast",
  enterpriseTreeHealth: "/api/v1/tree-health/enterprise-summary",
  waterRollup: "/api/v1/irrigation/water-calculator/summary",
  farmWaterDemand: (farmUid: string) => `/api/v1/irrigation/water-calculator/farms/${farmUid}`,
  // One flat row per farm (demand + allocation), unpaged: the holding drilldown's water column.
  waterFarmTotals: "/api/v1/irrigation/water-calculator/farm-totals",
  farmYieldFields: (farmId: number) => `/api/v1/yield-forecast/farms/${farmId}/fields`,
  farmRankings: "/api/v1/analytics/farm-rankings",
  canopyHealth: "/api/v1/tree-health/distribution",
  farmHealthRankings: "/api/v1/tree-health/farm-health-rankings",
  // Weekly satellite vegetated / fallow area - separate from the LULC land-use classes above.
  vegetationStatus: "/api/v1/analytics/vegetation-status",
  sensors: "/api/v1/iot/sensors/summary",
  zones: "/api/v1/zones",
  search: "/api/v1/search",
} as const;
