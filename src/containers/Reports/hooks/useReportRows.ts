import { useMemo } from "react";

import { useCropSummary, useStructuresSummary, useZones } from "@/lib/analytics/hooks";
import type { StructureTypeRow } from "@/lib/analytics/types";
import { useAllFields } from "@/lib/farm/useAllFields";
import { useFarmList } from "@/lib/farm/useFarmList";
import { farmServiceLabel } from "@/lib/format";
import { useRegion } from "@/lib/region/RegionContext";

import type { AdvisoryStatus, FieldHealth, IerClass } from "../data/types";
import { useCropReportExtras, useFarmReportExtras, useFieldReportExtras } from "./useReportsApi";

interface QueryState {
  isLoading: boolean;
  isError: boolean;
  extrasError?: boolean;
  /** The report extras (the columns beyond the farm and crop lists) are still loading; `isLoading` is about the lists. */
  extrasLoading?: boolean;
  refetch: () => void;
}

export interface FarmReportRow {
  id: number;
  uid: string;
  label: string;
  name: string | null;
  zoneName: string | null;
  areaDunums: number | null;
  parcelCount: number;
  /** Largest-area crop on this farm, if any field has a crop assigned. */
  topCrop: string | null;
  subZone: string | null;
  /** The published crop mix, else the farm's largest-area crop. */
  cropMix: string | null;
  cultivars: string[];
  waterUsedM3: number | null;
  waterAllocatedM3: number | null;
  forecastYieldT: number | null;
  ierScore: number | null;
  ierClass: IerClass | null;
  waterBalanceM3: number | null;
  advisoryStatus: AdvisoryStatus | null;
  advisoryCount: number | null;
}

export interface FieldReportRow {
  id: number;
  uid: string;
  farmId: number;
  farmUid: string;
  areaDunums: number | null;
  /** The field's share of its farm's area, 0-100 (null when either area is missing). */
  farmSharePct: number | null;
  landUse: string | null;
  ndvi: number | null;
  health: FieldHealth | null;
  wateringMethod: string | null;
  growthStatus: string | null;
  ier: number | null;
  crop: string | null;
  treeCount: number | null;
  tillage: string | null;
}

export interface CropReportRow {
  farmId: number;
  farmName: string;
  crop: string;
  areaDunums: number | null;
  sharePct: number | null;
  fieldCount: number;
  season: string | null;
  status: string | null;
  ier: number | null;
  category: string | null;
  plantingDate: string | null;
  harvestDate: string | null;
  forecastYieldT: number | null;
  targetYieldT: number | null;
}

const toNumber = (value: string | null) => (value === null ? null : Number(value));

/** Farms in the selected region (all farms when no region is picked). */
function useRegionFarms() {
  const { zoneId } = useRegion();
  const farms = useFarmList();
  const data = useMemo(
    () => farms.data?.filter((f) => zoneId === null || f.zone_id === zoneId),
    [farms.data, zoneId],
  );
  return { ...farms, data };
}

export function useFarmReportRows(): QueryState & { rows: FarmReportRow[] | undefined } {
  const farms = useRegionFarms();
  const fields = useAllFields();
  const crops = useCropSummary("farm");
  const zones = useZones();
  const extras = useFarmReportExtras();

  const rows = useMemo(() => {
    if (!farms.data || !fields.data || !crops.data) return undefined;
    const parcelCount = new Map<number, number>();
    for (const f of fields.data) parcelCount.set(f.farm_id, (parcelCount.get(f.farm_id) ?? 0) + 1);
    const topCrop = new Map<number, string>();
    for (const farm of crops.data.farms ?? []) {
      const top = [...farm.crops].sort((a, b) => (b.area_du ?? 0) - (a.area_du ?? 0))[0];
      if (top) topCrop.set(farm.farm_id, top.crop);
    }
    const zoneName = new Map((zones.data ?? []).map((z) => [z.id, z.name]));
    const extra = new Map((extras.data?.rows ?? []).map((r) => [r.farm_id, r]));
    return farms.data.map((f) => ({
      id: f.id,
      uid: f.uid,
      label: farmServiceLabel(f.uid),
      name: f.name ?? null,
      zoneName: f.zone_id === null ? null : zoneName.get(f.zone_id) ?? null,
      areaDunums: toNumber(f.area_dunum),
      parcelCount: parcelCount.get(f.id) ?? 0,
      topCrop: topCrop.get(f.id) ?? null,
      subZone: extra.get(f.id)?.sub_zone ?? null,
      cropMix: extra.get(f.id)?.crop_mix ?? topCrop.get(f.id) ?? null,
      cultivars: extra.get(f.id)?.cultivars ?? [],
      waterUsedM3: extra.get(f.id)?.water_used_m3 ?? null,
      waterAllocatedM3: extra.get(f.id)?.water_allocated_m3 ?? null,
      forecastYieldT: extra.get(f.id)?.forecast_yield_t ?? null,
      ierScore: extra.get(f.id)?.ier_score ?? null,
      ierClass: extra.get(f.id)?.ier_class ?? null,
      waterBalanceM3: extra.get(f.id)?.water_balance_m3 ?? null,
      advisoryStatus: extra.get(f.id)?.advisory_status ?? null,
      advisoryCount: extra.get(f.id)?.advisory_count ?? null,
    }));
  }, [farms.data, fields.data, crops.data, zones.data, extras.data]);

  return {
    rows,
    isLoading: farms.isLoading || fields.isLoading || crops.isLoading,
    isError: farms.isError || fields.isError || crops.isError,
    extrasError: extras.isError,
    refetch: () => {
      farms.refetch();
      fields.refetch();
      crops.refetch();
      extras.refetch();
    },
  };
}

