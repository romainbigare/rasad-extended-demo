import { Building2, Calculator, Download, type LucideIcon, MapPin, Search, Sprout, TrendingDown, Trees, X, Droplets } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { IerBandBadge } from "@/components/ui/IerBandBadge";
import { Pagination } from "@/components/ui/Pagination";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { ErrorState } from "@/components/ui/States";
import { useFarmHealthRankings, useWaterFarmTotals } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { withChiAbbr } from "@/lib/chi/ChiInfo";
import { EM_DASH, formatInteger, formatYieldT } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { displayIer } from "@/lib/scores";
import { usePagination } from "@/lib/usePagination";

import { type FarmReportRow, useFarmReportRows } from "../../Reports/hooks/useReportRows";
import { STRINGS } from "../data/translations";

type StringKey = keyof typeof STRINGS;

/** Which deep-dive card opened the drilldown - sets its title and the row order. */
export type DrilldownKind = "advisories" | "ier" | "yield" | "treeHealth" | "structures" | "water";

/** The icon of each deep-dive card, shared by the card and the drilldown that opens from it. */
export const KIND_ICON: Record<DrilldownKind, LucideIcon> = {
  advisories: Sprout,
  ier: Droplets,
  yield: TrendingDown,
  treeHealth: Trees,
  structures: Building2,
  water: Calculator,
};

const TITLE_KEY: Record<DrilldownKind, StringKey> = {
  advisories: "drilldownSeasonalTitle",
  ier: "drilldownIerTitle",
  yield: "drilldownYieldTitle",
  treeHealth: "drilldownTreeHealthTitle",
  structures: "drilldownStructuresTitle",
  water: "drilldownWaterTitle",
};

const advisoryActive = (r: FarmReportRow) => r.advisoryStatus === "active" || r.advisoryStatus === "critical";
const byNumber = (pick: (r: FarmReportRow) => number | null, dir: 1 | -1) => (a: FarmReportRow, b: FarmReportRow) => {
  const x = pick(a);
  const y = pick(b);
  if (x === null && y === null) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return dir * (x - y);
};

/** Each card lists the same farms, ordered by what the card is about (missing values last).
 * treeHealth's real comparator is built in the component, once the CHI map is loaded (it isn't
 * one of these rows' own fields) - this entry is only the placeholder ORDER[kind] falls back to
 * before that map exists. */
const ORDER: Record<DrilldownKind, (a: FarmReportRow, b: FarmReportRow) => number> = {
  advisories: (a, b) => Number(advisoryActive(b)) - Number(advisoryActive(a)),
  ier: byNumber((r) => r.ierScore, 1), // lowest efficiency first
  yield: byNumber((r) => r.forecastYieldT, -1),
  treeHealth: () => 0,
  structures: byNumber((r) => r.areaDunums, -1),
  water: () => 0,
};

const TH = "whitespace-nowrap border-b border-line bg-[#F4F7F6] px-4 py-3 text-start text-[11px] font-bold uppercase tracking-[0.05em] text-muted";
const TD = "px-4 py-3.5 align-middle";

/** "Detailed holding records" under the deep-dive cards: every farm of the top-bar region with its
 * crop mix, varieties, forecast yield and area (the Reports farm rows), searchable, CSV and a map link. */
