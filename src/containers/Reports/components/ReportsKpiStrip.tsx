import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";
import { Ltr } from "@/components/ui/Ltr";
import { QueryValue } from "@/components/ui/QueryValue";
import { usePortfolioSummary } from "@/lib/analytics/hooks";
import { EM_DASH, formatInteger } from "@/lib/format";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import { useCropReportRows, useFieldReportRows, useStructureReportRows } from "../hooks/useReportRows";
import { useDateCultivarRows, useReportsSummary, useStructureListRows, useWaterQuotaRows } from "../hooks/useReportsApi";
import type { ReportType } from "./ReportTypeTabs";

/** A quantity as a whole number (5,600). */
const figure = (value: number) => formatInteger(value);
/** Thousands of m³, e.g. 6,690 (for "6,690 k-m³"). */
const kM3 = (value: number) => formatInteger(Math.round(value / 1000));
const sum = (values: Array<number | null | undefined>) => values.reduce<number>((s, v) => s + (v ?? 0), 0);

/** Like sum, but null when no row has a value - for figures that may have no source at all
 * (a total of "nothing known" is not 0). */
const sumOrNull = (values: Array<number | null | undefined>) =>
  values.some((v) => v != null) ? sum(values) : null;

function Tile({ label, value, sub, subClass, testId }: { label: string; value: ReactNode; sub: ReactNode; subClass?: string; testId: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-panel p-3.5 shadow-2xs" data-testid={testId}>
      <div className="text-[11px] font-medium text-muted">{label}</div>
      <div className="mt-2 text-xl font-extrabold leading-none">{value}</div>
      <div className={cx("mt-3 text-[10px] font-semibold", subClass ?? "text-muted")}>{sub}</div>
    </div>
  );
}

const Unit = ({ children }: { children: ReactNode }) => <span className="ms-1.5">{children}</span>;

/** 4 cards per row on wide screens, or 3 when a tab has only 3 figures to show. */
function Grid({ cols, children }: { cols: 3 | 4; children: ReactNode }) {
  return (
    <div className={cx("grid gap-4 sm:grid-cols-2", cols === 4 ? "xl:grid-cols-4" : "lg:grid-cols-3")} data-testid="reports-kpis">
      {children}
    </div>
  );
}

/** Mean of the non-null values, or null when there are none. */
const mean = (values: Array<number | null>) => {
  const v = values.filter((x): x is number => x !== null);
  return v.length === 0 ? null : sum(v) / v.length;
};

/** A figure worked out from a tab's rows: "…" while loading, "—" when the rows couldn't load. */
function rowsValue<T>(rows: T[] | undefined, isLoading: boolean) {
  return (render: (rows: T[]) => ReactNode): ReactNode => (rows ? render(rows) : isLoading ? "…" : EM_DASH);
}

function FarmKpis() {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const portfolio = usePortfolioSummary();
  const summary = useReportsSummary();

  return (
    <Grid cols={3}>
      <Tile
        testId="kpi-holdings-audited"
        label={t("kpiHoldingsAuditedLabel")}
        value={<QueryValue query={portfolio} render={(d) => formatInteger(d.total_farms)} />}
        sub={
          portfolio.data?.boundary_verified_pct == null
            ? t("kpiTelemetryVerifiedTemplate").replace("{pct}%", "—")
            : t("kpiTelemetryVerifiedTemplate").replace("{pct}", String(Math.round(portfolio.data.boundary_verified_pct)))
        }
        subClass="text-[#4FB840]"
      />
      <Tile
        testId="kpi-arable-area"
        label={t("kpiArableAreaLabel")}
        value={
          <QueryValue
            query={summary}
            render={(d) =>
              d.arable_area_du === null ? (
                EM_DASH
              ) : (
                <>
                  {figure(area({ du: d.arable_area_du }) ?? 0)}
                  <Unit>{unitLabel}</Unit>
                </>
              )
            }
          />
        }
        sub={t("kpiArableAreaSub")}
      />
      <Tile
        testId="kpi-forecast-yield"
        label={t("kpiForecastYieldLabel")}
        value={
          <QueryValue
            query={summary}
            render={(d) =>
              d.forecast_yield_t === null ? (
                EM_DASH
              ) : (
                <>
                  {figure(d.forecast_yield_t)}
                  <Unit>{t("kpiTonnesUnit")}</Unit>
                </>
              )
            }
          />
        }
        sub={t("kpiForecastYieldSub")}
        subClass="text-[#006E01]"
      />
    </Grid>
  );
}

