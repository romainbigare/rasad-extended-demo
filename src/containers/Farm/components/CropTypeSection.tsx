import { Sprout } from "lucide-react";
import { useState } from "react";

import { Donut, donutSummary } from "@/components/ui/Donut";
import { QueryValue } from "@/components/ui/QueryValue";
import { useCropSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { formatInteger, formatPercent } from "@/lib/format";

import { cropColor } from "../data/cropColors";
import { STRINGS } from "../data/translations";
import { BreakdownTable, DistributionCard } from "./DistributionControls";

/** `hideCenter` leaves the crop count out of the ring, where the page already shows it as a figure. */
export function CropTypeSection({ hideCenter = false }: { hideCenter?: boolean }) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const crops = useCropSummary("farm");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const allCrops = crops.data?.crops ?? [];
  const colorOf = (crop: string) => cropColor(allCrops, crop);
  // "Search by farm or crop": a crop stays if its name matches, or any farm growing it does.
  const needle = search.trim().toLowerCase();
  const farmMatches = (name: string) => name.toLowerCase().includes(needle);
  const farmsList = crops.data?.farms ?? [];
  const visible = allCrops.filter(
    (c) =>
      c.crop.toLowerCase().includes(needle) ||
      farmsList.some((farm) => farmMatches(farm.farm_name) && farm.crops.some((fc) => fc.crop === c.crop)),
  );
  const activeCrop = selected ?? allCrops[0]?.crop ?? null;
  const cropMatches = activeCrop !== null && activeCrop.toLowerCase().includes(needle);
  const farmsGrowing = farmsList
    .flatMap((farm) => farm.crops.filter((c) => c.crop === activeCrop).map((c) => ({ farm, crop: c })))
    // A farm search narrows the breakdown to the matching farms.
    .filter(({ farm }) => !needle || cropMatches || farmMatches(farm.farm_name))
    .sort((a, b) => (b.crop.area_du ?? 0) - (a.crop.area_du ?? 0));

  return (
    <DistributionCard
      testId="farm-crop-type"
      icon={Sprout}
      title={t("cropCardTitle")}
      subtitle={t("cropCardSubtitle")}
      search={search}
      onSearch={setSearch}
      searchPlaceholder={t("searchByCropPlaceholder")}
      dataset="crops"
      canExport={Boolean(crops.data)}
      showBreakdown={showBreakdown}
      onToggleBreakdown={() => setShowBreakdown((v) => !v)}
      breakdown={
        showBreakdown &&
        crops.data &&
        activeCrop && (
          <BreakdownTable
            testId="crop-breakdown"
            title={t("cropBreakdownTitleTemplate").replace("{crop}", activeCrop)}
            columns={[t("breakdownColFarm"), t("breakdownColPlanted").replace("{unit}", unitLabel), t("breakdownColShareOfFarm"), t("breakdownColFields")]}
            emptyText={t("breakdownEmpty")}
            rows={farmsGrowing.map(({ farm, crop }) => ({
              key: String(farm.farm_id),
              cells: [farm.farm_name, formatInteger(area({ du: crop.area_du })), formatPercent(crop.share_pct), formatInteger(crop.field_count)],
            }))}
          />
        )
      }
    >
      <QueryValue
        query={crops}
        render={() => {
          if (allCrops.length === 0) return <p className="m-0 text-xs text-muted">{t("cropNoData")}</p>;
          if (visible.length === 0) return <p className="m-0 text-xs text-muted">{t("noClassMatchesTemplate").replace("{term}", search)}</p>;
          const items = visible.map((c) => ({ key: c.crop, label: c.crop, color: colorOf(c.crop), pct: c.share_pct }));
          return (
            <Donut
              testId="crop-type-donut"
              legendTestId="crop-type-legend"
              items={items}
              ariaLabel={donutSummary(t("cropCardTitle"), items)}
              selectedKey={showBreakdown ? activeCrop : null}
              onSelect={(key) => {
                setSelected(key);
                setShowBreakdown(true);
              }}
              centerValue={hideCenter ? undefined : formatInteger(visible.length)}
              centerCaption={hideCenter ? undefined : t("cropCenterCaption")}
            />
          );
        }}
      />
    </DistributionCard>
  );
}
