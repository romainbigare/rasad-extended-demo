import { Search, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { Pagination } from "@/components/ui/Pagination";
import { QueryValue } from "@/components/ui/QueryValue";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { selectableCard } from "@/components/ui/selectableCard";
import { useFarmRankings } from "@/lib/analytics/hooks";
import type { FarmRankingRow, FarmRankings, FarmRankingStatus, RankingMetric, RankingOrder } from "@/lib/analytics/types";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { withChiAbbr } from "@/lib/chi/ChiInfo";
import { EM_DASH, formatRate, formatYieldT } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage, type Language } from "@/lib/i18n/LanguageContext";
import { useRegion } from "@/lib/region/RegionContext";
import { useFarmPasses } from "@/lib/satellite/useFarmPasses";
import { IER_SUBSIDY_LINE, displayIer } from "@/lib/scores";
import { useDayDateFormat } from "@/lib/useDayDateFormat";
import { usePagination } from "@/lib/usePagination";

import { STRINGS } from "../data/translations";

type StringKey = keyof typeof STRINGS;
type T = (k: StringKey) => string;
/** Table lists every farm (paged); Cards the best or worst ten; All measures the top five of each measure. */
type Layout = "table" | "cards" | "overview";
type AreaUnit = Pick<ReturnType<typeof useAreaUnit>, "perArea" | "unitLabel">;

const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const pct = (v: number | null) => (v === null ? EM_DASH : `${whole.format(v)}%`);
// CHI is a plain 0-100 score and NDVI is a 0-1 index; neither is a percentage, so
// both stay out of pct(). Each is always shown with its own unit label, because a
// farm can carry one or both.
const chiNumber = (v: number | null | undefined) => (v === null || v === undefined ? EM_DASH : whole.format(v));
const ndviNumber = (v: number | null | undefined) => (v === null || v === undefined ? EM_DASH : v.toFixed(2));
const healthKinds = (r: FarmRankingRow) => ({
  ndvi: (r.has_crops ?? r.mean_ndvi !== null) && r.mean_ndvi !== null,
  chi: (r.has_trees ?? r.health_pct !== null) && r.health_pct !== null,
});
const thousandM3 = (v: number | null) => (v === null ? EM_DASH : `${whole.format(v / 1000)}k m³`);
const tonnes = (v: number | null) => (v === null ? EM_DASH : `${formatYieldT(v)} t`);

/** The health average for the metric control: "NDVI 0.60 · CHI 63", each only when that average exists. */
const healthAverage = (a: FarmRankings["averages"], t: T): ReactNode => {
  const parts: ReactNode[] = [
    a.mean_ndvi === null || a.mean_ndvi === undefined ? null : `${t("rankingUnitNdvi")} ${ndviNumber(a.mean_ndvi)}`,
    a.health_pct === null ? null : <>{withChiAbbr(t("rankingUnitChi"))} {chiNumber(a.health_pct)}</>,
  ].filter((part) => part !== null);
  if (parts.length === 0) return EM_DASH;
  return parts.map((part, index) => (
    <span key={index}>
      {index > 0 && " · "}
      {part}
    </span>
  ));
};

interface DetailContext {
  t: T;
  unit: AreaUnit;
  language: Language;
}

