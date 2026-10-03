import { useQuery } from "react-query";

import { rbacApi } from "@/lib/network/rbac/axios.config";
import { useRegion } from "@/lib/region/RegionContext";
import { rbacRequest } from "@shared/network/rbacRequest";

import { REPORTS_ENDPOINTS } from "../data/endpoints";
import type {
  CropReportExtra,
  DateCultivarRow,
  FarmReportExtra,
  FieldReportExtra,
  ReportRows,
  ReportsSummary,
  StructureReportRow,
  WaterQuotaRow,
} from "../data/types";

function useReportsQuery<T>(name: string, url: string) {
  const { zoneId } = useRegion();
  return useQuery<T, Error>(["reports", name, zoneId], async () => {
    const res = await rbacRequest<T>(url, "GET", undefined, { params: zoneId === null ? {} : { zone_id: zoneId } }, { silent: true });
    return res.data;
  });
}

export const useReportsSummary = () => useReportsQuery<ReportsSummary>("summary", REPORTS_ENDPOINTS.summary);
export const useFarmReportExtras = () => useReportsQuery<ReportRows<FarmReportExtra>>("farms", REPORTS_ENDPOINTS.farms);
export const useFieldReportExtras = () => useReportsQuery<ReportRows<FieldReportExtra>>("fields", REPORTS_ENDPOINTS.fields);
export const useCropReportExtras = () => useReportsQuery<ReportRows<CropReportExtra>>("crops", REPORTS_ENDPOINTS.crops);
export const useDateCultivarRows = () =>
  useReportsQuery<ReportRows<DateCultivarRow>>("date-cultivars", REPORTS_ENDPOINTS.dateCultivars);
export const useWaterQuotaRows = () => useReportsQuery<ReportRows<WaterQuotaRow>>("water-quota", REPORTS_ENDPOINTS.waterQuota);
export const useStructureListRows = () => useReportsQuery<ReportRows<StructureReportRow>>("structures", REPORTS_ENDPOINTS.structures);

export { downloadFarmDossier } from "@/lib/reports/dossier";

/** Downloads one report type as GeoJSON for the region (the whole emirate when zoneId is null). */
export async function downloadReportGeoJson(type: string, zoneId: number | null): Promise<void> {
  const res = await rbacApi.get<Blob>(REPORTS_ENDPOINTS.export(type), {
    params: { format: "geojson", ...(zoneId === null ? {} : { zone_id: zoneId }) },
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `report-${type}-${new Date().toISOString().slice(0, 10)}.geojson`;
  link.click();
  URL.revokeObjectURL(url);
}
