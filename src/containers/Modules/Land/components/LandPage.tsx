import { QueryValue } from "@/components/ui/QueryValue";
import { OperationsDomainSection } from "@/containers/ExecutiveView/components/OperationsDomainSection";
import { LandUseDistributionSection } from "@/containers/Farm/components/LandUseDistributionSection";
import { useLandUseSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { HoldingRecords } from "../../shared/HoldingRecords";
import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import type { useModuleFrame } from "../../useModuleFrame";
import { LAND_STRINGS } from "../data/translations";
import { StructuresSection } from "./StructuresSection";

/**
 * Land Use & Structures: the land-use classes and the three operations domains (Open agriculture ·
 * Protected agriculture · Structures), then the built structures below.
 */
export function LandPage({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(LAND_STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const landUse = useLandUseSummary();
  const areaOf = (cls: string) => (d: NonNullable<typeof landUse.data>) => {
    const entry = d.classes.find((c) => c.class === cls);
    return formatInteger(area({ du: entry?.area_du, ha: entry?.area_ha }));
  };
  return (
    <ModuleTabFrame
      frame={frame}
      testId="module-land"
      figuresAside={<LandUseDistributionSection hideCenter />}
      figures={[
        {
          label: t("figTotalArea"),
          testId: "fig-total-area",
          unit: unitLabel,
          sub: t("figTotalAreaSub"),
          value: <QueryValue query={landUse} render={(d) => formatInteger(area({ du: d.total_area_du, ha: d.total_area_ha }))} />,
        },
        { label: t("figOpen"), testId: "fig-open", unit: unitLabel, value: <QueryValue query={landUse} render={areaOf("open_agriculture")} /> },
        { label: t("figProtected"), testId: "fig-protected", unit: unitLabel, value: <QueryValue query={landUse} render={areaOf("protected_agriculture")} /> },
        { label: t("figBarren"), testId: "fig-barren", unit: unitLabel, value: <QueryValue query={landUse} render={areaOf("barren_land")} /> },
      ]}
    >
      <OperationsDomainSection compact />
      <StructuresSection />
      <HoldingRecords kind="structures" />
    </ModuleTabFrame>
  );
}
