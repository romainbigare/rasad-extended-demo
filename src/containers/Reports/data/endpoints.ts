export const REPORTS_ENDPOINTS = {
  summary: "/api/v1/reports/summary",
  farms: "/api/v1/reports/farms",
  fields: "/api/v1/reports/fields",
  crops: "/api/v1/reports/crops",
  dateCultivars: "/api/v1/reports/date-cultivars",
  waterQuota: "/api/v1/reports/water-quota",
  structures: "/api/v1/reports/structures",
  export: (type: string) => `/api/v1/reports/${type}/export`,
  // The farm dossier PDF is shared with Farm Monitoring - see lib/reports/dossier.
} as const;
