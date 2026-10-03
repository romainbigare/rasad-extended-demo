import { useCallback, useMemo } from "react";

import { downloadCsv } from "@shared/export/csvExport";
import { useFarmWaterDemand, useFarmYieldFields, useZones } from "@/lib/analytics/hooks";
import { useFarmFields } from "@/lib/farm/useFarmFields";
import { useFarmRecord } from "@/lib/farm/useFarmRecord";
import { isoDaysAgo, todayIso } from "@/lib/satellite/passDates";
import { useSatelliteDates } from "@/lib/satellite/useSatelliteDates";

import { useFarmIer, useTreeHealthScore } from "./useMonitoringApi";

const HEADERS = [
  "FarmID",
  "FarmName",
  "Region",
  "SubRegion",
  "TotalAreaDunums",
  "TotalYieldTonnes",
  "CropYieldTonnes",
  "DateTreeYieldTonnes",
  "FruitTreeYieldTonnes",
  "WaterDemandDailyM3",
  "WaterDemandWeeklyM3",
  "WaterDemandMonthlyM3",
  "FieldsCount",
  "CurrentHealthScorePct",
  "CurrentIERScorePct",
  "LatestSatellitePassDate",
  "MeanNDVI",
];

const oneDecimal = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : (Math.round(n * 10) / 10).toString());
const whole = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : Math.round(n).toString());
const dayMonthYear = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function useFarmDataCsv(farmId: number | null) {
  const record = useFarmRecord(farmId);
  const zones = useZones();
  const fields = useFarmFields(farmId);
  const yieldFields = useFarmYieldFields(farmId);
  const water = useFarmWaterDemand(record.data?.uid ?? null);
  const health = useTreeHealthScore(farmId);
  const ier = useFarmIer(farmId);
  // Same params as the Farm Monitoring header's "latest pass", so it shares that request.
  const dates = useSatelliteDates(farmId, { startDate: isoDaysAgo(365), endDate: todayIso(), cloudCover: 100 });

  const latestPass = useMemo(() => {
    if (!dates.data?.length) return null;
    return [...dates.data].sort((a, b) => b.datetime.localeCompare(a.datetime))[0];
  }, [dates.data]);

  const exportCsv = useCallback(async () => {
    const farm = record.data;
    if (!farm) return;
    const region = farm.zone_id !== null ? zones.data?.find((z) => z.id === farm.zone_id)?.name ?? null : null;
    const yields = yieldFields.data?.fields;
    const sum = (category?: "crop" | "date_palm" | "fruit") =>
      yields ? yields.filter((f) => !category || f.category === category).reduce((s, f) => s + f.yield_t, 0) : null;
    const area = farm.area_dunum === null ? null : Number(farm.area_dunum);

    downloadCsv(
      HEADERS,
      [
        [
          farm.uid,
          farm.name ?? "",
          region ? `${region} Region` : "",
          "", // SubRegion - not in the farm API yet
          oneDecimal(area),
          oneDecimal(sum()),
          oneDecimal(sum("crop")),
          oneDecimal(sum("date_palm")),
          oneDecimal(sum("fruit")),
          whole(water.data?.daily_demand_m3),
          whole(water.data?.weekly_demand_m3),
          whole(water.data?.monthly_demand_m3),
          fields.data ? String(fields.data.length) : "",
          oneDecimal(health.data?.health_pct),
          whole(ier.data?.ier_pct),
          latestPass ? dayMonthYear(latestPass.datetime) : "",
          "",
        ],
      ],
      `ADAFSA_Farm_Intelligence_${farm.uid}.csv`,
    );
  }, [record.data, zones.data, yieldFields.data, water.data, fields.data, health.data, ier.data, latestPass]);

  return { exportCsv, ready: Boolean(record.data) };
}