function FieldKpis() {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading } = useFieldReportRows();
  const value = rowsValue(rows, isLoading);
  return (
    <Grid cols={4}>
      <Tile testId="kpi-fields-count" label={t("kpiFieldsCountLabel")} value={value((r) => formatInteger(r.length))} sub={t("kpiFieldsCountSub")} subClass="text-[#0284C7]" />
      <Tile
        testId="kpi-fields-health"
        label={t("kpiFieldsHealthLabel")}
        value={value((r) => {
          const ndvi = r.flatMap((f) => (f.ndvi === null ? [] : [f.ndvi]));
          // Plain NDVI (0-1), not a percentage: a % reads like a health score, and CHI is a different index.
          return ndvi.length === 0 ? EM_DASH : (sum(ndvi) / ndvi.length).toFixed(2);
        })}
        sub={t("kpiFieldsHealthSub")}
        subClass="text-[#4FB840]"
      />
      <Tile
        testId="kpi-fields-area"
        label={t("kpiFieldsAreaLabel")}
        value={value((r) => (
          <>
            {figure(area({ du: sum(r.map((f) => f.areaDunums)) }) ?? 0)}
            <Unit>{unitLabel}</Unit>
          </>
        ))}
        sub={t("kpiFieldsAreaSub")}
      />
      <Tile
        testId="kpi-fields-ier"
        label={t("kpiFieldsIerLabel")}
        value={value((r) => {
          const avg = mean(r.map((f) => f.ier));
          return avg === null ? EM_DASH : `${formatInteger(avg)}%`;
        })}
        sub={t("kpiFieldsIerSub")}
        subClass="text-[#006E01]"
      />
    </Grid>
  );
}

function StructureKpis() {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading } = useStructureReportRows();
  const list = useStructureListRows();
  const value = rowsValue(rows, isLoading);
  const listValue = rowsValue(list.data?.rows, list.isLoading);
  return (
    <Grid cols={4}>
      <Tile
        testId="kpi-structures-count"
        label={t("kpiStructuresCountLabel")}
        value={value((r) => formatInteger(sum(r.map((s) => s.count))))}
        sub={t("kpiStructuresCountSub")}
        subClass="text-[#D97706]"
      />
      <Tile
        testId="kpi-structures-area"
        label={t("kpiStructuresAreaLabel")}
        value={value((r) => (
          <>
            {figure(area({ du: sum(r.map((s) => s.area_du)) }) ?? 0)}
            <Unit>{unitLabel}</Unit>
          </>
        ))}
        sub={t("kpiStructuresAreaSub")}
        subClass="text-[#667876]"
      />
      <Tile
        testId="kpi-structures-permitted"
        label={t("kpiStructuresPermittedLabel")}
        value={listValue((r) => <span className="text-[#006E01]">{formatInteger(r.filter((s) => s.permit_status === "permitted").length)}</span>)}
        sub={t("kpiStructuresPermittedSub")}
        subClass="text-[#006E01]"
      />
      <Tile
        testId="kpi-structures-protected"
        label={t("kpiStructuresProtectedLabel")}
        value={listValue((r) => (
          <>
            {figure(area({ du: sum(r.filter((s) => s.category?.toLowerCase() === "protected agriculture").map((s) => s.area_du)) }) ?? 0)}
            <Unit>{unitLabel}</Unit>
          </>
        ))}
        sub={t("kpiStructuresProtectedSub")}
        subClass="text-[#4FB840]"
      />
    </Grid>
  );
}

function DateCultivarKpis() {
  const t = useT(STRINGS);
  const query = useDateCultivarRows();
  const value = rowsValue(query.data?.rows, query.isLoading);
  return (
    <Grid cols={4}>
      <Tile testId="kpi-palms" label={t("kpiPalmsLabel")} value={value((r) => formatInteger(sum(r.map((c) => c.palm_count))))} sub={t("kpiPalmsSub")} subClass="text-[#15803D]" />
      <Tile
        testId="kpi-cultivars"
        label={t("kpiCultivarsLabel")}
        value={value((r) => t("kpiCultivarsTemplate").replace("{count}", formatInteger(new Set(r.map((c) => c.cultivar)).size)))}
        sub={t("kpiCultivarsSub")}
      />
      <Tile
        testId="kpi-date-yield"
        label={t("kpiDateYieldLabel")}
        value={value((r) => (
          <>
            {figure(sum(r.map((c) => c.est_yield_t)))}
            <Unit>{t("kpiTonnesUnit")}</Unit>
          </>
        ))}
        sub={t("kpiDateYieldSub").replace("{year}", String(new Date().getFullYear()))}
        subClass="text-[#006E01]"
      />
      <Tile
        testId="kpi-low-weevil"
        label={t("kpiLowWeevilLabel")}
        value={value((r) => (
          <span className="text-[#006E01]">
            <Ltr>{`${formatInteger(r.filter((c) => c.weevil_risk === "low").length)} / ${formatInteger(r.length)}`}</Ltr>
          </span>
        ))}
        sub={t("kpiLowWeevilSub")}
        subClass="text-[#006E01]"
      />
    </Grid>
  );
}

