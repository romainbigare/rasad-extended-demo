import { CalendarRange } from "lucide-react";
import { useMemo } from "react";

import { DataTable } from "@/components/frame/DataTable";
import { EmptyNote } from "@/components/frame/EmptyNote";
import { Section } from "@/components/frame/PageFrame";
import { useCropReportRows } from "@/containers/Reports/hooks/useReportRows";
import { CROP_GROUPS, cropGroup, groupInfo } from "@/lib/crops/groups";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { useDayDateFormat } from "@/lib/useDayDateFormat";

import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import type { useModuleFrame } from "../../useModuleFrame";
import { YIELD_STRINGS } from "../data/translations";

interface CalendarRow {
  crop: string;
  farms: number;
  /** ISO dates, YYYY-MM-DD, so they sort as text. */
  plantFrom: string;
  plantTo: string;
  harvestFrom: string;
  harvestTo: string;
  season: string | null;
}

const MONTH_MS = 30.4375 * 24 * 3600 * 1000;
const day = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);

/**
 * Yield Optimisation, Crop calendar: when each crop is planted and harvested, from the planting and
 * harvest dates the crop report holds per farm and crop. Without dates it says what is missing.
 */
export function YieldCalendarTab({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(YIELD_STRINGS);
  const { language } = useLanguage();
  const formatDay = useDayDateFormat();
  const report = useCropReportRows();

  const rows = useMemo<CalendarRow[]>(() => {
    const byCrop = new Map<string, CalendarRow & { farmIds: Set<number> }>();
    for (const r of report.rows ?? []) {
      if (!r.plantingDate || !r.harvestDate) continue;
      const planting = r.plantingDate.slice(0, 10);
      const harvest = r.harvestDate.slice(0, 10);
      const current = byCrop.get(r.crop);
      if (!current) {
        byCrop.set(r.crop, { crop: r.crop, farms: 0, farmIds: new Set([r.farmId]), plantFrom: planting, plantTo: planting, harvestFrom: harvest, harvestTo: harvest, season: r.season });
      } else {
        current.farmIds.add(r.farmId);
        if (planting < current.plantFrom) current.plantFrom = planting;
        if (planting > current.plantTo) current.plantTo = planting;
        if (harvest < current.harvestFrom) current.harvestFrom = harvest;
        if (harvest > current.harvestTo) current.harvestTo = harvest;
      }
    }
    return [...byCrop.values()]
      .map(({ farmIds, ...row }) => ({ ...row, farms: farmIds.size }))
      .sort((a, b) => cropOrder(a.crop) - cropOrder(b.crop) || a.plantFrom.localeCompare(b.plantFrom));
  }, [report.rows]);

  const range = useMemo(() => {
    if (rows.length === 0) return null;
    const start = Math.min(...rows.map((r) => day(r.plantFrom)));
    const end = Math.max(...rows.map((r) => day(r.harvestTo)));
    const months: number[] = [];
    const first = new Date(start);
    for (let ms = Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 1); ms < end; ) {
      months.push(ms);
      const d = new Date(ms);
      ms = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }
    return { start, end, span: Math.max(end - start, MONTH_MS), months };
  }, [rows]);

  // The dates come from the extras query, not the crop list: wait for both, and say so if either fails, before claiming there are none.
  const loading = report.isLoading || !!report.extrasLoading;
  const failed = report.isError || !!report.extrasError;

  const monthName = new Intl.DateTimeFormat(language === "ar" ? "ar-AE-u-nu-latn" : "en-US", { month: "short", timeZone: "UTC" });
  const pos = (iso: string) => (range ? ((day(iso) - range.start) / range.span) * 100 : 0);
  const rangeText = (from: string, to: string) => (from === to ? formatDay(from) : t("rangeTo").replace("{from}", formatDay(from)).replace("{to}", formatDay(to)));

  return (
    <ModuleTabFrame frame={frame} testId="module-yield-calendar">
      {loading ? (
        <Section icon={CalendarRange} title={t("calendarTitle")}>
          <p className="m-0 text-xs text-muted">{t("calendarLoading")}</p>
        </Section>
      ) : failed ? (
        <Section icon={CalendarRange} title={t("calendarTitle")}>
          <p role="alert" className="m-0 text-xs text-red">
            {t("calendarError")}
          </p>
        </Section>
      ) : rows.length === 0 ? (
        <Section icon={CalendarRange} title={t("calendarTitle")}>
          <EmptyNote title={t("calendarEmptyTitle")} testId="calendar-empty">
            {t("calendarEmptyBody")}
          </EmptyNote>
        </Section>
      ) : (
        <>
          <Section icon={CalendarRange} title={t("calendarTitle")} caption={t("calendarCaption")} testId="calendar-chart">
            {range && (
              <div role="img" aria-label={t("calendarChartLabel")} className="text-xs">
                <div className="relative ms-28 h-5 border-b border-line text-muted sm:ms-36">
                  {range.months.map((ms) => (
                    <span key={ms} className="absolute top-0 -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: `${((ms - range.start) / range.span) * 100}%` }}>
                      {monthName.format(new Date(ms))}
                    </span>
                  ))}
                </div>
                {rows.map((r) => {
                  const color = groupInfo(cropGroup(r.crop)).color;
                  return (
                    <div key={r.crop} className="flex items-center border-b border-line last:border-0">
                      <div className="w-28 flex-none truncate py-2 pe-2 sm:w-36">{r.crop}</div>
                      <div className="relative h-5 flex-1">
                        <span
                          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
                          style={{ insetInlineStart: `${pos(r.plantFrom)}%`, width: `${Math.max(pos(r.harvestTo) - pos(r.plantFrom), 1)}%`, background: color, opacity: 0.85 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
          <Section testId="calendar-table-section">
            <DataTable
              rows={rows}
              rowKey={(r) => r.crop}
              isLoading={false}
              isError={false}
              columns={[
                {
                  key: "crop",
                  header: t("colCrops"),
                  render: (r) => (
                    <span className="inline-flex items-center gap-2">
                      <i aria-hidden className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: groupInfo(cropGroup(r.crop)).color }} />
                      {r.crop}
                    </span>
                  ),
                  sortValue: (r) => r.crop,
                },
                { key: "planting", header: t("colPlanting"), render: (r) => rangeText(r.plantFrom, r.plantTo), sortValue: (r) => r.plantFrom },
                { key: "harvest", header: t("colHarvest"), render: (r) => rangeText(r.harvestFrom, r.harvestTo), sortValue: (r) => r.harvestFrom },
                { key: "season", header: t("colSeason"), render: (r) => <span className="text-muted">{r.season ?? "—"}</span>, sortValue: (r) => r.season },
                { key: "farms", header: t("colFarms"), align: "end", render: (r) => formatInteger(r.farms), sortValue: (r) => r.farms },
              ]}
              testId="calendar-table"
            />
          </Section>
        </>
      )}
    </ModuleTabFrame>
  );
}


/** Position of a crop's group in the fixed group order, so the calendar lists groups together. */
function cropOrder(crop: string): number {
  return CROP_GROUPS.findIndex((g) => g.id === cropGroup(crop));
}
