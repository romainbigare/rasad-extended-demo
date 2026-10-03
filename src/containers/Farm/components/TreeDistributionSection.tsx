import { Trees } from "lucide-react";
import { useState } from "react";

import { Donut, donutSummary } from "@/components/ui/Donut";
import { QueryValue } from "@/components/ui/QueryValue";
import { useSpeciesSummary, useTreeSummary } from "@/lib/analytics/hooks";
import type { SpeciesCategory, TreeSummary } from "@/lib/analytics/types";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { formatInteger, formatPercent } from "@/lib/format";

import { STRINGS } from "../data/translations";
import { BreakdownTable, DistributionCard } from "./DistributionControls";

type SegmentKey = keyof Pick<TreeSummary, "date_palm" | "native_forest" | "olive" | "fruit">;

/** `species` is the analytics/trees/species category that lists this type's varieties. */
const SEGMENTS: ReadonlyArray<{ key: SegmentKey; labelKey: keyof typeof STRINGS; color: string; species: SpeciesCategory }> = [
  { key: "date_palm", labelKey: "treeSegmentDatePalm", color: "#52be40", species: "date_palm" },
  { key: "native_forest", labelKey: "treeSegmentForest", color: "#0b2f3a", species: "native" },
  { key: "olive", labelKey: "treeSegmentOlive", color: "#4d7c0f", species: "fruit" },
  { key: "fruit", labelKey: "treeSegmentFruit", color: "#fcd20a", species: "fruit" },
];

/** `hideCenter` leaves the tree total out of the ring, where the page already shows it as a figure. */
export function TreeDistributionSection({ hideCenter = false }: { hideCenter?: boolean }) {
  const t = useT(STRINGS);
  const { area, unitLabel, unitWord } = useAreaUnit();
  const trees = useTreeSummary();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SegmentKey>("date_palm");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const segment = SEGMENTS.find((s) => s.key === selected) ?? SEGMENTS[0];
  const species = useSpeciesSummary(segment.species);

  const visible = SEGMENTS.filter((s) => t(s.labelKey).toLowerCase().includes(search.trim().toLowerCase()));
  // Olive and other fruit share one species category - split them by name.
  const varieties = (species.data?.rows ?? []).filter((r) =>
    selected === "olive" ? /olive/i.test(r.species) : selected === "fruit" ? !/olive/i.test(r.species) : true,
  );

  return (
    <DistributionCard
      testId="farm-tree-dist"
      icon={Trees}
      title={t("treeDistCardTitle")}
      subtitle={t("treeDistCardSubtitle")}
      search={search}
      onSearch={setSearch}
      searchPlaceholder={t("searchByTreeTypePlaceholder")}
      dataset="trees"
      canExport={Boolean(trees.data)}
      showBreakdown={showBreakdown}
      onToggleBreakdown={() => setShowBreakdown((v) => !v)}
      breakdown={
        showBreakdown && (
          <QueryValue
            query={species}
            render={() => (
              <BreakdownTable
                testId="tree-breakdown"
                title={t("treeBreakdownTitleTemplate").replace("{type}", t(segment.labelKey))}
                columns={[t("breakdownColVariety"), t("breakdownColTrees"), t("breakdownColShare"), t("breakdownColArea").replace("{unit}", unitLabel)]}
                emptyText={t("breakdownEmpty")}
                rows={varieties.map((r) => ({
                  key: r.display_name,
                  cells: [r.display_name, formatInteger(r.tree_count), formatPercent(r.category_share_pct), formatInteger(area({ du: r.area_du }))],
                }))}
              />
            )}
          />
        )
      }
    >
      <QueryValue
        query={trees}
        render={(d) => {
          if (visible.length === 0) return <p className="m-0 text-xs text-muted">{t("noClassMatchesTemplate").replace("{term}", search)}</p>;
          const items = visible.map((s) => ({
            key: s.key,
            label: t(s.labelKey),
            color: s.color,
            pct: d.total > 0 ? (d[s.key] / d.total) * 100 : null,
          }));
          return (
            <>
              <Donut
                testId="tree-dist-donut"
                legendTestId="tree-dist-legend"
                items={items}
                ariaLabel={donutSummary(t("treeDistCardTitle"), items)}
                selectedKey={showBreakdown ? selected : null}
                onSelect={(key) => {
                  setSelected(key as SegmentKey);
                  setShowBreakdown(true);
                }}
                centerValue={hideCenter ? undefined : formatInteger(d.total)}
                centerCaption={hideCenter ? undefined : t("kpiTreesUnit")}
              />
              <div className="text-[11px] text-muted">
                {t("treeCanopyAreaTemplate")
                  .replace("{area}", formatInteger(area({ du: d.canopy_area_du }) ?? 0))
                  .replace("{unit}", unitWord)}
              </div>
            </>
          );
        }}
      />
    </DistributionCard>
  );
}
