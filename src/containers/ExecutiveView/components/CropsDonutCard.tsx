import { Sprout } from "lucide-react";
import { Donut, donutSummary } from "@/components/ui/Donut";
import { QueryValue } from "@/components/ui/QueryValue";
import { useCropSummary } from "@/lib/analytics/hooks";
import { useT } from "@/lib/i18n/createDict";

import { cropColor } from "../../Farm/data/cropColors";
import { STRINGS } from "../data/translations";

import { DonutCard } from "./DonutCard";

/** Crops by share of the planted area (analytics crop summary), as a donut with its legend. */
export function CropsDonutCard() {
  const t = useT(STRINGS);
  const crops = useCropSummary("farm");
  return (
    <DonutCard testId="exec-crops-donut" icon={Sprout} title={t("cropsCardTitle")} subtitle={t("cropsCardSubtitle")} to="/modules/crops">
      <QueryValue
        query={crops}
        render={(d) => {
          if (d.crops.length === 0) return <p className="m-0 text-xs text-muted">{t("cardNoData")}</p>;
          const items = d.crops.map((c) => ({ key: c.crop, label: c.crop, color: cropColor(d.crops, c.crop), pct: c.share_pct }));
          return <Donut size={112} items={items} ariaLabel={donutSummary(t("cropsCardTitle"), items)} />;
        }}
      />
    </DonutCard>
  );
}