export function useFieldReportRows(): QueryState & { rows: FieldReportRow[] | undefined } {
  const farms = useRegionFarms();
  const fields = useAllFields();
  const extras = useFieldReportExtras();

  const rows = useMemo(() => {
    if (!farms.data || !fields.data) return undefined;
    const farmUid = new Map(farms.data.map((f) => [f.id, f.uid]));
    const farmArea = new Map(farms.data.map((f) => [f.id, toNumber(f.area_dunum)]));
    const extra = new Map((extras.data?.rows ?? []).map((r) => [r.field_id, r]));
    return fields.data
      .filter((f) => farmUid.has(f.farm_id))
      .map((f) => {
        const areaDunums = toNumber(f.area_dunum);
        const farmAreaDunums = farmArea.get(f.farm_id) ?? null;
        return {
          id: f.id,
          uid: f.uid,
          farmId: f.farm_id,
          farmUid: farmUid.get(f.farm_id) as string,
          areaDunums,
          farmSharePct: areaDunums !== null && farmAreaDunums ? (areaDunums / farmAreaDunums) * 100 : null,
          landUse: extra.get(f.id)?.land_use ?? null,
          ndvi: extra.get(f.id)?.ndvi ?? null,
          health: extra.get(f.id)?.health ?? null,
          wateringMethod: extra.get(f.id)?.watering_method ?? null,
          growthStatus: extra.get(f.id)?.growth_status ?? null,
          ier: extra.get(f.id)?.ier ?? null,
          crop: extra.get(f.id)?.crop ?? null,
          treeCount: extra.get(f.id)?.tree_count ?? null,
          tillage: extra.get(f.id)?.tillage ?? null,
        };
      });
  }, [farms.data, fields.data, extras.data]);

  return {
    rows,
    isLoading: farms.isLoading || fields.isLoading,
    isError: farms.isError || fields.isError,
    extrasError: extras.isError,
    refetch: () => {
      farms.refetch();
      fields.refetch();
      extras.refetch();
    },
  };
}

export function useStructureReportRows(): QueryState & { rows: StructureTypeRow[] | undefined } {
  const structures = useStructuresSummary();
  return {
    rows: structures.data?.by_type,
    isLoading: structures.isLoading,
    isError: structures.isError,
    refetch: () => structures.refetch(),
  };
}

/** One row per farm and crop - each farm's crop mix from analytics/crops. */
export function useCropReportRows(): QueryState & { rows: CropReportRow[] | undefined } {
  const crops = useCropSummary("farm");
  const extras = useCropReportExtras();
  const rows = useMemo(() => {
    const extra = new Map((extras.data?.rows ?? []).map((r) => [`${r.farm_id}|${r.crop}`, r]));
    return crops.data?.farms?.flatMap((farm) =>
      farm.crops.map((c) => {
        const x = extra.get(`${farm.farm_id}|${c.crop}`);
        return {
          farmId: farm.farm_id,
          farmName: farm.farm_name,
          crop: c.crop,
          areaDunums: c.area_du,
          sharePct: c.share_pct,
          fieldCount: c.field_count,
          season: x?.season ?? null,
          status: x?.status ?? null,
          ier: x?.ier ?? null,
          category: x?.category ?? null,
          plantingDate: x?.planting_date ?? null,
          harvestDate: x?.harvest_date ?? null,
          forecastYieldT: x?.forecast_yield_t ?? null,
          targetYieldT: x?.target_yield_t ?? null,
        };
      }),
    );
  }, [crops.data, extras.data]);
  return {
    rows,
    isLoading: crops.isLoading,
    isError: crops.isError,
    extrasError: extras.isError,
    extrasLoading: extras.isLoading,
    refetch: () => {
      crops.refetch();
      extras.refetch();
    },
  };
}
