import { Droplets } from "lucide-react";
import { useMemo } from "react";

import { DataTable, FarmLink } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { QueryValue } from "@/components/ui/QueryValue";
import { useSelectedZone, useWaterCalculatorSummary, useWaterFarmTotals } from "@/lib/analytics/hooks";
import { useFarmList } from "@/lib/farm/useFarmList";
import { formatCompact, formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { MODULE_STRINGS } from "../../data/translations";
import { HoldingRecords } from "../../shared/HoldingRecords";
import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import type { useModuleFrame } from "../../useModuleFrame";
import { WATER_STRINGS } from "../data/translations";

/** Crop Water Calculator: the calculated demand of all farms, how many are above their allocation, and each farm's monthly demand. */
export function WaterPage({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(WATER_STRINGS);
  const m = useT(MODULE_STRINGS);
  const zone = useSelectedZone();
  const summary = useWaterCalculatorSummary();
  const totals = useWaterFarmTotals(true);
  const farms = useFarmList();

  // The water service has no region filter: the figures cover every region, the table follows the region menu.
  const regionNote = zone ? m("allRegions") : undefined;
  // The service names a farm by its code (uid); the farm list gives its name, id and region.
  const rows = useMemo(() => {
    const byUid = new Map((farms.data ?? []).map((f) => [f.uid, f]));
    return (totals.data?.rows ?? []).flatMap((r) => {
      const farm = byUid.get(r.farm_id);
      if (zone && farm?.zone_id !== zone.id) return [];
      return [{ uid: r.farm_id, id: farm?.id ?? null, name: farm?.name ?? r.farm_id, monthly: r.monthly_demand_m3 }];
    });
  }, [totals.data, farms.data, zone]);

  return (
    <ModuleTabFrame
      frame={frame}
      testId="module-water"
      figures={[
        {
          label: t("figDemand"),
          testId: "fig-demand",
          unit: "m³",
          sub: regionNote ?? t("figDemandSub"),
          value: <QueryValue query={summary} render={(d) => formatCompact(d.total_demand_m3)} />,
        },
        {
          label: t("figAbove"),
          testId: "fig-farms-above",
          sub: regionNote ?? <QueryValue query={summary} inline quiet render={(d) => t("figAboveSub").replace("{total}", formatInteger(d.total_farms))} />,
          value: <QueryValue query={summary} render={(d) => formatInteger(d.farms_above_allocation)} />,
        },
      ]}
    >
      <Section icon={Droplets} title={t("farmsTitle")} caption={t("farmsCaption")} testId="water-farms">
        <DataTable
          rows={rows}
          rowKey={(r) => r.uid}
          isLoading={totals.isLoading || farms.isLoading}
          isError={totals.isError}
          defaultSort={{ key: "monthly", dir: "desc" }}
          emptyText={m("noSelectionRows")}
          columns={[
            { key: "farm", header: m("farmColumn"), render: (r) => <span className="whitespace-nowrap"><FarmLink farmId={r.id} name={r.name} /></span>, sortValue: (r) => r.name },
            { key: "monthly", header: t("colMonthly"), align: "end", render: (r) => formatInteger(r.monthly), sortValue: (r) => r.monthly },
          ]}
          testId="water-farms-table"
        />
      </Section>
      <HoldingRecords kind="water" />
    </ModuleTabFrame>
  );
}
