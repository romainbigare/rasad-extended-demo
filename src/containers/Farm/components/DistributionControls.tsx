import { ChevronRight, FileJson, FileSpreadsheet, type LucideIcon, Search } from "lucide-react";
import { type ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

import { BreakdownSlotContext } from "@/components/ui/BreakdownSlot";
import { Card, CardHeader } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { Pagination } from "@/components/ui/Pagination";
import { UnitCase } from "@/components/ui/UnitCase";
import { downloadAnalyticsExport } from "@/lib/analytics/hooks";
import type { AnalyticsExportDataset } from "@/lib/analytics/types";
import { useT } from "@/lib/i18n/createDict";
import { useRegion } from "@/lib/region/RegionContext";
import { usePagination } from "@/lib/usePagination";

import { STRINGS } from "../data/translations";

// The Farm page imports the slot from here.
export { BreakdownSlotContext };

/** A small icon button with a tooltip (title) and an accessible name. */
function IconButton({ label, onClick, disabled, pressed, children }: { label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-grid h-7 w-7 flex-none place-items-center rounded-lg border text-muted transition hover:bg-[#f4f7f6] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 touch:h-10 touch:w-10",
        pressed ? "border-[#9aa5a2] bg-[#f4f7f6] text-ink" : "border-line bg-panel",
      )}
    >
      {children}
    </button>
  );
}

/**
 * One compact distribution card (Executive View: crops this season): title and small icon actions (search,
 * CSV, GeoJSON) on top, the donut (children) in the middle, "View breakdown" at the bottom, and the
 * breakdown table (`breakdown`) under it when open.
 */
export function DistributionCard({
  testId,
  title,
  icon,
  subtitle,
  search,
  onSearch,
  searchPlaceholder,
  dataset,
  canExport,
  showBreakdown,
  onToggleBreakdown,
  children,
  breakdown,
}: {
  testId: string;
  title: string;
  icon?: LucideIcon;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  dataset: AnalyticsExportDataset;
  canExport: boolean;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
  children: ReactNode;
  breakdown?: ReactNode;
}) {
  const t = useT(STRINGS);
  const { zoneId } = useRegion();
  const slot = useContext(BreakdownSlotContext);
  const [exporting, setExporting] = useState<"csv" | "geojson" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchShown = searchOpen || search !== "";

  const download = async (format: "csv" | "geojson") => {
    setExporting(format);
    setExportError(null);
    try {
      await downloadAnalyticsExport(dataset, zoneId, format);
    } catch {
      setExportError(t(format === "csv" ? "csvExportError" : "geoJsonExportError"));
    } finally {
      setExporting(null);
    }
  };

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4" testId={testId}>
      <CardHeader
        className="!mb-0"
        title={title}
        icon={icon}
        subtitle={subtitle}
        actions={
          <div className="flex flex-none items-center gap-1" role="group" aria-label={title}>
            <IconButton label={t("distSearchTooltip")} pressed={searchShown} onClick={() => setSearchOpen((v) => !v)}>
              <Search size={14} strokeWidth={1.8} aria-hidden />
            </IconButton>
            <IconButton
              label={exporting === "csv" ? t("csvPreparingLabel") : t("distCsvTooltip")}
              disabled={!canExport || exporting !== null}
              onClick={() => download("csv")}
            >
              <FileSpreadsheet size={14} strokeWidth={1.8} aria-hidden />
            </IconButton>
            <IconButton
              label={exporting === "geojson" ? t("csvPreparingLabel") : t("distGeoJsonTooltip")}
              disabled={!canExport || exporting !== null}
              onClick={() => download("geojson")}
            >
              <FileJson size={14} strokeWidth={1.8} aria-hidden />
            </IconButton>
          </div>
        }
      />

      {searchShown && (
        <label className="relative block">
          <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted">
            <Search width={14} height={14} strokeWidth={1.8} aria-hidden />
          </span>
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            autoFocus={searchOpen && search === ""}
            className={cx(FIELD_CLASS, "w-full ps-9")}
          />
        </label>
      )}

      {children}

      <button
        type="button"
        aria-expanded={showBreakdown}
        onClick={onToggleBreakdown}
        className="inline-flex w-fit items-center gap-0.5 text-xs font-semibold text-green-d hover:underline"
      >
        {showBreakdown ? t("hideBreakdownLabel") : t("viewBreakdownLabel")}
        <ChevronRight size={14} strokeWidth={2} aria-hidden className={showBreakdown ? "rotate-90" : "rtl:rotate-180"} />
      </button>

      {slot ? null : breakdown}
      {slot && breakdown ? createPortal(breakdown, slot) : null}
      {exportError && (
        <div role="alert" className="text-xs font-semibold text-red">
          {exportError}
        </div>
      )}
    </Card>
  );
}

/** A breakdown table under a distribution bar, paginated client-side once it runs
 * past 10 rows (e.g. every farm growing one crop) - the shared Pagination. */
export function BreakdownTable({
  title,
  columns,
  rows,
  emptyText,
  testId,
}: {
  title: string;
  columns: string[];
  rows: Array<{ key: string; cells: React.ReactNode[] }>;
  emptyText: string;
  testId?: string;
}) {
  const t = useT(STRINGS);
  const inSlot = useContext(BreakdownSlotContext) !== null;
  // Back to page 1 on a different selected class/crop (the title names it) or a search.
  const pager = usePagination(rows, { resetKey: title });
  const { pageRows } = pager;

  return (
    <div className={inSlot ? "rounded-card border border-line bg-panel p-4 shadow-xs" : "mt-1 rounded-xl border border-line p-3"} data-testid={testId}>
      <div className="section-label mb-2 text-[11px]">{title}</div>
      {rows.length === 0 ? (
        <p className="m-0 text-xs text-muted">{emptyText}</p>
      ) : (
        <>
          <div className="relative overflow-x-auto">
            <table className="table-sticky-first w-full border-collapse text-xs">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c} scope="col" className="border-b border-line bg-[#F4F7F6] px-3 py-2 text-start text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                      <UnitCase>{c}</UnitCase>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.key} className="border-b border-[#eef1f0] last:border-0">
                    {r.cells.map((cell, i) => (
                      <td key={i} className={i === 0 ? "px-3 py-2 font-semibold" : "px-3 py-2"}>
                        {cell}
                      </td>
                    ))}
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
    </div>
  );
}
