import { useQuery } from "react-query";

import { rbacApi } from "@/lib/network/rbac/axios.config";
import { rbacRequest } from "@shared/network/rbacRequest";
import { usePortfolioSummary as useFarmPortfolioSummary } from "@/lib/farm/usePortfolioSummary";
import { useRegion } from "@/lib/region/RegionContext";

import { ANALYTICS_ENDPOINTS } from "./endpoints";
import { useTreeModel } from "./TreeModelContext";
import type {
  AnalyticsExportDataset,
  CanopyHealthDistribution,
  CropShare,
  CropSummary,
  DomainSummary,
  EnterpriseKpi,
  EnterpriseKpiKind,
  FarmHealthRankings,
  FarmRankings,
  FarmWaterDemand,
  FarmYieldFields,
  LandUseBreakdownRow,
  LandUseClass,
  RankingMetric,
  RankingOrder,
  LandUseSummary,
  OperationsDomain,
  SearchResponse,
  SpeciesCategory,
  SpeciesSummary,
  ModelVersionOption,
  StructuresSummary,
  TreeSummary,
  SensorSummary,
  VegetationStatus,
  WaterCalculatorSummary,
  Zone,
  YieldCategory,
  WaterFarmTotals,
  YieldFieldBreakdown,
  YieldForecastWindow,
} from "./types";

type Params = Record<string, string | number | null | undefined>;

async function get<T>(url: string, params: Params = {}): Promise<T> {
  const cleaned = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== null && v !== undefined));
  const res = await rbacRequest<T>(url, "GET", undefined, { params: cleaned }, { silent: true });
  return res.data;
}

/** Every Executive View query is keyed on (and filtered by) the selected region. */
function useZoneQuery<T>(key: unknown[], url: string, params: Params = {}, options: { enabled?: boolean } = {}) {
  const { zoneId } = useRegion();
  return useQuery<T, Error>([...key, zoneId], () => get<T>(url, { ...params, zone_id: zoneId }), options);
}

export function usePortfolioSummary() {
  const { zoneId } = useRegion();
  const { treeModelVersionId } = useTreeModel();
  return useFarmPortfolioSummary(zoneId ?? undefined, treeModelVersionId ?? undefined);
}

export function useLandUseSummary() {
  return useZoneQuery<LandUseSummary>(["exec", "land-use"], ANALYTICS_ENDPOINTS.landUse);
}

/** Sub-classes of one land-use class; idle while `landUseClass` is null. */
export function useLandUseBreakdown(landUseClass: LandUseClass | null) {
  const { zoneId } = useRegion();
  return useQuery<LandUseBreakdownRow[], Error>(
    ["analytics", "land-use-breakdown", landUseClass, zoneId],
    () => get<LandUseBreakdownRow[]>(ANALYTICS_ENDPOINTS.landUseBreakdown(landUseClass as string), { zone_id: zoneId }),
    { enabled: landUseClass !== null },
  );
}

export function useDomainSummary(domain: OperationsDomain) {
  return useZoneQuery<DomainSummary>(["exec", "domain", domain], ANALYTICS_ENDPOINTS.domain(domain));
}

export function useTreeSummary() {
  const { treeModelVersionId } = useTreeModel();
  return useZoneQuery<TreeSummary>(["exec", "trees", treeModelVersionId], ANALYTICS_ENDPOINTS.trees, {
    tree_model_version_id: treeModelVersionId,
  });
}

export function useSpeciesSummary(category: SpeciesCategory | "all") {
  const { treeModelVersionId } = useTreeModel();
  return useZoneQuery<SpeciesSummary>(["exec", "species", category, treeModelVersionId], ANALYTICS_ENDPOINTS.species, {
    category: category === "all" ? null : category,
    tree_model_version_id: treeModelVersionId,
  });
}

/** Options for the Executive View's tree-model dropdown. Not region-filtered. */
export function useTreeModelVersions() {
  return useQuery<ModelVersionOption[], Error>(["exec", "tree-model-versions"], () =>
    get<ModelVersionOption[]>(ANALYTICS_ENDPOINTS.treeModelVersions),
  );
}

