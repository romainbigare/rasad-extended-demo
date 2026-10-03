import { Trees } from "lucide-react";
import { Donut, donutSummary } from "@/components/ui/Donut";
import { QueryValue } from "@/components/ui/QueryValue";
import { useTreeSummary } from "@/lib/analytics/hooks";
import type { TreeSummary } from "@/lib/analytics/types";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS as FARM_STRINGS } from "../../Farm/data/translations";
import { STRINGS } from "../data/translations";

import { DonutCard } from "./DonutCard";

const TYPES: ReadonlyArray<{ key: keyof Pick<TreeSummary, "date_palm" | "fruit" | "olive" | "native_forest">; labelKey: keyof typeof FARM_STRINGS; color: string }> = [
  { key: "date_palm", labelKey: "treeSegmentDatePalm", color: "#52be40" },
  { key: "fruit", labelKey: "treeSegmentFruit", color: "#fcd20a" },
  { key: "olive", labelKey: "treeSegmentOlive", color: "#4d7c0f" },
  { key: "native_forest", labelKey: "treeSegmentForest", color: "#0b2f3a" },
];

/** Trees by type (date palm, fruit, olive, forest) from the tree summary, as a donut with each type's count. */
export function TreesDonutCard() {
  const t = useT(STRINGS);
  const farm = useT(FARM_STRINGS);
  const trees = useTreeSummary();
  return (
    <DonutCard testId="exec-trees-donut" icon={Trees} title={t("treesCardTitle")} subtitle={t("treesCardSubtitle")} to="/modules/trees">
      <QueryValue
        query={trees}
        render={(d) => {
          const items = TYPES.map((type) => ({
            key: type.key,
            label: farm(type.labelKey),
            color: type.color,
            pct: d.total > 0 ? (d[type.key] / d.total) * 100 : null,
            detail: formatInteger(d[type.key]),
          }));
          return <Donut size={112} items={items} ariaLabel={donutSummary(t("treesCardTitle"), items)} />;
        }}
      />
    </DonutCard>
  );
}
