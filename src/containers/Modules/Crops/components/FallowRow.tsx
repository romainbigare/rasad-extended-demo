import { QueryValue } from "@/components/ui/QueryValue";
import { useLandUseSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { formatInteger, formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { CROP_STRINGS } from "../data/translations";

/** The last row of "Crops by area": the land-use map's fallow area and its share of the mapped area, under a muted rule. */
export function FallowRow() {
  const t = useT(CROP_STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const landUse = useLandUseSummary();
  const fallow = (d: NonNullable<typeof landUse.data>) => d.classes.find((c) => c.class === "fallow_land");

  return (
    <div
      className="mt-1 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-dashed border-line pt-3 text-sm"
      data-testid="fallow-land"
    >
      <span className="font-medium">{t("figFallowArea")}</span>
      <span className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="tabular-nums" data-testid="fig-fallow-area">
          <QueryValue
            query={landUse}
            inline
            quiet
            fallback="—"
            render={(d) => `${formatInteger(area({ du: fallow(d)?.area_du, ha: fallow(d)?.area_ha }))} ${unitLabel}`}
          />
        </span>
        <span className="text-xs text-muted">
          <QueryValue
            query={landUse}
            inline
            quiet
            fallback="—"
            render={(d) => {
              const total = d.total_area_du;
              const part = fallow(d)?.area_du;
              return t("figFallowShare").replace("{pct}", formatPercent(total && part !== null && part !== undefined ? (part / total) * 100 : null));
            }}
          />
        </span>
      </span>
    </div>
  );
}
