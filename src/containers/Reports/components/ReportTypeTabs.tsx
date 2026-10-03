import { Building2, Droplets, Layers, Sprout, Trees, Warehouse, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cx } from "@/components/ui/cx";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import { useReportTabCounts } from "../hooks/useReportTabCounts";

/** `value` is the stable identifier used for type-narrowing and lookups
 * elsewhere (ReportsTable's switch, exportReports, etc.) - never translate
 * it. `labelKey` is resolved to display text at render time via useT. */
export const REPORT_TYPES = [
  { value: "farms", labelKey: "tabFarms" },
  { value: "fields", labelKey: "tabFields" },
  { value: "structures", labelKey: "tabStructures" },
  { value: "date-cultivars", labelKey: "tabDateCultivars" },
  { value: "crops", labelKey: "tabCrops" },
  { value: "water-quota", labelKey: "tabWaterQuota" },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]["value"];

/** Each tab's Lucide icon (muted; white-ish when selected). */
// Typed as LucideIcon: a ComponentType<{ size?: number; ... }> type does not accept lucide icons
// (their size is number | string).
const TAB_ICON: Record<ReportType, { Icon: LucideIcon }> = {
  farms: { Icon: Warehouse },
  fields: { Icon: Layers },
  structures: { Icon: Building2 },
  "date-cultivars": { Icon: Trees },
  crops: { Icon: Sprout },
  "water-quota": { Icon: Droplets },
};

const SHOW_COLUMN_CONTRACT = false;

const COLUMNS: Record<ReportType, string> = {
  farms: "farm, region / zone, crop mix, area_du, parcels, forecast_yield_t, ier, ier_class, ier_band, water_balance_m3",
  fields: "parcel_id, farm, area_du, land_use, ndvi, health, watering_method, growth_status",
  structures: "structure_type, count, area_du",
  "date-cultivars": "farm, species, palm_count, planted_du, avg_age, maturity_stage, est_yield_t, vigor_score, weevil_risk, irrigation",
  crops: "farm, crop, planted_du, share_of_farm, fields, season, status",
  "water-quota": "farm, region / zone, holding_area_du, allocated_m3, consumed_m3, net_balance_m3, ier",
};

export function ReportTypeTabs({ type, onChange }: { type: ReportType; onChange: (type: ReportType) => void }) {
  const t = useT(STRINGS);
  const [showColumns, setShowColumns] = useState(false);
  const counts = useReportTabCounts();
  const tablistRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Narrow screens scroll the tabs sideways: bring the picked tab into view (not on first load).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    tablistRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [type]);

  return (
    <div className="border-b border-line pb-2.5" data-testid="reports-tabs">
      {/* Below xl the tabs scroll sideways - the end edge fades out to show there are more. */}
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={t("segmentedControlLabel")}
        className="flex gap-2 overflow-x-auto p-0.5 max-xl:[mask-image:linear-gradient(to_left,transparent,#000_32px)] max-xl:rtl:[mask-image:linear-gradient(to_right,transparent,#000_32px)]"
      >
        {REPORT_TYPES.map((rt) => {
          const active = rt.value === type;
          const count = counts[rt.value];
          return (
            <button
              key={rt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(rt.value)}
              className={cx(
                "flex flex-none items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                active ? "border-teal bg-teal text-white" : "border-line bg-white text-ink hover:bg-[#F4F7F6]",
              )}
            >
              {(() => {
                const { Icon } = TAB_ICON[rt.value];
                return <Icon size={15} strokeWidth={1.8} aria-hidden className={active ? "text-white/80" : "text-muted"} />;
              })()}
              {t(rt.labelKey)}
              {count !== undefined && (
                <span className={cx("font-normal tabular-nums", active ? "text-white/70" : "text-muted")}>{formatInteger(count)}</span>
              )}
            </button>
          );
        })}
      </div>
      {SHOW_COLUMN_CONTRACT && (
        <details className="mt-3" open={showColumns} onToggle={(e) => setShowColumns(e.currentTarget.open)}>
          <summary className="cursor-pointer text-xs font-bold">{t("columnContractSummary")}</summary>
          <table className="mt-2 w-full border-collapse text-xs">
            <tbody>
              {REPORT_TYPES.map((rt) => (
                <tr key={rt.value} className="border-b border-line align-top">
                  <td className="whitespace-nowrap py-2 pe-3 font-semibold max-sm:whitespace-normal">{t(rt.labelKey)}</td>
                  <td className="py-2 font-mono text-xs text-muted [overflow-wrap:anywhere]">{COLUMNS[rt.value]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}