/** The four measures: control label, table heading, the average shown in the control, what a row shows for it, and its summary line. */
const METRICS: ReadonlyArray<{
  metric: RankingMetric;
  labelKey: StringKey;
  columnKey: StringKey;
  average: (a: FarmRankings["averages"], t: T) => ReactNode;
  value: (r: FarmRankingRow) => string;
  /** Bar fill, 0-100. */
  bar: (r: FarmRankingRow) => number;
  barColor: (r: FarmRankingRow) => string;
  /** One muted line under the value in the table, where there is something to add. */
  detail: (r: FarmRankingRow, ctx: DetailContext) => string | null;
  summaryTop: StringKey;
  summaryLow: StringKey;
}> = [
  {
    // Farm-level health ranks on the farm's mean field NDVI, not CHI (CHI is trees only).
    metric: "health",
    labelKey: "rankingAvgHealthLabel",
    columnKey: "rankingPanelHealth",
    average: healthAverage,
    value: (r) => (healthKinds(r).ndvi ? ndviNumber(r.mean_ndvi) : chiNumber(r.health_pct)),
    bar: (r) => (healthKinds(r).ndvi ? (r.mean_ndvi ?? 0) * 100 : r.health_pct ?? 0),
    barColor: () => "#13303a",
    detail: () => null,
    summaryTop: "rankingSummaryHealthTop",
    summaryLow: "rankingSummaryHealthLow",
  },
  {
    metric: "yield",
    labelKey: "rankingAvgYieldLabel",
    columnKey: "rankingPanelYield",
    average: (a) => (a.yield_t === null ? EM_DASH : `${whole.format(a.yield_t)} t`),
    value: (r) => tonnes(r.yield_t),
    bar: (r) => Math.min(100, ((r.yield_t_per_du ?? 0) / 5) * 100),
    barColor: () => "#13303a",
    detail: (r, { t, unit }) =>
      r.yield_t_per_du === null ? null : `${t("rankingTonnesPerArea").replace("{unit}", unit.unitLabel)} ${formatRate(unit.perArea(r.yield_t_per_du))}`,
    summaryTop: "rankingSummaryYieldTop",
    summaryLow: "rankingSummaryYieldLow",
  },
  {
    metric: "ier",
    labelKey: "rankingAvgIerLabel",
    columnKey: "rankingPanelIer",
    average: (a) => pct(a.ier),
    // Rounded once to the whole number printed; the band and the colour are read from that same number (lib/scores.ts).
    value: (r) => pct(displayIer(r.ier, 0)?.value ?? null),
    bar: (r) => displayIer(r.ier, 0)?.value ?? 0,
    // The IER bar takes its colour from the shared scale (lib/scores.ts); grey without a score.
    barColor: (r) => displayIer(r.ier, 0)?.info.color ?? "#e9eeec",
    detail: (r, { language }) => displayIer(r.ier, 0)?.info[language] ?? null,
    summaryTop: "rankingSummaryIerTop",
    summaryLow: "rankingSummaryIerLow",
  },
  {
    metric: "water",
    labelKey: "rankingAvgWaterLabel",
    columnKey: "rankingPanelWater",
    average: (a) => thousandM3(a.water_m3_month),
    value: (r) => thousandM3(r.water_m3_month),
    bar: (r) => Math.min(100, r.water_pct_of_quota ?? 0),
    barColor: (r) => ((r.water_pct_of_quota ?? 0) > 100 ? "#c0392b" : "#13303a"),
    detail: (r, { t }) => (r.water_pct_of_quota === null ? null : t("rankingOfQuota").replace("{pct}", whole.format(r.water_pct_of_quota))),
    summaryTop: "rankingSummaryWaterTop",
    summaryLow: "rankingSummaryWaterLow",
  },
];

const STATUS: Record<FarmRankingStatus, { labelKey: StringKey; tone: BadgeTone }> = {
  optimal: { labelKey: "rankingStatusOptimal", tone: "green" },
  watch: { labelKey: "rankingStatusWatch", tone: "orange" },
  attention: { labelKey: "rankingStatusAttention", tone: "red" },
};

const RANKING_FETCH_LIMIT = 500;
const TABLE_PAGE_SIZE = 15;
/** Cards show only the best (or worst) 10 - no paging. */
const CARD_LIMIT = 10;
/** Each All-measures panel lists its top 5. */
const GRID_PANEL_LIMIT = 5;

const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const formatDate = (iso: string | null) => (iso ? shortDate.format(new Date(iso)) : EM_DASH);
const daysUntil = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000));

const TH = "whitespace-nowrap border-b border-line px-3 py-2 text-start text-xs font-medium text-muted";
const TD = "px-3 py-2 align-middle";

const farmMonitoringHref = (row: FarmRankingRow) => `/farm-monitoring?farm=${row.farm_id}`;

function useRankingPasses(row: FarmRankingRow) {
  const t = useT(STRINGS);
  const { latestPass, nextOverpass } = useFarmPasses(row.farm_id);
  const nextDate = nextOverpass?.next_estimated_date ?? row.next_pass_date;
  return {
    latest: formatDate(latestPass?.datetime ?? row.latest_pass_date),
    next: nextDate
      ? t("rankingInDaysTemplate").replace("{days}", String(daysUntil(nextDate))).replace("{date}", formatDate(nextDate))
      : EM_DASH,
  };
}