/** Crop share by crop; `groupBy: "farm"` also returns each farm's own crop mix. */
export function useCropSummary(groupBy: "crop" | "farm" = "crop") {
  return useZoneQuery<CropSummary>(["analytics", "crops", groupBy], ANALYTICS_ENDPOINTS.crops, { group_by: groupBy });
}

/**
 * One farm's crops (name, area, share, fields), looked up in the all-regions crop list: not narrowed by the
 * region menu, so a farm opened from outside the selected region (a search hit, a link) still shows its crops.
 * Idle until a farm is picked; the list is shared by every farm, so it is fetched once.
 */
export function useFarmCrops(farmId: number | null) {
  return useQuery<CropSummary, Error, CropShare[]>(
    ["analytics", "crops", "farm", "all-regions"],
    () => get<CropSummary>(ANALYTICS_ENDPOINTS.crops, { group_by: "farm" }),
    { enabled: farmId !== null, select: (d) => d.farms?.find((f) => f.farm_id === farmId)?.crops ?? [] },
  );
}

export function useStructuresSummary() {
  return useZoneQuery<StructuresSummary>(["analytics", "structures"], ANALYTICS_ENDPOINTS.structures);
}

// "water" is deliberately not here -- see useWaterCalculatorSummary below.
const ENTERPRISE_KPI_URL: Record<Exclude<EnterpriseKpiKind, "water">, string> = {
  advisories: ANALYTICS_ENDPOINTS.advisoriesSummary,
  ier: ANALYTICS_ENDPOINTS.ierSummary,
  yield: ANALYTICS_ENDPOINTS.enterpriseYield,
  treeHealth: ANALYTICS_ENDPOINTS.enterpriseTreeHealth,
};

/** One Farm page deep-dive widget, filtered by the selected region. */
export function useEnterpriseKpi(kind: Exclude<EnterpriseKpiKind, "water">) {
  return useZoneQuery<EnterpriseKpi>(["analytics", "enterprise-kpi", kind], ENTERPRISE_KPI_URL[kind]);
}

export function useWaterCalculatorSummary() {
  return useQuery<WaterCalculatorSummary, Error>(["analytics", "enterprise-kpi", "water"], () =>
    get<WaterCalculatorSummary>(ANALYTICS_ENDPOINTS.waterRollup),
  );
}

/** Every farm's water demand, for the holding drilldown's water column. `enabled` so the other
 * drilldown kinds never fire the request. Not region-filtered, like the summary above. */
export function useWaterFarmTotals(enabled: boolean) {
  return useQuery<WaterFarmTotals, Error>(
    ["analytics", "water-farm-totals"],
    () => get<WaterFarmTotals>(ANALYTICS_ENDPOINTS.waterFarmTotals),
    { enabled },
  );
}

/** One farm's water demand; idle until a farm is picked. */
export function useFarmWaterDemand(farmUid: string | null) {
  return useQuery<FarmWaterDemand, Error>(
    ["analytics", "farm-water", farmUid],
    () => get<FarmWaterDemand>(ANALYTICS_ENDPOINTS.farmWaterDemand(farmUid as string)),
    { enabled: farmUid !== null },
  );
}

/** One farm's per-field yield forecast; idle until a farm is picked. */
export function useFarmYieldFields(farmId: number | null) {
  return useQuery<FarmYieldFields, Error>(
    ["analytics", "farm-yield-fields", farmId],
    async () => toFarmYieldFields(await get<YieldFieldBreakdown>(ANALYTICS_ENDPOINTS.farmYieldFields(farmId as number))),
    { enabled: farmId !== null },
  );
}

const FRUIT_CROPS = new Set(["citrus", "lemon", "lime", "tahiti lime", "orange", "mango", "olive", "fig", "pomegranate", "fruit trees", "tropical fruits"]);

