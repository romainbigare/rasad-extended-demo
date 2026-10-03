import { Warehouse } from "lucide-react";
import { useMemo } from "react";

import { DataTable, FarmLink } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { QueryValue } from "@/components/ui/QueryValue";
import { useEnterpriseKpi, useFarmRankings, usePortfolioSummary } from "@/lib/analytics/hooks";
import type { FarmRankingRow } from "@/lib/analytics/types";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { formatInteger, formatRate, formatYieldT } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { MODULE_STRINGS } from "../../data/translations";
import { HoldingRecords } from "../../shared/HoldingRecords";
import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import type { useModuleFrame } from "../../useModuleFrame";
import { YIELD_STRINGS } from "../data/translations";

/** The most farms asked of the ranking per end. */
const LIMIT = 500;

/** Yield Optimisation, Yield forecast: the total forecast, the average per farm, and the forecast of each farm. */
export function YieldForecastTab({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(YIELD_STRINGS);
  const m = useT(MODULE_STRINGS);
  const { perArea, unitLabel } = useAreaUnit();
  const kpi = useEnterpriseKpi("yield");
  const portfolio = usePortfolioSummary();
  const highest = useFarmRankings("yield", "top", "", LIMIT);
  const lowest = useFarmRankings("yield", "bottom", "", LIMIT);

  // The API types yields as nullable: anything that is not a finite number reads as "no value".
  const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
  const rate = (v: number | null | undefined) => (finite(v) ? formatRate(perArea(v)) : "—");
  const rows = useMemo(() => {
    const merged = new Map<number, FarmRankingRow>();
    for (const row of [...(highest.data?.rows ?? []), ...(lowest.data?.rows ?? [])]) merged.set(row.farm_id, row);
    return [...merged.values()];
  }, [highest.data, lowest.data]);
  const capped = (highest.data?.rows.length ?? 0) >= LIMIT || (lowest.data?.rows.length ?? 0) >= LIMIT;
  const caption = capped ? `${t("farmsCaption")} ${t("farmsCappedCaption").replace(/\{n\}/g, formatInteger(LIMIT))}` : t("farmsCaption");
  const tonnes = (value: number | null | undefined) => (value === null || value === undefined ? "—" : formatYieldT(value));

  return (
    <ModuleTabFrame
      frame={frame}
      testId="module-yield-forecast"
      figures={[
        { label: t("figTotal"), testId: "fig-total", unit: "t", value: <QueryValue query={kpi} render={(d) => formatInteger(d.value)} /> },
        { label: t("figFarms"), testId: "fig-farms", sub: t("figFarmsSub"), value: <QueryValue query={portfolio} render={(d) => formatInteger(d.total_farms)} /> },
        {
          label: t("figAverage"),
          testId: "fig-average",
          unit: "t",
          sub: t("figAverageSub"),
          value: <QueryValue query={highest} render={(d) => (finite(d.averages?.yield_t) ? formatInteger(d.averages.yield_t) : "—")} />,
        },
      ]}
    >
      <Section icon={Warehouse} title={t("farmsTitle")} caption={caption} testId="yield-farms">
        <DataTable
          rows={rows}
          rowKey={(r) => String(r.farm_id)}
          isLoading={highest.isLoading || lowest.isLoading}
          isError={highest.isError || lowest.isError}
          defaultSort={{ key: "yield", dir: "desc" }}
          emptyText={m("noSelectionRows")}
          columns={[
            { key: "farm", header: m("farmColumn"), render: (r) => <FarmLink farmId={r.farm_id} name={r.farm_name ?? r.farm_uid} />, sortValue: (r) => r.farm_name ?? r.farm_uid },
            { key: "region", header: m("regionColumn"), render: (r) => r.zone_name ?? "—", sortValue: (r) => r.zone_name },
            { key: "crops", header: t("colCrops"), render: (r) => <span className="text-muted">{r.crops ?? "—"}</span>, sortValue: (r) => r.crops },
            { key: "yield", header: t("colYield"), align: "end", render: (r) => tonnes(r.yield_t), sortValue: (r) => r.yield_t },
            {
              key: "perArea",
              header: t("colPerArea").replace("{unit}", unitLabel),
              align: "end",
              render: (r) => rate(r.yield_t_per_du),
              sortValue: (r) => r.yield_t_per_du,
            },
            { key: "crop", header: t("colCrop"), align: "end", render: (r) => tonnes(r.yield_breakdown?.crop_t), sortValue: (r) => r.yield_breakdown?.crop_t ?? null },
            { key: "palm", header: t("colDatePalm"), align: "end", render: (r) => tonnes(r.yield_breakdown?.date_palm_t), sortValue: (r) => r.yield_breakdown?.date_palm_t ?? null },
            { key: "fruit", header: t("colFruit"), align: "end", render: (r) => tonnes(r.yield_breakdown?.fruit_t), sortValue: (r) => r.yield_breakdown?.fruit_t ?? null },
          ]}
          testId="yield-farms-table"
        />
      </Section>
      <HoldingRecords kind="yield" />
    </ModuleTabFrame>
  );
}
