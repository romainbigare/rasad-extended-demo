import { ChartColumn, Warehouse } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell/AppShell";
import { CropGroupTable } from "@/components/crops/CropGroupTable";
import { cropAreaTotals } from "@/components/crops/cropTotals";
import { distinctFarmCounts } from "@/components/crops/farmCounts";
import { PageFrame, Section } from "@/components/frame/PageFrame";
import { QueryValue } from "@/components/ui/QueryValue";
import { useCropSummary, useLandUseSummary, usePortfolioSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { SelectedFarmProvider } from "@/lib/farm/useRegionFarmSelection";
import { useFilterHref } from "@/lib/filters/FilterContext";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { FarmMapPanel } from "../Farm/components/FarmMapPanel";
import { fromFarmMapTabQuery } from "../Farm/map/mapTabState";

// Demo build: open the emirate map with farm boundaries on and coloured by crop, so it is never empty.
const DEMO_MAP_START = { ...fromFarmMapTabQuery({}), layers: { farmBoundaries: true }, thematics: ["cropType" as const] };

import { CropsDonutCard } from "./components/CropsDonutCard";
import { LandDonutCard } from "./components/LandDonutCard";
import { TreesDonutCard } from "./components/TreesDonutCard";
import { STRINGS } from "./data/translations";

/**
 * Executive View: what do we have, and where. Four figures, the emirate GIS map, a row of crop, tree and land donuts, and the crops by area
 * and by farms. The figures are the API's totals for the region.
 * Forestry, canopy health, the species table and the operations domains live on their module pages.
 */
export default function ExecutiveView() {
  const t = useT(STRINGS);
  return (
    <AppShell title={t("pageTitle")}>
      <ExecutiveViewContent />
    </AppShell>
  );
}

/** The page's blocks; inside the AppShell so the region filter is in scope. */
function ExecutiveViewContent() {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const href = useFilterHref();
  const portfolio = usePortfolioSummary();
  const landUse = useLandUseSummary();
  const farmCrops = useCropSummary("farm");

  // Per-crop planted area: each crop's area summed over the farms that grow it (the farm list is the one crop call).
  const planted = useMemo(() => cropAreaTotals(farmCrops.data?.farms ?? []), [farmCrops.data]);
  const byArea = useMemo(
    () => planted.map((c) => ({ name: c.crop, value: area({ du: c.area_du }) ?? 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `area` only changes with the unit
    [planted, unitLabel],
  );
  // Distinct farms per crop and per group, from each farm's own crop mix: a farm growing tomato and cucumber is one farm in Open field.
  const farmCounts = useMemo(() => distinctFarmCounts(farmCrops.data?.farms ?? []), [farmCrops.data]);
  const byFarms = useMemo(() => [...farmCounts.byCrop.entries()].map(([name, value]) => ({ name, value })), [farmCounts]);

  const farmedDu = (d: NonNullable<typeof landUse.data>) =>
    d.classes.filter((c) => c.class === "open_agriculture" || c.class === "protected_agriculture").reduce((sum, c) => sum + (c.area_du ?? 0), 0);

  return (
    <PageFrame
      title={t("pageTitle")}
      testId="executive-view"
      figures={[
        { label: t("figFarms"), testId: "kpi-total-farms", sub: t("figFarmsSub"), value: <QueryValue query={portfolio} render={(d) => formatInteger(d.total_farms)} /> },
        {
          label: t("figArea"),
          testId: "kpi-total-farm-area",
          unit: unitLabel,
          sub: t("figAreaSub"),
          value: <QueryValue query={landUse} render={(d) => formatInteger(area({ du: d.total_area_du }))} />,
        },
        {
          label: t("figFarmed"),
          testId: "kpi-farmed-area",
          unit: unitLabel,
          sub: t("figFarmedSub"),
          value: <QueryValue query={landUse} render={(d) => formatInteger(area({ du: farmedDu(d) }))} />,
        },
        { label: t("figCropsNow"), testId: "kpi-crops-now", sub: t("figCropsNowSub"), value: <QueryValue query={farmCrops} render={() => formatInteger(planted.length)} /> },
      ]}
    >
      {/* The detailed GIS map; its expand button opens /farm/map. */}
      <SelectedFarmProvider>
        <FarmMapPanel title={t("mapPanelTitle")} subtitle={t("mapPanelSubtitle")} initial={DEMO_MAP_START} />
      </SelectedFarmProvider>
      {/* Crops, trees, and land and structures, each a donut with a link to its module page. */}
      <div className="grid items-stretch gap-4 lg:grid-cols-3" data-testid="exec-donuts">
        <CropsDonutCard />
        <TreesDonutCard />
        <LandDonutCard />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title={t("cropsByAreaTitle")}
          icon={ChartColumn}
          caption={t("cropsByAreaCaption")}
          testId="exec-crops-by-area"
          actions={
            <Link href={href("/modules/crops")} className="text-xs font-semibold text-green-d hover:underline">
              {t("openCropMonitoring")}
            </Link>
          }
        >
          <CropGroupTable
            items={byArea}
            valueHeader={t("cropsByAreaValue").replace("{unit}", unitLabel)}
            formatValue={(v) => formatInteger(v)}
            shareTotal={byArea.reduce((sum, c) => sum + c.value, 0)}
            isLoading={farmCrops.isLoading}
            isError={farmCrops.isError}
            testId="exec-crops-by-area-table"
          />
        </Section>
        <Section title={t("cropsByFarmsTitle")} icon={Warehouse} caption={t("cropsByFarmsCaption")} testId="exec-crops-by-farms">
          <CropGroupTable
            items={byFarms}
            valueHeader={t("cropsByFarmsValue")}
            formatValue={(v) => formatInteger(v)}
            shareTotal={farmCounts.withAnyCrop}
            groupValues={farmCounts.byGroup}
            shareHeader={t("cropsByFarmsShare")}
            isLoading={farmCrops.isLoading}
            isError={farmCrops.isError}
            testId="exec-crops-by-farms-table"
          />
        </Section>
      </div>
    </PageFrame>
  );
}