function toFarmYieldFields(raw: YieldFieldBreakdown): FarmYieldFields {
  const category = (crop: string): YieldCategory => {
    const name = crop.trim().toLowerCase();
    if (name.includes("date palm")) return "date_palm";
    return FRUIT_CROPS.has(name) ? "fruit" : "crop";
  };
  const windowOf = (w: YieldForecastWindow): YieldForecastWindow => ({
    forecast_date: w.forecast_date ?? null,
    window_start: w.window_start ?? null,
    window_end: w.window_end ?? null,
    counted_from: w.counted_from ?? null,
  });
  const fields: FarmYieldFields["fields"] = raw.fields.flatMap((f) => {
    const rows: FarmYieldFields["fields"] = [];
    const base = { field_id: f.field_id, field_uid: String(f.field_id), ...windowOf(f) };
    if (f.crop !== null && f.crop_yield_tons !== null) {
      rows.push({ ...base, category: category(f.crop), yield_t: f.crop_yield_tons, area_du: f.area_dunum });
    }
    if (f.tree_yield_tons !== null) {
      rows.push({ ...base, category: "date_palm", yield_t: f.tree_yield_tons, area_du: rows.length ? null : f.area_dunum });
    }
    return rows;
  });
  const palms = raw.unfielded_palms;
  if (palms && palms.tree_yield_tons !== null) {
    fields.push({
      field_id: null,
      field_uid: "unfielded-palms",
      category: "date_palm",
      yield_t: palms.tree_yield_tons,
      area_du: null,
      ...windowOf(palms),
    });
  }
  return { farm_id: raw.farm_id, fields };
}

/** Farm ranking by one metric, filtered by the selected region and a search term. */
export function useFarmRankings(metric: RankingMetric, order: RankingOrder, q: string, limit: number) {
  const search = q.trim();
  const { zoneId } = useRegion();
  // keepPreviousData: a new metric / order / search keeps the current rows on
  // screen (dimmed) while the new ranking loads, instead of blanking to a spinner.
  return useQuery<FarmRankings, Error>(
    ["analytics", "farm-rankings", metric, order, search, limit, zoneId],
    () => get<FarmRankings>(ANALYTICS_ENDPOINTS.farmRankings, { metric, order, q: search || null, limit, zone_id: zoneId }),
    { keepPreviousData: true },
  );
}

export async function downloadAnalyticsExport(
  dataset: AnalyticsExportDataset,
  zoneId: number | null,
  format: "csv" | "geojson" = "csv",
): Promise<void> {
  const res = await rbacApi.get<Blob>(ANALYTICS_ENDPOINTS.export(dataset), {
    params: { format, ...(zoneId !== null ? { zone_id: zoneId } : {}) },
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${dataset}-${new Date().toISOString().slice(0, 10)}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function useCanopyHealthDistribution() {
  return useZoneQuery<CanopyHealthDistribution>(["exec", "canopy-health"], ANALYTICS_ENDPOINTS.canopyHealth);
}

export function useFarmHealthRankings(enabled: boolean) {
  return useZoneQuery<FarmHealthRankings>(
    ["exec", "farm-health-rankings"],
    ANALYTICS_ENDPOINTS.farmHealthRankings,
    { limit: 500 },
    { enabled },
  );
}

export function useVegetationStatus() {
  return useQuery<VegetationStatus, Error>(["exec", "vegetation-status"], () =>
    get<VegetationStatus>(ANALYTICS_ENDPOINTS.vegetationStatus),
  );
}

/** RPW bio-acoustic sensors for the Forestry header badge (region-filtered). */
export function useSensorSummary() {
  return useZoneQuery<SensorSummary>(["exec", "sensors"], ANALYTICS_ENDPOINTS.sensors, { type: "rpw" });
}

export function useZones() {
  return useQuery<Zone[], Error>(["zones"], () => get<Zone[]>(ANALYTICS_ENDPOINTS.zones));
}

/** The zone picked in the top bar, or undefined for the whole emirate (or while zones load). */
export function useSelectedZone(): Zone | undefined {
  const { zoneId } = useRegion();
  const zones = useZones();
  return zones.data?.find((z) => z.id === zoneId);
}

/** Farm search for the top bar. Only runs once the query has 2+ characters. */
export function useGlobalSearch(query: string) {
  const q = query.trim();
  return useQuery<SearchResponse, Error>(["search", q], () => get<SearchResponse>(ANALYTICS_ENDPOINTS.search, { q }), {
    enabled: q.length >= 2,
    keepPreviousData: true,
  });
}