function LatestPassText({ row }: { row: FarmRankingRow }) {
  return <>{useRankingPasses(row).latest}</>;
}

function NextPassText({ row }: { row: FarmRankingRow }) {
  return <>{useRankingPasses(row).next}</>;
}

/** "FRM-12720 · Abu Dhabi Region", muted. */
function FarmSubline({ row }: { row: FarmRankingRow }) {
  const t = useT(STRINGS);
  return (
    <span className="break-words text-xs text-muted">
      {row.farm_uid}
      {row.zone_name && ` · ${t("farmRegionTemplate").replace("{region}", row.zone_name)}`}
    </span>
  );
}

/** A thin bar filled to 0-100. */
function ThinBar({ value, color, className }: { value: number; color: string; className?: string }) {
  return (
    <div className={cx("h-1.5 overflow-hidden rounded-full bg-[#e9eeec]", className)}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

/** The quiet text link to a farm's page. */
function OpenLink({ row, short, className }: { row: FarmRankingRow; short?: boolean; className?: string }) {
  const t = useT(STRINGS);
  return (
    <Link
      href={farmMonitoringHref(row)}
      title={t("rankingInspectButton")}
      className={cx("inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-green-d hover:underline touch:min-h-[44px]", className)}
    >
      {t(short ? "rankingOpenShort" : "rankingInspectButton")}
      <span aria-hidden className="inline-block rtl:-scale-x-100">›</span>
    </Link>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

/** One metric cell of the table: value, a thin bar and one muted line. Health is two possible indexes, so its number is never bare. */
function MetricCell({ m, row }: { m: (typeof METRICS)[number]; row: FarmRankingRow }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const unit = useAreaUnit();
  const label = m.metric !== "health" ? null : healthKinds(row).ndvi ? t("rankingUnitNdvi") : t("rankingUnitChi");
  const detail = m.detail(row, { t, unit, language });
  return (
    <div className="min-w-[120px]">
      <div className="flex items-baseline gap-1.5">
        {label && <span className="text-xs text-muted">{withChiAbbr(label)}</span>}
        <b className="text-sm font-bold">{m.value(row)}</b>
      </div>
      <ThinBar value={m.bar(row)} color={m.barColor(row)} className="mt-1" />
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </div>
  );
}

function RankingTable({ rows, metric }: { rows: FarmRankingRow[]; metric: RankingMetric }) {
  const t = useT(STRINGS);
  const m = METRICS.find((x) => x.metric === metric) ?? METRICS[0];

  /* The table at every width: narrower than its content it scrolls sideways inside the card. `relative`
   * keeps an absolutely-positioned sr-only span inside this scroller. */
  return (
    <div className="relative overflow-x-auto" data-testid="ranking-table">
      <table className="w-full min-w-[880px] border-collapse text-xs">
        <thead>
          <tr>
            <th scope="col" className={TH}>{t("rankingColRank")}</th>
            <th scope="col" className={TH}>{t("rankingColFarm")}</th>
            <th scope="col" className={TH}>{t("rankingColStatus")}</th>
            <th scope="col" className={TH}>{t(m.columnKey)}</th>
            <th scope="col" className={TH}>{t("rankingColCrops")}</th>
            <th scope="col" className={TH}>{t("rankingLatestPass")}</th>
            <th scope="col" className={TH}>{t("rankingNextAcquisition")}</th>
            <th scope="col" className={TH}>
              <span className="sr-only">{t("rankingInspectButton")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = STATUS[row.status];
            return (
              <tr key={row.farm_id} className="border-b border-line last:border-0 hover:bg-[#fafbfb]" data-testid="ranking-row">
                <td className={cx(TD, "tabular-nums text-muted")}>#{row.rank}</td>
                <td className={cx(TD, "min-w-[200px]")}>
                  <b className="block leading-snug">{row.farm_name ?? row.farm_uid}</b>
                  <FarmSubline row={row} />
                </td>
                <td className={TD}>
                  <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
                </td>
                <td className={TD}>
                  <MetricCell m={m} row={row} />
                </td>
                <td className={cx(TD, "text-muted")}>{row.crops ?? EM_DASH}</td>
                <td className={cx(TD, "whitespace-nowrap")}><LatestPassText row={row} /></td>
                <td className={cx(TD, "whitespace-nowrap")}><NextPassText row={row} /></td>
                <td className={cx(TD, "text-end")}>
                  <OpenLink row={row} short />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PaginatedRankingTable({ rows, metric, resetKey }: { rows: FarmRankingRow[]; metric: RankingMetric; resetKey: string }) {
  const pager = usePagination(rows, { pageSize: TABLE_PAGE_SIZE, resetKey });
  return (
    <>
      <RankingTable rows={pager.pageRows} metric={metric} />
      <Pagination page={pager.page} pageCount={pager.pageCount} total={pager.total} from={pager.from} to={pager.to} onPage={pager.setPage} />
    </>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

/** A muted label with its value on the right: a key-value line. */
function Kv({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-end">{children}</dd>
    </div>
  );
}

/** The card's headline figure: a muted label, the value, then a thin bar under both. */
function CardMetric({ label, value, aside, bar, title }: { label: ReactNode; value: string; aside?: ReactNode; bar: ReactNode; title?: string }) {
  return (
    <div title={title}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-end">
          <b className="text-base font-bold tabular-nums">{value}</b>
          {aside && <span className="ms-1.5 text-xs text-muted">{aside}</span>}
        </span>
      </div>
      <div className="mt-1.5">{bar}</div>
    </div>
  );
}

/**
 * Health: NDVI for the whole farm wherever it grows crops, CHI for its palms wherever it has trees, and both
 * on a farm that has both. The two are different indexes on different parts of the farm, so neither is
 * folded into the other.
 */
function HealthBlock({ row }: { row: FarmRankingRow }) {
  const t = useT(STRINGS);
  const day = useDayDateFormat();
  const kinds = healthKinds(row);
  // Neither flag set and no value either (a farm with no reading yet): still show the
  // NDVI line, empty, so the card keeps its shape instead of collapsing.
  const showNdvi = kinds.ndvi || !kinds.chi;
  const note: StringKey | null =
    row.has_trees === false
      ? "rankingNoteNoPalms"
      : row.has_trees && row.health_pct === null
        ? "rankingNoteNoChiYet"
        : row.has_crops === false && kinds.chi
          ? "rankingNotePalmsOnly"
          : null;
  return (
    <div className="flex flex-col gap-3" data-testid="ranking-health-box">
      {showNdvi && (
        <CardMetric
          label={t("rankingPanelHealthNdvi")}
          value={ndviNumber(row.mean_ndvi)}
          bar={<ThinBar value={(row.mean_ndvi ?? 0) * 100} color="#13303a" />}
          title={row.ndvi_as_of ? day(row.ndvi_as_of) : undefined}
        />
      )}
      {kinds.chi && (
        <CardMetric
          label={t("rankingPanelHealthChi")}
          value={chiNumber(row.health_pct)}
          bar={<ThinBar value={row.health_pct ?? 0} color="#13303a" />}
          title={row.health_as_of ? day(row.health_as_of) : undefined}
        />
      )}
      {note && (
        <p className="m-0 text-xs leading-snug text-muted" data-testid="ranking-health-note">
          {withChiAbbr(t(note))}
        </p>
      )}
    </div>
  );
}

function YieldBlock({ row, m }: { row: FarmRankingRow; m: (typeof METRICS)[number] }) {
  const t = useT(STRINGS);
  const { area: inUnit, perArea, unitLabel } = useAreaUnit();
  const split = row.yield_breakdown ?? null;
  const area = row.yield_t !== null && row.yield_t_per_du ? row.yield_t / row.yield_t_per_du : null;
  const parts = [
    { key: "crop_t", labelKey: "rankingYieldCrop" },
    { key: "date_palm_t", labelKey: "rankingYieldDate" },
    { key: "fruit_t", labelKey: "rankingYieldFruit" },
  ] as const;
  return (
    <div className="flex flex-col gap-3">
      <CardMetric
        label={t("rankingYieldTotal")}
        value={tonnes(row.yield_t)}
        bar={<ThinBar value={m.bar(row)} color={m.barColor(row)} />}
      />
      <dl className="m-0 text-xs">
        {split &&
          parts.map((p) => (
            <Kv key={p.key} label={t(p.labelKey)}>
              {split[p.key] === null ? EM_DASH : tonnes(split[p.key])}
            </Kv>
          ))}
        <Kv label={t("rankingProductivity")}>
          {row.yield_t_per_du === null ? EM_DASH : `${formatRate(perArea(row.yield_t_per_du))} t/${unitLabel}`}
        </Kv>
        <Kv label={t("rankingAreaLabel")}>{area === null ? EM_DASH : `${whole.format(inUnit({ du: area }) ?? 0)} ${unitLabel}`}</Kv>
      </dl>
    </div>
  );
}

function IerBlock({ row, m }: { row: FarmRankingRow; m: (typeof METRICS)[number] }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const shown = displayIer(row.ier, 0);
  const band = shown?.info;
  return (
    <div className="flex flex-col gap-3">
      <CardMetric
        label={t("rankingPanelIer")}
        value={pct(shown?.value ?? null)}
        aside={band ? band[language] : undefined}
        bar={
          // The tick marks the subsidy line on the 0-100 bar.
          <div className="relative">
            <ThinBar value={m.bar(row)} color={m.barColor(row)} />
            <span
              aria-hidden
              title={t("rankingSubsidyLine").replace("{line}", String(IER_SUBSIDY_LINE))}
              className="absolute -inset-y-0.5 w-px bg-ink/40"
              style={{ insetInlineStart: `${IER_SUBSIDY_LINE}%` }}
            />
          </div>
        }
      />
      <dl className="m-0 text-xs">
        <Kv label={t("rankingDeliveryLabel")}>{row.irrigation_method ?? EM_DASH}</Kv>
        <Kv label={t("rankingFieldsLabel")}>{row.field_count == null ? EM_DASH : whole.format(row.field_count)}</Kv>
      </dl>
    </div>
  );
}

function WaterBlock({ row, m }: { row: FarmRankingRow; m: (typeof METRICS)[number] }) {
  const t = useT(STRINGS);
  const [liters, setLiters] = useState(false);
  const monthly = row.water_m3_month;
  const scale = liters ? 1000 : 1;
  const unit = liters ? "L" : "m³";
  const shown = (v: number | null) => (v === null ? EM_DASH : `${whole.format(v * scale)} ${unit}`);
  const pctQuota = row.water_pct_of_quota;
  const status =
    pctQuota === null ? null : pctQuota <= 85 ? "rankingWaterOptimized" : pctQuota <= 100 ? "rankingWaterWithin" : "rankingWaterOver";
  return (
    <div className="flex flex-col gap-3">
      <CardMetric
        label={t("rankingWaterMonthly")}
        value={shown(monthly)}
        aside={status ? t(status) : undefined}
        bar={<ThinBar value={m.bar(row)} color={m.barColor(row)} />}
      />
      <dl className="m-0 text-xs">
        <Kv label={t("rankingWaterDaily")}>{shown(monthly === null ? null : monthly / 30)}</Kv>
        <Kv label={t("rankingWaterWeekly")}>{shown(monthly === null ? null : (monthly * 7) / 30)}</Kv>
        <Kv label={t("rankingWaterQuotaLabel")}>{pctQuota === null ? EM_DASH : `${whole.format(pctQuota)}%`}</Kv>
      </dl>
      {/* Monthly is what the API gives; daily / weekly are derived from it (30-day month). */}
      <div role="group" aria-label={t("rankingWaterUnitLabel")} className="flex gap-3 text-xs">
        {(["m³", "L"] as const).map((u) => {
          const on = (u === "L") === liters;
          return (
            <button
              key={u}
              type="button"
              aria-pressed={on}
              onClick={() => setLiters(u === "L")}
              className={cx("font-semibold touch:min-h-[36px]", on ? "text-ink" : "text-muted hover:text-ink")}
            >
              {u === "L" ? t("rankingLiters") : u}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** A neutral fact for a farm below the IER subsidy line, from its `ier` and the shared scale alone
 * (no advice on what to do). The card's IER figure already shows the score and band. */
function useIerFinding(row: FarmRankingRow): string | null {
  const t = useT(STRINGS);
  if (displayIer(row.ier, 0)?.aboveLine !== false) return null;
  return t("rankingFindingBelowLine").replace("{line}", String(IER_SUBSIDY_LINE));
}

function RankingCard({ row, m }: { row: FarmRankingRow; m: (typeof METRICS)[number] }) {
  const t = useT(STRINGS);
  const status = STATUS[row.status];
  const passes = useRankingPasses(row);
  const finding = useIerFinding(row);
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4 text-xs" data-testid="ranking-card">
      <div className="flex items-start gap-3">
        <span className="flex-none pt-0.5 tabular-nums text-muted">#{row.rank}</span>
        <div className="min-w-0 flex-1">
          <b className="block break-words text-sm leading-snug">{row.farm_name ?? row.farm_uid}</b>
          <FarmSubline row={row} />
        </div>
        <Badge tone={status.tone} className="flex-none">
          {t(status.labelKey)}
        </Badge>
      </div>

      {m.metric === "yield" ? (
        <YieldBlock row={row} m={m} />
      ) : m.metric === "water" ? (
        <WaterBlock row={row} m={m} />
      ) : m.metric === "ier" ? (
        <IerBlock row={row} m={m} />
      ) : (
        <HealthBlock row={row} />
      )}

      <dl className="m-0 border-t border-line pt-2">
        <Kv label={t("rankingColCrops")}>{row.crops ?? EM_DASH}</Kv>
        <Kv label={t("rankingLatestPass")}>{passes.latest}</Kv>
        <Kv label={t("rankingNextAcquisition")}>{passes.next}</Kv>
      </dl>

      {m.metric === "ier" && finding && (
        <p className="m-0 leading-snug text-muted" data-testid="ranking-finding">
          {finding}
        </p>
      )}

      <OpenLink row={row} className="mt-auto" />
    </article>
  );
}

// ─── All measures: one panel per metric ───────────────────────────────────────

const GRID_PANEL: Record<RankingMetric, { titleKey: StringKey; topSubKey: StringKey; lowSubKey: StringKey; rosterKey: StringKey }> = {
  health: { titleKey: "rankingGridHealthTitle", topSubKey: "rankingGridHealthTop", lowSubKey: "rankingGridHealthLow", rosterKey: "rankingRosterHealth" },
  yield: { titleKey: "rankingGridYieldTitle", topSubKey: "rankingGridYieldTop", lowSubKey: "rankingGridYieldLow", rosterKey: "rankingRosterYield" },
  ier: { titleKey: "rankingGridIerTitle", topSubKey: "rankingGridIerTop", lowSubKey: "rankingGridIerLow", rosterKey: "rankingRosterIer" },
  water: { titleKey: "rankingGridWaterTitle", topSubKey: "rankingGridWaterTop", lowSubKey: "rankingGridWaterLow", rosterKey: "rankingRosterWater" },
};

function GridRow({ row, metric, liters }: { row: FarmRankingRow; metric: RankingMetric; liters: boolean }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const { area: inUnit, perArea, unitLabel } = useAreaUnit();
  const region = row.zone_name ? t("farmRegionTemplate").replace("{region}", row.zone_name) : null;
  const scale = liters ? 1000 : 1;
  const unit = liters ? "L" : "m³";
  const monthly = row.water_m3_month;
  let sub: string | null = region;
  let value: string = EM_DASH;
  let detail: string | null = null;
  if (metric === "health") {
    sub = [region, row.crops].filter(Boolean).join(" · ");
    const kinds = healthKinds(row);
    value = kinds.ndvi ? `${t("rankingUnitNdvi")} ${ndviNumber(row.mean_ndvi)}` : `${t("rankingUnitChi")} ${chiNumber(row.health_pct)}`;
    detail = kinds.ndvi && kinds.chi ? `${t("rankingUnitChi")} ${chiNumber(row.health_pct)}` : null;
  } else if (metric === "yield") {
    // The farm's area isn't in the ranking row - it's yield / yield-per-dunum.
    const area = row.yield_t !== null && row.yield_t_per_du ? row.yield_t / row.yield_t_per_du : null;
    sub = [region, area === null ? null : `${whole.format(inUnit({ du: area }) ?? 0)} ${unitLabel}`].filter(Boolean).join(" · ");
    value = tonnes(row.yield_t);
    detail = row.yield_t_per_du === null ? null : `${formatRate(perArea(row.yield_t_per_du))} t/${unitLabel}`;
  } else if (metric === "ier") {
    const shown = displayIer(row.ier, 0);
    sub = [region, shown && shown.info[language]].filter(Boolean).join(" · ");
    value = pct(shown?.value ?? null);
  } else {
    // Monthly is what the API gives; daily / weekly are derived from it (30-day month).
    sub = monthly === null ? region : `${t("rankingDaily")} ${whole.format((monthly / 30) * scale)} ${unit}/d`;
    value = monthly === null ? EM_DASH : `${whole.format(monthly * scale)} ${unit}/mo`;
    detail = monthly === null ? null : `${t("rankingWeekly")} ${whole.format(((monthly * 7) / 30) * scale)} ${unit}`;
  }
  return (
    <Link href={farmMonitoringHref(row)} className={cx("flex items-center gap-3 rounded-lg border px-3 py-2 transition", selectableCard(false))}>
      <span className="w-7 flex-none text-xs tabular-nums text-muted">#{row.rank}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-xs">{row.farm_name ?? row.farm_uid}</b>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
      <span className="flex-none text-end">
        <b className="block text-xs font-bold">{withChiAbbr(value)}</b>
        {detail && <span className="block text-xs text-muted">{withChiAbbr(detail)}</span>}
      </span>
    </Link>
  );
}

function GridPanel({
  m,
  order,
  search,
  onViewRoster,
}: {
  m: (typeof METRICS)[number];
  order: RankingOrder;
  search: string;
  onViewRoster: () => void;
}) {
  const t = useT(STRINGS);
  const cfg = GRID_PANEL[m.metric];
  const [liters, setLiters] = useState(false);
  const rankings = useFarmRankings(m.metric, order, search, GRID_PANEL_LIMIT);
  return (
    <section className="flex flex-col rounded-xl border border-line bg-panel p-4" data-testid={`ranking-panel-${m.metric}`}>
      <CardHeader
        title={t(cfg.titleKey)}
        subtitle={t(order === "top" ? cfg.topSubKey : cfg.lowSubKey)}
        actions={
          m.metric === "water" ? (
            <div role="group" aria-label={t("rankingWaterUnitLabel")} className="flex gap-3 text-xs">
              {(["m³", "L"] as const).map((u) => {
                const on = (u === "L") === liters;
                return (
                  <button
                    key={u}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setLiters(u === "L")}
                    className={cx("font-semibold touch:min-h-[36px]", on ? "text-ink" : "text-muted hover:text-ink")}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          ) : undefined
        }
      />
      <QueryValue
        query={rankings}
        render={(d) =>
          d.rows.length === 0 ? (
            <p className="m-0 py-4 text-center text-xs text-muted">{t("rankingNoFarms")}</p>
          ) : (
            <div className={cx("flex flex-col gap-2 transition-opacity", rankings.isFetching && "opacity-60")}>
              {d.rows.slice(0, GRID_PANEL_LIMIT).map((row) => (
                <GridRow key={row.farm_id} row={row} metric={m.metric} liters={liters} />
              ))}
            </div>
          )
        }
      />
      <button
        type="button"
        onClick={onViewRoster}
        className="mt-3 border-t border-line pt-3 text-center text-xs font-semibold text-green-d hover:underline"
      >
        {t(cfg.rosterKey)} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
      </button>
    </section>
  );
}

// ─── The section ──────────────────────────────────────────────────────────────

export function FarmRankingSection() {
  // Read only to send the table back to page 1 on a region change; the region is picked in the top bar.
  const { zoneId } = useRegion();
  const t = useT(STRINGS);
  const [layout, setLayout] = useState<Layout>("table");
  const [metric, setMetric] = useState<RankingMetric>("health");
  const [order, setOrder] = useState<RankingOrder>("top");
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");

  // Debounce typing so every keystroke doesn't refetch.
  useEffect(() => {
    const id = setTimeout(() => setSearch(text), 300);
    return () => clearTimeout(id);
  }, [text]);

  // Cards only ever show ten, so they ask for just those; the table pages through the full list. (All measures
  // fetches its own five per panel; this query then only supplies the averages in the control.)
  const rankings = useFarmRankings(metric, order, search, layout === "table" ? RANKING_FETCH_LIMIT : CARD_LIMIT);
  const active = METRICS.find((m) => m.metric === metric) ?? METRICS[0];

  const summary = (count: number | null) =>
    layout === "overview"
      ? t(order === "top" ? "rankingSummaryOverviewTop" : "rankingSummaryOverviewLow")
      : t("rankingSummaryTemplate")
          .replace("{line}", t(order === "top" ? active.summaryTop : active.summaryLow))
          .replace("{count}", count === null ? EM_DASH : whole.format(count));

  return (
    <Card testId="farm-ranking">
      <CardHeader title={t("rankingCardTitle")} icon={Trophy} subtitle={t("rankingCardSubtitle")} />

      {/* One toolbar row: measure (with its average), order, then search and the view. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-2" data-testid="ranking-toolbar">
        {layout !== "overview" && (
          <SegmentedControl<RankingMetric>
            label={t("rankingMetricLabel")}
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({
              value: m.metric,
              label: t(m.labelKey),
              hint: <QueryValue query={rankings} inline quiet fallback={EM_DASH} render={(d) => m.average(d.averages, t)} />,
            }))}
          />
        )}
        <SegmentedControl<RankingOrder>
          label={t("rankingOrderLabel")}
          value={order}
          onChange={setOrder}
          options={[
            { value: "top", label: t("rankingOrderTopShort") },
            { value: "bottom", label: t("rankingOrderBottomShort") },
          ]}
        />
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <label className="relative block w-full sm:w-36">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
              <Search width={14} height={14} strokeWidth={1.8} aria-hidden />
            </span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("rankingSearchPlaceholderPlain")}
              aria-label={t("rankingSearchPlaceholderPlain")}
              className={cx(FIELD_CLASS, "w-full ps-9")}
            />
          </label>
          <SegmentedControl<Layout>
            label={t("rankingLayoutLabel")}
            value={layout}
            onChange={setLayout}
            options={[
              { value: "table", label: t("rankingLayoutTable") },
              { value: "cards", label: t("rankingLayoutCards") },
              { value: "overview", label: t("rankingLayoutOverview") },
            ]}
          />
        </div>
      </div>

      {layout === "overview" ? (
        <>
          <p className="m-0 mb-3 text-xs text-muted">{summary(null)}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {METRICS.map((m) => (
              <GridPanel
                key={m.metric}
                m={m}
                order={order}
                search={search}
                onViewRoster={() => {
                  setMetric(m.metric);
                  setLayout("table");
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <QueryValue
          query={rankings}
          render={(d) => {
            const shown = layout === "cards" ? d.rows.slice(0, CARD_LIMIT) : d.rows;
            return (
              <>
                <p className="m-0 mb-3 text-xs text-muted">{summary(shown.length)}</p>
                {d.rows.length === 0 ? (
                  <p className="m-0 py-4 text-center text-xs text-muted">{t("rankingNoFarms")}</p>
                ) : layout === "cards" ? (
                  <div className={cx("grid gap-4 transition-opacity md:grid-cols-2 xl:grid-cols-3", rankings.isFetching && "opacity-60")}>
                    {shown.map((row) => (
                      <RankingCard key={row.farm_id} row={row} m={active} />
                    ))}
                  </div>
                ) : (
                  <div className={cx("transition-opacity", rankings.isFetching && "opacity-60")}>
                    <PaginatedRankingTable rows={d.rows} metric={metric} resetKey={`${metric}|${order}|${search}|${zoneId}`} />
                  </div>
                )}
              </>
            );
          }}
        />
      )}
    </Card>
  );
}
