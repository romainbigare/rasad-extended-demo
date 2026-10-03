import { Building2 } from "lucide-react";
import { DataTable } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { QueryValue } from "@/components/ui/QueryValue";
import { useStructuresSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { formatInteger, formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { LAND_STRINGS } from "../data/translations";

/** Land Use & Structures, the structures half: the built structures in figures and by type, and the holding with most of them. */
export function StructuresSection() {
  const t = useT(LAND_STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const structures = useStructuresSummary();
  const d = structures.data;
  const totalDu = d?.total_area_du ?? 0;

  return (
    <Section
      icon={Building2}
      title={t("structuresTitle")}
      caption={t("structuresCaption")}
      testId="structures-by-type"
      metrics={[
        {
          label: t("figStructuresArea"),
          testId: "fig-structures-area",
          unit: unitLabel,
          value: <QueryValue query={structures} render={(s) => formatInteger(area({ du: s.total_area_du }))} />,
        },
        { label: t("figStructuresCount"), testId: "fig-structures-count", value: <QueryValue query={structures} render={(s) => formatInteger(s.total_count)} /> },
        { label: t("figFarmsWith"), testId: "fig-farms-with", value: <QueryValue query={structures} render={(s) => formatInteger(s.farms_with_structures)} /> },
        {
          label: t("figLargestStructure"),
          testId: "fig-largest-structure",
          value: <QueryValue query={structures} render={(s) => s.largest_structure?.type ?? "—"} />,
          sub: d?.largest_structure ? `${formatInteger(area({ du: d.largest_structure.area_du }))} ${unitLabel}` : undefined,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <DataTable
          rows={d?.by_type}
          rowKey={(r) => r.type}
          isLoading={structures.isLoading}
          isError={structures.isError}
          defaultSort={{ key: "area", dir: "desc" }}
          columns={[
            { key: "type", header: t("colType"), render: (r) => r.type, sortValue: (r) => r.type },
            { key: "count", header: t("colCount"), align: "end", render: (r) => formatInteger(r.count), sortValue: (r) => r.count },
            {
              key: "area",
              header: t("colArea").replace("{unit}", unitLabel),
              align: "end",
              render: (r) => formatInteger(area({ du: r.area_du })),
              sortValue: (r) => r.area_du,
            },
            {
              key: "share",
              header: t("colShare"),
              align: "end",
              render: (r) => formatPercent(totalDu > 0 && r.area_du !== null ? (r.area_du / totalDu) * 100 : null),
              sortValue: (r) => r.area_du,
            },
          ]}
          testId="structures-table"
        />
      </div>
      {d?.largest_holding && (
        <p className="m-0 mt-3 text-xs text-muted" data-testid="structures-largest-holding">
          {t("largestHolding")
            .replace("{farm}", d.largest_holding.farm_name)
            .replace("{area}", formatInteger(area({ du: d.largest_holding.area_du })))
            .replace("{unit}", unitLabel)}
        </p>
      )}
    </Section>
  );
}
