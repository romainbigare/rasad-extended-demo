import { Droplets } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { useFarmWaterDemand, useFarmYieldFields } from "@/lib/analytics/hooks";
import type { FarmWaterDemand, YieldCategory } from "@/lib/analytics/types";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { EM_DASH, formatInteger, formatRate } from "@/lib/format";

import { STRINGS } from "../data/translations";

type WaterStatus = "within" | "near" | "over" | "none";

const WATER_STATUS_KEY: Record<WaterStatus, keyof typeof STRINGS> = {
  within: "waterStatusNormal",
  near: "waterStatusNearQuota",
  over: "waterStatusOverQuota",
  none: "waterStatusNoQuota",
};

const STATUS_COLOR: Record<WaterStatus, string> = { within: "#4FB840", near: "#f5a623", over: "#d64545", none: "#e9eeec" };

function waterStatus(d: FarmWaterDemand): WaterStatus {
  if (!(d.allocation_m3 > 0)) return "none";
  if (d.monthly_demand_m3 > d.allocation_m3) return "over";
  return d.monthly_demand_m3 > d.allocation_m3 * 0.9 ? "near" : "within";
}

const SHARE_ROWS: ReadonlyArray<{ category: YieldCategory; labelKey: keyof typeof STRINGS }> = [
  { category: "crop", labelKey: "kpiYieldCrop" },
  { category: "date_palm", labelKey: "kpiYieldDates" },
  { category: "fruit", labelKey: "kpiYieldFruits" },
];

function Row({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <b className="text-end">{value}</b>
    </div>
  );
}

/**
 * What the four KPI cards above do not show: the month's demand against the farm's water allocation, and the
 * yield per unit of area with each category's share. Follows the page's selected farm and its m3 / L switch.
 */
export function WaterYieldDetails({
  farmId,
  farmUid,
  liters,
}: {
  farmId: number | null;
  farmUid: string | null;
  liters: boolean;
}) {
  const t = useT(STRINGS);
  const { perArea, unitLabel } = useAreaUnit();
  const water = useFarmWaterDemand(farmUid);
  const yieldFields = useFarmYieldFields(farmId);

  const yields = useMemo(() => {
    const fields = yieldFields.data?.fields ?? [];
    const byCategory: Record<YieldCategory, number> = { crop: 0, date_palm: 0, fruit: 0 };
    for (const f of fields) byCategory[f.category] += f.yield_t;
    const total = fields.reduce((s, f) => s + f.yield_t, 0);
    const areaDu = fields.reduce((s, f) => s + (f.area_du ?? 0), 0);
    return { byCategory, total, perDu: areaDu > 0 ? total / areaDu : null };
  }, [yieldFields.data]);

  const status = water.data ? waterStatus(water.data) : null;
  const used = water.data && water.data.allocation_m3 > 0 ? (water.data.monthly_demand_m3 / water.data.allocation_m3) * 100 : null;
  const unit = liters ? "L" : "m³";
  const allocation = water.data ? `${formatInteger(water.data.allocation_m3 * (liters ? 1000 : 1))} ${unit}` : EM_DASH;

  return (
    <Card testId="mon-water-yield-details">
      <CardHeader title={t("detailsTitle")} icon={Droplets} subtitle={t("detailsSubtitle")} />
      <div className="grid gap-6 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line rtl:md:divide-x-reverse">
        <div className="min-w-0 md:pe-6" data-testid="mon-details-water">
          <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">{t("detailsWaterLabel")}</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="whitespace-nowrap text-2xl font-extrabold leading-none">
              {used === null ? EM_DASH : `${formatInteger(used)}%`}
            </span>
            <span className="text-xs text-muted">{t("detailsOfAllocation")}</span>
          </div>
          <div aria-hidden className="mt-3 h-2 overflow-hidden rounded-full bg-[#e9eeec]">
            {status && used !== null && (
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, used)}%`, background: STATUS_COLOR[status] }} />
            )}
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            <Row label={t("detailsAllocation")} value={allocation} />
            <Row label={t("detailsStatus")} value={status ? t(WATER_STATUS_KEY[status]) : EM_DASH} />
          </div>
        </div>
        <div className="min-w-0 md:ps-6" data-testid="mon-details-yield">
          <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted">{t("detailsYieldLabel")}</div>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="whitespace-nowrap text-2xl font-extrabold leading-none">
              {yields.perDu === null ? EM_DASH : formatRate(perArea(yields.perDu))}
            </span>
            <span className="text-xs text-muted">{t("detailsPerArea").replace("{unit}", unitLabel)}</span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
            {SHARE_ROWS.map((row) => (
              <Row
                key={row.category}
                label={t(row.labelKey)}
                value={yields.total > 0 ? `${formatInteger((yields.byCategory[row.category] / yields.total) * 100)}%` : EM_DASH}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