export function HoldingDrilldown({ kind, onClose }: { kind: DrilldownKind; onClose: () => void }) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading, isError } = useFarmReportRows();
  const isTreeHealth = kind === "treeHealth";
  const isWater = kind === "water";
  const isIer = kind === "ier";
  const waterTotals = useWaterFarmTotals(isWater);
  const waterByUid = useMemo(
    () => new Map((waterTotals.data?.rows ?? []).map((row) => [row.farm_id, row.monthly_demand_m3])),
    [waterTotals.data],
  );
  const waterFor = (r: FarmReportRow) => waterByUid.get(r.uid) ?? null;
  const chiRankings = useFarmHealthRankings(isTreeHealth);
  const chiByFarmId = useMemo(() => {
    const map = new Map<number, number | null>();
    for (const row of chiRankings.data?.rows ?? []) map.set(Number(row.farm_id), row.average_canopy_health_index);
    return map;
  }, [chiRankings.data]);
  const chiFor = (r: FarmReportRow) => (chiByFarmId.has(r.id) ? chiByFarmId.get(r.id) ?? null : undefined);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const order = isTreeHealth
      ? byNumber((r) => chiFor(r) ?? null, -1)
      : isWater
        ? byNumber((r) => waterByUid.get(r.uid) ?? null, -1) // thirstiest first
        : ORDER[kind];
    return (rows ?? [])
      .filter((r) =>
        !needle
          ? true
          : [r.name, r.label, r.cropMix, ...r.cultivars].some((v) => (v ?? "").toLowerCase().includes(needle)),
      )
      .sort(order);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chiFor closes over chiByFarmId, already a dependency
  }, [rows, search, kind, chiByFarmId, waterByUid]);
  const pager = usePagination(filtered, { resetKey: `${kind}|${search}` });

  const areaText = (r: FarmReportRow) => (r.areaDunums === null ? EM_DASH : `${formatInteger(area({ du: r.areaDunums }))} ${unitLabel}`);
  const waterText = (r: FarmReportRow) => {
    const value = waterFor(r);
    return value === null ? EM_DASH : `${formatInteger(Math.round(value))} m³`;
  };
  // Whole-number score, as the Reports table shows it; its band is read from the same number.
  const ierText = (r: FarmReportRow) => (r.ierScore === null ? EM_DASH : formatInteger(displayIer(r.ierScore, 0)?.value ?? 0));
  const chiText = (r: FarmReportRow) => {
    const value = chiFor(r);
    return value === undefined ? t("drilldownChiNoScore") : value === null ? EM_DASH : String(Math.round(value));
  };

  const downloadCsv = () => {
    const quote = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const header = [
      t("drilldownColFarm"), t("drilldownColRegion"), t("drilldownColCrop"), t("drilldownColVariety"),
      isTreeHealth ? t("drilldownColChi") : isWater ? t("drilldownColWater") : isIer ? t("drilldownColIer") : t("drilldownColYield"),
      `${t("drilldownColArea")} (${unitLabel})`,
    ];
    const lines = filtered.map((r) =>
      [
        r.name ?? r.label,
        r.zoneName ?? "",
        r.cropMix ?? "",
        r.cultivars.join(", "),
        isTreeHealth
          ? chiText(r)
          : isWater
            ? String(waterFor(r) === null ? "" : Math.round(waterFor(r) as number))
            : isIer
              ? r.ierScore === null
                ? ""
                : String(displayIer(r.ierScore, 0)?.value ?? "")
              : r.forecastYieldT === null
              ? ""
              : String(r.forecastYieldT),
        r.areaDunums === null ? "" : String(area({ du: r.areaDunums }) ?? ""),
      ].map(quote).join(","),
    );
    const blob = new Blob([[header.map(quote).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kind}-holdings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-4" testId="deep-dive-drilldown">
      <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-green">{t("drilldownEyebrow")}</div>
          <h3 className="m-0 mt-0.5 flex items-center gap-2 text-base font-extrabold leading-snug">
            <TitleIcon icon={KIND_ICON[kind]} />
            {t(TITLE_KEY[kind])}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block w-full sm:w-72">
            <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted">
              <Search size={15} strokeWidth={1.8} aria-hidden />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("drilldownSearchPlaceholder")}
              aria-label={t("drilldownSearchPlaceholder")}
              className={cx(FIELD_CLASS, "w-full ps-9")}
            />
          </label>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-semibold hover:bg-[#F4F7F6] disabled:opacity-60"
          >
            <Download size={16} strokeWidth={1.8} aria-hidden className="text-green" />
            {t("csvButtonLabel")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("drilldownClose")}
            className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-white text-muted hover:bg-[#F4F7F6] hover:text-ink"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </div>

      {(isLoading || (isTreeHealth && chiRankings.isLoading) || (isWater && waterTotals.isLoading)) && (
        <div className="py-6 text-center text-xs text-muted">{t("drilldownLoading")}</div>
      )}
      {isError && <ErrorState message={t("drilldownError")} />}
      {!isLoading && !(isTreeHealth && chiRankings.isLoading) && !(isWater && waterTotals.isLoading) && !isError && (
        <>
          <div className="relative mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="table-sticky-first w-full border-collapse text-xs" data-testid="deep-dive-drilldown-table">
              <thead>
                <tr>
                  <th scope="col" className={TH}>{t("drilldownColFarm")}</th>
                  <th scope="col" className={TH}>{t("drilldownColCrop")}</th>
                  <th scope="col" className={TH}>{t("drilldownColTrees")}</th>
                  <th scope="col" className={TH}>{t("drilldownColVariety")}</th>
                  <th scope="col" className={TH}>{isTreeHealth ? withChiAbbr(t("drilldownColChi")) : isWater ? t("drilldownColWater") : isIer ? t("drilldownColIer") : t("drilldownColYield")}</th>
                  <th scope="col" className={TH}>{`${t("drilldownColArea")} (${unitLabel})`}</th>
                  <th scope="col" className={cx(TH, "text-center")}>{t("drilldownColAction")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-xs text-muted">
                      {t("drilldownEmpty")}
                    </td>
                  </tr>
                )}
                {pager.pageRows.map((r) => (
                  <tr key={r.id} className="border-b border-line transition-colors last:border-0 hover:bg-[#F4F7F6]">
                    <td className={TD}>
                      <b className="block">{r.name ?? r.label}</b>
                      <span className="text-xs text-muted">
                        {r.zoneName ? t("farmRegionTemplate").replace("{region}", r.zoneName) : EM_DASH}
                        {advisoryActive(r) && <span className="ms-1.5 font-medium text-red">· {t("drilldownAdvisoryActive")}</span>}
                      </span>
                    </td>
                    <td className={TD}>
                      {r.cropMix ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#f6dd8f] bg-[#fef6d8] px-2.5 py-0.5 text-xs font-medium text-[#8a5a00]">
                          {r.cropMix}
                        </span>
                      ) : (
                        EM_DASH
                      )}
                    </td>
                    <td className={cx(TD, "text-muted")}>{EM_DASH}</td>
                    <td className={cx(TD, "text-muted")}>{r.cultivars.length > 0 ? r.cultivars.join(", ") : EM_DASH}</td>
                    <td className={cx(TD, "whitespace-nowrap font-bold", isTreeHealth && chiFor(r) === undefined && "text-muted font-normal")}>
                      {isTreeHealth
                        ? chiText(r)
                        : isWater
                          ? waterText(r)
                          : isIer
                            ? (
                                <span className="inline-flex items-center gap-2">
                                  {ierText(r)}
                                  <IerBandBadge score={displayIer(r.ierScore, 0)?.value} />
                                </span>
                              )
                            : r.forecastYieldT === null
                              ? EM_DASH
                              : `${formatYieldT(r.forecastYieldT)} t`}
                    </td>
                    <td className={cx(TD, "whitespace-nowrap font-medium")}>{areaText(r)}</td>
                    <td className={cx(TD, "text-center")}>
                      <Link
                        href={`/farm-monitoring?farm=${r.id}`}
                        aria-label={t("drilldownOpenFarm")}
                        className="inline-grid h-8 w-8 place-items-center rounded-md border border-line bg-white text-green hover:bg-green-l"
                      >
                        <MapPin size={16} strokeWidth={1.8} aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pager.page}
            pageCount={pager.pageCount}
            total={pager.total}
            from={pager.from}
            to={pager.to}
            onPage={pager.setPage}
          />
        </>
      )}
    </Card>
  );
}
