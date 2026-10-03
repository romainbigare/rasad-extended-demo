import { ChartColumn, Warehouse } from "lucide-react";
import { useMemo } from "react";

import { CropGroupTable } from "@/components/crops/CropGroupTable";
import { DataTable, FarmLink } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { QueryValue } from "@/components/ui/QueryValue";
import { CropTypeSection } from "@/containers/Farm/components/CropTypeSection";
import { cropAreaTotals } from "@/components/crops/cropTotals";
import { useCropSummary, usePortfolioSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import type { useModuleFrame } from "../../useModuleFrame";
import { CROP_STRINGS } from "../data/translations";
import { FallowRow } from "./FallowRow";

interface FarmCropRow {
  farmId: number;
  name: string;
  crops: string;
  mainCrop: string;
  areaDu: number;
  fields: number;
}

/** Crop Monitoring: what is planted, by group and crop, which farms grow it; the crop donut sits beside the figures, and the fallow land is the last row of Crops by area. */
export function CropsPage({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(CROP_STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const farmCrops = useCropSummary("farm");
  const portfolio = usePortfolioSummary();

  // Per-crop totals come from the farm list: each crop's area summed over the farms that grow it.
  const planted = useMemo(() => cropAreaTotals(farmCrops.data?.farms ?? []), [farmCrops.data]);
  const plantedDu = useMemo(() => planted.reduce((sum, c) => sum + c.area_du, 0), [planted]);

  const areaItems = useMemo(
    () => planted.map((c) => ({ name: c.crop, value: area({ du: c.area_du }) ?? 0 })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `area` only changes with the unit
    [planted, unitLabel],
  );

  const farmRows = useMemo<FarmCropRow[]>(
    () =>
      (farmCrops.data?.farms ?? []).flatMap((farm) => {
        const own = farm.crops;
        if (own.length === 0) return [];
        const main = [...own].sort((a, b) => (b.area_du ?? 0) - (a.area_du ?? 0))[0];
        return [
          {
            farmId: farm.farm_id,
            name: farm.farm_name,
            crops: own.map((c) => c.crop).join(", "),
            mainCrop: main.crop,
            areaDu: own.reduce((sum, c) => sum + (c.area_du ?? 0), 0),
            fields: own.reduce((sum, c) => sum + c.field_count, 0),
          },
        ];
      }),
    [farmCrops.data],
  );

  return (
    <ModuleTabFrame
      frame={frame}
      testId="module-crops"
      figuresAside={<CropTypeSection hideCenter />}
      figures={[
        {
          label: t("figCropArea"),
          testId: "fig-crop-area",
          unit: unitLabel,
          value: <QueryValue query={farmCrops} render={() => formatInteger(area({ du: plantedDu }))} />,
        },
        {
          label: t("figCropsNow"),
          testId: "fig-crops-now",
          sub: t("figCropsNowSub"),
          value: <QueryValue query={farmCrops} render={() => formatInteger(planted.length)} />,
        },
        { label: t("figFields"), testId: "fig-fields", value: <QueryValue query={portfolio} render={(d) => formatInteger(d.total_fields)} /> },
        { label: t("figFarms"), testId: "fig-farms", value: <QueryValue query={portfolio} render={(d) => formatInteger(d.total_farms)} /> },
      ]}
    >
      <Section icon={ChartColumn} title={t("areaTitle")} caption={t("areaCaption")} testId="crops-by-area">
        <CropGroupTable
          items={areaItems}
          valueHeader={t("areaValueHeader").replace("{unit}", unitLabel)}
          formatValue={(v) => formatInteger(Math.round(v))}
          shareTotal={areaItems.reduce((sum, c) => sum + c.value, 0)}
          isLoading={farmCrops.isLoading}
          isError={farmCrops.isError}
        />
        <FallowRow />
      </Section>
      <Section icon={Warehouse} title={t("farmsTitle")} caption={t("farmsCaption")} testId="crops-farms">
        <DataTable
          rows={farmRows}
          rowKey={(r) => String(r.farmId)}
          isLoading={farmCrops.isLoading}
          isError={farmCrops.isError}
          defaultSort={{ key: "area", dir: "desc" }}
          columns={[
            { key: "farm", header: t("colFarmName"), render: (r) => <FarmLink farmId={r.farmId} name={r.name} />, sortValue: (r) => r.name },
            { key: "crops", header: t("colCrops"), render: (r) => <span className="text-muted">{r.crops}</span> },
            { key: "main", header: t("colMainCrop"), render: (r) => r.mainCrop, sortValue: (r) => r.mainCrop },
            {
              key: "area",
              header: t("colPlanted").replace("{unit}", unitLabel),
              align: "end",
              render: (r) => formatInteger(area({ du: r.areaDu })),
              sortValue: (r) => r.areaDu,
            },
            { key: "fields", header: t("colFields"), align: "end", render: (r) => formatInteger(r.fields), sortValue: (r) => r.fields },
          ]}
          testId="crops-farms-table"
        />
      </Section>
    </ModuleTabFrame>
  );
}
