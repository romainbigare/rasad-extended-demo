import { Warehouse } from "lucide-react";
import { DataTable, FarmLink } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { BreakdownRow } from "@/components/ui/BreakdownSlot";
import { Card } from "@/components/ui/Card";
import { QueryValue } from "@/components/ui/QueryValue";
import { CanopyHealthSection } from "@/containers/ExecutiveView/components/CanopyHealthSection";
import { SpeciesCultivarTable } from "@/containers/ExecutiveView/components/SpeciesCultivarTable";
import { TreeDistributionSection } from "@/containers/Farm/components/TreeDistributionSection";
import { useEnterpriseKpi, useFarmHealthRankings, useTreeSummary } from "@/lib/analytics/hooks";
import { formatCompact, formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { MODULE_STRINGS } from "../../data/translations";
import { HoldingRecords } from "../../shared/HoldingRecords";
import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import { useFarmNames } from "../../shared/useFarmNames";
import type { useModuleFrame } from "../../useModuleFrame";
import { TREE_STRINGS } from "../data/translations";

/**
 * Tree Monitoring: how many trees and of what kind, and how healthy the palms are. One figure strip
 * (the census and the canopy score), the two donuts side by side, then the species table, each farm's
 * Canopy Health Index and the holding records.
 */
export function TreesPage({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(TREE_STRINGS);
  const m = useT(MODULE_STRINGS);
  const trees = useTreeSummary();
  const health = useEnterpriseKpi("treeHealth");
  const rankings = useFarmHealthRankings(true);
  const names = useFarmNames();

  return (
    <ModuleTabFrame
      frame={frame}
      testId="module-trees"
      figures={[
        { label: t("figTrees"), testId: "fig-trees", sub: t("figTreesSub"), value: <QueryValue query={trees} render={(d) => formatInteger(d.total)} /> },
        {
          label: t("figDatePalms"),
          testId: "fig-date-palms",
          // The yield estimate of the forecast roll-up, where it has one.
          sub: <QueryValue query={trees} inline quiet render={(d) => (d.date_palm_yield_t === null ? null : t("figDatePalmsSub").replace("{n}", formatCompact(d.date_palm_yield_t)))} />,
          value: <QueryValue query={trees} render={(d) => formatInteger(d.date_palm)} />,
        },
        { label: t("figAverageChi"), testId: "fig-average-chi", value: <QueryValue query={health} render={(d) => formatInteger(d.average_score)} /> },
        {
          label: t("figStressed"),
          testId: "fig-stressed",
          sub: t("figStressedSub"),
          value: <QueryValue query={health} render={(d) => formatInteger(d.value)} />,
        },
      ]}
    >
      <BreakdownRow className="grid items-stretch gap-4 lg:grid-cols-2">
        <TreeDistributionSection hideCenter />
        <CanopyHealthSection />
      </BreakdownRow>
      <Card className="!p-0" testId="species-card">
        <SpeciesCultivarTable />
      </Card>
      <Section icon={Warehouse} title={t("canopyFarmsTitle")} caption={t("canopyFarmsCaption")} testId="canopy-farms">
        <DataTable
          rows={rankings.data?.rows ?? []}
          rowKey={(r) => String(r.farm_id)}
          isLoading={rankings.isLoading}
          isError={rankings.isError}
          defaultSort={{ key: "chi", dir: "desc" }}
          columns={[
            {
              key: "farm",
              header: m("farmColumn"),
              render: (r) => <FarmLink farmId={r.farm_id} name={names.byId.get(Number(r.farm_id))?.name ?? String(r.farm_id)} />,
              sortValue: (r) => names.byId.get(Number(r.farm_id))?.name ?? String(r.farm_id),
            },
            {
              key: "chi",
              header: t("colChi"),
              align: "end",
              render: (r) => formatInteger(r.average_canopy_health_index),
              sortValue: (r) => r.average_canopy_health_index,
            },
          ]}
          testId="canopy-farms-table"
        />
      </Section>
      <HoldingRecords kind="treeHealth" />
    </ModuleTabFrame>
  );
}
