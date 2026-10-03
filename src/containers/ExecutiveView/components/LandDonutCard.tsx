import { LandPlot } from "lucide-react";
import { Donut, donutSummary } from "@/components/ui/Donut";
import { QueryValue } from "@/components/ui/QueryValue";
import { useLandUseSummary } from "@/lib/analytics/hooks";
import type { LandUseClass } from "@/lib/analytics/types";
import { useT } from "@/lib/i18n/createDict";

import { LAND_USE_COLORS, landUseShares } from "../../Farm/data/landUseColors";
import { LAND_USE_CLASS_LABEL_KEY, STRINGS as FARM_STRINGS } from "../../Farm/data/translations";
import { STRINGS } from "../data/translations";

import { DonutCard } from "./DonutCard";

const CLASSES: readonly LandUseClass[] = ["open_agriculture", "protected_agriculture", "structures", "barren_land", "fallow_land"];

/** Land use (open and protected agriculture, structures, barren, fallow) by share of their total area, as a donut. */
export function LandDonutCard() {
  const t = useT(STRINGS);
  const farm = useT(FARM_STRINGS);
  const landUse = useLandUseSummary();
  return (
    <DonutCard testId="exec-land-donut" icon={LandPlot} title={t("landCardTitle")} subtitle={t("landCardSubtitle")} to="/modules/land">
      <QueryValue
        query={landUse}
        render={(d) => {
          const shares = landUseShares(d.classes);
          const items = CLASSES.map((c) => ({
            key: c,
            label: farm(LAND_USE_CLASS_LABEL_KEY[c]),
            color: LAND_USE_COLORS[c],
            pct: shares[c],
          }));
          return <Donut size={112} items={items} ariaLabel={donutSummary(t("landCardTitle"), items)} />;
        }}
      />
    </DonutCard>
  );
}
