import { Activity, Droplets, type LucideIcon, TrendingUp, Waves } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { QueryValue } from "@/components/ui/QueryValue";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { useFarmWaterDemand, useFarmYieldFields } from "@/lib/analytics/hooks";
import type { FarmWaterDemand } from "@/lib/analytics/types";
import { useChiText, withChiAbbr } from "@/lib/chi/ChiInfo";
import { useFarmMonitoring } from "@/lib/farm/useFarmMonitoring";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EM_DASH, formatInteger, formatYieldT } from "@/lib/format";
import { IER_SUBSIDY_LINE, displayIer } from "@/lib/scores";
import { useDayDateFormat } from "@/lib/useDayDateFormat";

import { CHI_STATUS_LABEL_KEY, STRINGS } from "../data/translations";
import { useFarmIer, useTreeHealthScore } from "../hooks/useMonitoringApi";

const pct = (value: number) => String(Math.round(value));
const m3 = (value: number) => formatInteger(value);
function KpiCard({ title, icon, testId, aside, children }: { title: string; icon: LucideIcon; testId: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col p-4" testId={testId}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="m-0 flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.04em] text-muted">
          <TitleIcon icon={icon} />
          <span className="truncate">{title}</span>
        </h3>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function Bar({ value, color, marker }: { value: number; color: string; marker?: { at: number; title: string } }) {
  return (
    <div aria-hidden className="relative mt-3 h-2 overflow-hidden rounded-full bg-[#e9eeec]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
      {/* A tick on the bar, e.g. the IER subsidy line. */}
      {marker && <span title={marker.title} className="absolute inset-y-0 w-px bg-ink/50" style={{ insetInlineStart: `${marker.at}%` }} />}
    </div>
  );
}

function StatBox({ label, value, unit, labelClass }: { label: ReactNode; value: string; unit?: string; labelClass?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-[#fafbfb] px-2 py-1.5">
      <div className={cx("truncate whitespace-nowrap text-[11px] font-bold", labelClass)}>{label}</div>
      <b className="block truncate whitespace-nowrap text-xs">{value}</b>
      {unit && <div className="whitespace-nowrap text-[10px] text-muted">{unit}</div>}
    </div>
  );
}

const YIELD_TILES = [
  { key: "crop", emoji: "🌽", labelKey: "kpiYieldCrop", tone: "text-[#b86b00]", bar: "#f5a623" },
  { key: "date_palm", emoji: "🌴", labelKey: "kpiYieldDates", tone: "text-green-d", bar: "#1e7e3e" },
  { key: "fruit", emoji: "🍊", labelKey: "kpiYieldFruits", tone: "text-[#4d7c0f]", bar: "#84cc16" },
] as const;

/** The selected farm's four headline cards. */
export function MonitoringKpiGrid({
  farmId,
  farmUid,
  liters,
  onLitersChange,
}: {
  farmId: number | null;
  farmUid: string | null;
  /** The water cards' unit (litres instead of m3), kept by the page so the details card below follows it. */
  liters: boolean;
  onLitersChange: (liters: boolean) => void;
}) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const chi = useChiText();
  const day = useDayDateFormat();
  const health = useTreeHealthScore(farmId);
  const monitoring = useFarmMonitoring(farmId);
  const hasNoTrees = monitoring.data?.farm.tree_count === 0;
  const hasCrops = (monitoring.data?.fields ?? []).some((f) => f.crop_types.length > 0 || f.tree_count === 0);
  const farmNdvi = monitoring.data?.farm.mean_ndvi ?? null;
  const farmNdviAsOf = monitoring.data?.farm.ndvi_as_of ?? null;
  const yieldFields = useFarmYieldFields(farmId);
  const ier = useFarmIer(farmId);
  // The IER band and its colour come from the shared scale (lib/scores.ts), not from the API's four-class `class`.
  // Rounded once to the one decimal the card prints; the band is read from that same number.
  const ierShown = displayIer(ier.data?.ier_pct, 0);
  const ierBand = ierShown?.info ?? null;
  const water = useFarmWaterDemand(farmUid);
  const scale = liters ? 1000 : 1;
  const unit = liters ? "L" : "m³";
  const waterFigure = (render: (d: FarmWaterDemand) => string) => (water.data ? render(water.data) : water.isLoading ? "…" : EM_DASH);
  /** A figure from a query: "…" while loading, "—" when there's no data. */
  const figure = <T,>(q: { data?: T; isLoading: boolean }, render: (d: T) => string) => (q.data ? render(q.data) : q.isLoading ? "…" : EM_DASH);
  const yieldTotals = (() => {
    const fields = yieldFields.data?.fields ?? [];
    const sum = (category: string) => fields.filter((r) => r.category === category).reduce((acc, r) => acc + r.yield_t, 0);
    const crop = sum("crop");
    const date_palm = sum("date_palm");
    const fruit = sum("fruit");
    return { crop, date_palm, fruit, total: crop + date_palm + fruit };
  })();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="mon-kpis">
      {/* Health, Yield and IER always show their full layout: "…" while loading, "—" without data, grey bars. */}
      <KpiCard title={t("kpiHealthLabel")} icon={Activity} testId="mon-kpi-health">
        {/* CHI scores the farm's palms; NDVI covers the whole farm, crops included. A farm
         * shows whichever it has, each as its own labelled row with its own bar, so no bar
         * is left to guess which index it draws. */}
        <div className="flex flex-col gap-3">
          {!hasNoTrees && (
            <div data-testid="mon-kpi-health-chi">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.04em] text-muted">{withChiAbbr(t("kpiChiTag"))}</span>
                <span className="whitespace-nowrap text-2xl font-extrabold leading-none">
                  {figure(health, (d) => (d.health_pct === null ? EM_DASH : pct(d.health_pct)))}
                </span>
                {health.data?.health_pct !== null && health.data?.status_label && CHI_STATUS_LABEL_KEY[health.data.status_label] && (
                  <b className="whitespace-nowrap text-xs text-green">({t(CHI_STATUS_LABEL_KEY[health.data.status_label])})</b>
                )}
                {health.data?.median_pct != null && (
                  <span className="whitespace-nowrap text-xs text-muted">{chi.median(pct(health.data.median_pct))}</span>
                )}
              </div>
              <Bar value={health.data?.health_pct ?? 0} color="#4FB840" />
              {/* No score means too few palms had a clear reading: the shares of those few would
               * read as a result ("Healthy 100%") when the farm has none. */}
              {health.data?.shares && health.data.health_pct !== null && (
                <p className="m-0 mt-1 text-[11px] text-muted" data-testid="mon-kpi-health-split">
                  {t("kpiStatusSplit")
                    .replace("{healthy}", String(Math.round(health.data.shares.healthy)))
                    .replace("{monitor}", String(Math.round(health.data.shares.monitor)))
                    .replace("{at_risk}", String(Math.round(health.data.shares.at_risk)))}
                </p>
              )}
            </div>
          )}
          {hasCrops && (
            <div data-testid="mon-kpi-health-ndvi">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.04em] text-muted">{t("kpiNdviTag")}</span>
                <span className="whitespace-nowrap text-2xl font-extrabold leading-none">
                  {monitoring.isLoading ? "…" : farmNdvi === null ? EM_DASH : farmNdvi.toFixed(2)}
                </span>
              </div>
              <Bar value={(farmNdvi ?? 0) * 100} color="#4FB840" />
            </div>
          )}
        </div>
        <div className="mt-3 space-y-0.5 text-[11px] text-muted">
          {!hasNoTrees && health.data && health.data.health_pct === null && (
            <p className="m-0" data-testid="mon-kpi-health-reason">
              {health.data.trees_total === null
                ? withChiAbbr(t("kpiHealthNoScore"))
                : chi.noScoreReason(health.data.trees_scored ?? 0, health.data.trees_total)}
            </p>
          )}
          {!hasNoTrees && health.data?.headline_available && health.data.trees_scored !== null && health.data.trees_total !== null && (
            <p className="m-0">{chi.coverage(health.data.trees_scored, health.data.trees_total)}</p>
          )}
          {!hasNoTrees && health.data?.as_of && (
            <p className="m-0" title={chi.resolutionNote}>
              {chi.satelliteDate(health.data.as_of)}
            </p>
          )}
          {hasCrops && farmNdviAsOf && (hasNoTrees || farmNdviAsOf !== health.data?.as_of) && (
            <p className="m-0">
              {/* Only named when a CHI date is on the card too, so the two are told apart. */}
              {hasNoTrees ? "" : `${t("kpiNdviTag")} · `}
              {chi.satelliteDate(farmNdviAsOf)}
            </p>
          )}
        </div>
      </KpiCard>

      <KpiCard title={t("kpiYieldLabel")} icon={TrendingUp} testId="mon-kpi-yield">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="whitespace-nowrap text-2xl font-extrabold leading-none">{figure(yieldFields, () => formatYieldT(yieldTotals.total))}</span>
          <span className="whitespace-nowrap text-xs text-muted">{t("kpiTotalTonnes")}</span>
        </div>
        {/* Split bar - an empty grey track without yield. */}
        <div aria-hidden className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#e9eeec]">
          {yieldTotals.total > 0 &&
            YIELD_TILES.map((tile) => (
              <div key={tile.key} style={{ width: `${(yieldTotals[tile.key] / yieldTotals.total) * 100}%`, background: tile.bar }} />
            ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {YIELD_TILES.map((tile) => (
            <StatBox
              key={tile.key}
              labelClass={tile.tone}
              label={
                <>
                  <span aria-hidden>{tile.emoji}</span> {t(tile.labelKey)}
                </>
              }
              value={figure(yieldFields, () => `${formatYieldT(yieldTotals[tile.key])} T`)}
            />
          ))}
        </div>
      </KpiCard>

      <KpiCard title={t("kpiIerLabel")} icon={Droplets} testId="mon-kpi-ier">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="whitespace-nowrap text-2xl font-extrabold leading-none">
            {figure(ier, () => (ierShown === null ? EM_DASH : `${pct(ierShown.value)}%`))}
          </span>
          {ierBand && <b className="whitespace-nowrap text-xs" style={{ color: ierBand.text }}>({ierBand[language]})</b>}
        </div>
        <Bar
          value={ierShown?.value ?? 0}
          color={ierBand?.color ?? "#e9eeec"}
          marker={{ at: IER_SUBSIDY_LINE, title: t("kpiSubsidyLine").replace("{line}", String(IER_SUBSIDY_LINE)) }}
        />
        <div className="mt-3 flex items-start justify-between gap-x-3 gap-y-1 text-xs">
          <span className="text-muted">{t("kpiIrrigationDelivery")}</span>
          <b className="text-end">{figure(ier, (d) => d.delivery_method || EM_DASH)}</b>
        </div>
      </KpiCard>

      <KpiCard
        title={t("kpiWaterLabel")}
        icon={Waves}
        testId="mon-kpi-water"
        aside={
          <div role="group" aria-label={t("kpiWaterUnitLabel")} className="inline-flex flex-none overflow-hidden rounded-md border border-line text-[11px] font-bold">
            {(["m3", "L"] as const).map((u) => {
              const on = (u === "L") === liters;
              return (
                <button
                  key={u}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onLitersChange(u === "L")}
                  className={cx("px-2 py-0.5 touch:min-h-[36px] touch:px-3", on ? "bg-teal text-white" : "bg-panel text-muted")}
                >
                  {u === "m3" ? "m³" : "L"}
                </button>
              );
            })}
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          <StatBox label={t("kpiWaterDaily")} labelClass="text-[#3b82c4]" value={waterFigure((d) => m3(d.daily_demand_m3 * scale))} unit={`${unit}/d`} />
          <StatBox label={t("kpiWaterWeekly")} labelClass="text-[#3b82c4]" value={waterFigure((d) => m3(d.weekly_demand_m3 * scale))} unit={`${unit}/wk`} />
          <StatBox label={t("kpiWaterMonthly")} labelClass="text-[#c46a12]" value={waterFigure((d) => m3(d.monthly_demand_m3 * scale))} unit={`${unit}/mo`} />
        </div>
      </KpiCard>
    </div>
  );
}
