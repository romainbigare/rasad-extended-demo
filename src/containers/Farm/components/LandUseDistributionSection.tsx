import { LandPlot } from "lucide-react";
import { useState } from "react";

import { Donut, donutSummary } from "@/components/ui/Donut";
import { QueryValue } from "@/components/ui/QueryValue";
import { useLandUseBreakdown, useLandUseSummary } from "@/lib/analytics/hooks";
import type { LandUseClass } from "@/lib/analytics/types";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { formatInteger, formatPercent } from "@/lib/format";

import { LAND_USE_COLORS, landUseShares } from "../data/landUseColors";
import { LAND_USE_CLASS_LABEL_KEY, STRINGS } from "../data/translations";
import { BreakdownTable, DistributionCard } from "./DistributionControls";

const LAND_USE_CLASSES: ReadonlyArray<{ landUse: LandUseClass; color: string }> = (
  ["open_agriculture", "barren_land", "protected_agriculture", "structures", "fallow_land"] as const
).map((landUse) => ({ landUse, color: LAND_USE_COLORS[landUse] }));

/** `hideCenter` leaves the mapped area out of the ring, where the page already shows it as a figure. */
export function LandUseDistributionSection({ hideCenter = false }: { hideCenter?: boolean }) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const landUse = useLandUseSummary();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<LandUseClass>("open_agriculture");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const breakdown = useLandUseBreakdown(showBreakdown ? selected : null);

  const visible = LAND_USE_CLASSES.filter((c) =>
    t(LAND_USE_CLASS_LABEL_KEY[c.landUse]).toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <DistributionCard
      testId="farm-landuse-dist"
      icon={LandPlot}
      title={t("landUseDistCardTitle")}
      subtitle={t("landUseDistCardSubtitle")}
      search={search}
      onSearch={setSearch}
      searchPlaceholder={t("searchByClassPlaceholder")}
      dataset="land-use"
      canExport={Boolean(landUse.data)}
      showBreakdown={showBreakdown}
      onToggleBreakdown={() => setShowBreakdown((v) => !v)}
      breakdown={
        showBreakdown && (
          <QueryValue
            query={breakdown}
            render={(rows) => (
              <BreakdownTable
                testId="landuse-breakdown"
                title={t("breakdownTitleTemplate").replace("{class}", t(LAND_USE_CLASS_LABEL_KEY[selected]))}
                columns={[t("breakdownColSubClass"), t("breakdownColParcels"), t("breakdownColArea").replace("{unit}", unitLabel), t("breakdownColShare"), t("breakdownColFarms")]}
                emptyText={t("breakdownEmpty")}
                rows={rows.map((r) => ({
                  key: r.sub_class,
                  cells: [r.sub_class, formatInteger(r.parcels), formatInteger(area({ du: r.area_du })), formatPercent(r.share_pct), formatInteger(r.farm_count)],
                }))}
              />
            )}
          />
        )
      }
    >
      <QueryValue
        query={landUse}
        render={(d) => {
          if (visible.length === 0) return <p className="m-0 text-xs text-muted">{t("noClassMatchesTemplate").replace("{term}", search)}</p>;
          const shares = landUseShares(d.classes);
          const items = visible.map((c) => ({
            key: c.landUse,
            label: t(LAND_USE_CLASS_LABEL_KEY[c.landUse]),
            color: c.color,
            pct: shares[c.landUse],
          }));
          return (
            <Donut
              testId="landuse-donut"
              legendTestId="landuse-legend"
              items={items}
              ariaLabel={donutSummary(t("landUseDistCardTitle"), items)}
              selectedKey={showBreakdown ? selected : null}
              onSelect={(key) => {
                setSelected(key as LandUseClass);
                setShowBreakdown(true);
              }}
              centerValue={hideCenter ? undefined : formatInteger(area({ du: d.total_area_du }))}
              centerCaption={hideCenter ? undefined : unitLabel}
            />
          );
        }}
      />
    </DistributionCard>
  );
}