function CropKpis() {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading } = useCropReportRows();
  const value = rowsValue(rows, isLoading);
  return (
    <Grid cols={4}>
      <Tile testId="kpi-crop-plantings" label={t("kpiCropPlantingsLabel")} value={value((r) => formatInteger(r.length))} sub={t("kpiCropPlantingsSub")} subClass="text-[#4FB840]" />
      <Tile
        testId="kpi-crop-area"
        label={t("kpiCropAreaLabel")}
        value={value((r) => (
          <>
            {figure(area({ du: sum(r.map((c) => c.areaDunums)) }) ?? 0)}
            <Unit>{unitLabel}</Unit>
          </>
        ))}
        sub={t("kpiCropAreaSub")}
        subClass="text-[#667876]"
      />
      <Tile
        testId="kpi-crop-forecast"
        label={t("kpiCropForecastLabel")}
        value={value((r) => {
          const withForecast = r.filter((c) => c.forecastYieldT !== null);
          return withForecast.length === 0 ? (
            EM_DASH
          ) : (
            <>
              {figure(sum(withForecast.map((c) => c.forecastYieldT)))}
              <Unit>{t("kpiTonnesUnit")}</Unit>
            </>
          );
        })}
        sub={value((r) => {
          const both = r.filter((c) => c.forecastYieldT !== null && c.targetYieldT);
          const target = sum(both.map((c) => c.targetYieldT));
          return t("kpiCropRealizationTemplate").replace(
            "{pct}",
            target > 0 ? formatInteger((sum(both.map((c) => c.forecastYieldT)) / target) * 100) : EM_DASH,
          );
        })}
        subClass="text-[#006E01]"
      />
      <Tile
        testId="kpi-crop-ier"
        label={t("kpiCropIerLabel")}
        value={value((r) => {
          const avg = mean(r.map((c) => c.ier));
          return avg === null ? EM_DASH : formatInteger(avg);
        })}
        sub={t("kpiCropIerSub")}
        subClass="text-[#4FB840]"
      />
    </Grid>
  );
}

function WaterKpis() {
  const t = useT(STRINGS);
  const query = useWaterQuotaRows();
  const rows = query.data?.rows;
  const value = rowsValue(rows, query.isLoading);
  const balance = rows ? sumOrNull(rows.map((r) => r.net_balance_m3)) : null;
  const km3 = (v: number | null) =>
    v === null ? (
      EM_DASH
    ) : (
      <>
        <Ltr>{kM3(v)}</Ltr>
        <Unit>k-m³</Unit>
      </>
    );
  return (
    <Grid cols={4}>
      <Tile
        testId="kpi-water-allocated"
        label={t("kpiWaterAllocatedLabel")}
        value={value((r) => km3(sumOrNull(r.map((w) => w.allocated_m3))))}
        sub={t("kpiWaterAllocatedSub")}
        subClass="text-[#0284C7]"
      />
      <Tile
        testId="kpi-water-used"
        label={t("kpiWaterUsedLabel")}
        value={value((r) => km3(sumOrNull(r.map((w) => w.consumed_m3))))}
        sub={t("kpiWaterUsedSub")}
        subClass="text-[#667876]"
      />
      <Tile
        testId="kpi-water-balance"
        label={t("kpiWaterBalanceLabel")}
        value={value(() =>
          balance === null ? (
            EM_DASH
          ) : (
            <span className="text-[#006E01]">
              <Ltr>{`${balance > 0 ? "+" : balance < 0 ? "-" : ""}${kM3(Math.abs(balance))} k-m³`}</Ltr>
            </span>
          ),
        )}
        sub={balance !== null && balance < 0 ? t("kpiWaterBalanceSubOver") : t("kpiWaterBalanceSubOk")}
        subClass={balance !== null && balance < 0 ? "text-red" : "text-[#006E01]"}
      />
      <Tile
        testId="kpi-overdraft"
        label={t("kpiOverdraftLabel")}
        value={value((r) =>
          r.some((w) => w.net_balance_m3 != null) ? (
            <span className="text-[#DC2626]">{formatInteger(r.filter((w) => (w.net_balance_m3 ?? 0) < 0).length)}</span>
          ) : (
            EM_DASH
          ),
        )}
        sub={t("kpiOverdraftSub")}
        subClass="text-[#DC2626]"
      />
    </Grid>
  );
}

/** The KPI cards above the table - a set per report tab. */
export function ReportsKpiStrip({ type }: { type: ReportType }) {
  switch (type) {
    case "fields":
      return <FieldKpis />;
    case "structures":
      return <StructureKpis />;
    case "date-cultivars":
      return <DateCultivarKpis />;
    case "crops":
      return <CropKpis />;
    case "water-quota":
      return <WaterKpis />;
    case "farms":
    default:
      return <FarmKpis />;
  }
}
