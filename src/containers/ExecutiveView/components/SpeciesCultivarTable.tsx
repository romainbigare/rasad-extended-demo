import { TreePalm } from "lucide-react";
import { type ReactNode, useState } from "react";

import { CardHeader } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { UnavailablePanel } from "@/components/ui/EmptyStateBadge";
import { Pagination } from "@/components/ui/Pagination";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { QueryValue } from "@/components/ui/QueryValue";
import { useSpeciesSummary } from "@/lib/analytics/hooks";
import type { SpeciesCategory, SpeciesRow } from "@/lib/analytics/types";
import { EM_DASH, formatInteger, formatPercent, formatYieldT } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { usePagination } from "@/lib/usePagination";

import { STRINGS } from "../data/translations";
import { useRegionScope } from "../data/useRegionScope";

type Category = SpeciesCategory | "all";
type T = ReturnType<typeof useT<typeof STRINGS>>;

const isFruit = (r: SpeciesRow) => r.category === "fruit";

const COLUMNS: ReadonlyArray<{
  id: string;
  labelKey: keyof typeof STRINGS;
  render: (row: SpeciesRow, t: T) => ReactNode;
  /** "end" right-aligns the header and cells (the last area column). */
  align?: "end";
}> = [
  {
    id: "speciesCultivar",
    labelKey: "speciesColSpeciesCultivar",
    render: (r) => (
      <span className="flex items-center gap-2.5">
        <span aria-hidden className={cx("h-2.5 w-2.5 flex-none rounded-full", isFruit(r) ? "bg-[#1f78c1]" : "bg-green-d")} />
        <b className="text-xs">{r.display_name || r.cultivar || r.species}</b>
      </span>
    ),
  },
  {
    id: "scientificName",
    labelKey: "speciesColScientificName",
    render: (r) => <span className="text-xs italic leading-snug text-muted">{r.scientific_name ?? EM_DASH}</span>,
  },
  { id: "treeCount", labelKey: "speciesColTreeCount", render: (r) => <b className="text-xs">{formatInteger(r.tree_count)}</b> },
  {
    id: "categoryShare",
    labelKey: "speciesColCategoryShare",
    render: (r) => <span className={cx("text-xs", isFruit(r) ? "text-[#1f78c1]" : "text-green-d")}>{formatPercent(r.category_share_pct)}</span>,
  },
  {
    id: "estYield",
    labelKey: "speciesColEstYield",
    render: (r, t) =>
      r.est_yield_t === null
        ? r.category === "native"
          ? t("speciesHeritageFlora")
          : EM_DASH
        : <b className="whitespace-nowrap text-xs">{`${formatYieldT(r.est_yield_t)} ${t("commonTonnesUnit")}`}</b>,
  },
  {
    id: "areaHa",
    labelKey: "speciesColAreaHa",
    render: (r, t) =>
      r.area_ha === null ? (
        EM_DASH
      ) : (
        <span className="whitespace-nowrap text-xs font-bold">
          {formatInteger(r.area_ha)} {t("commonHectaresUnit")}
        </span>
      ),
  },
  {
    id: "areaDu",
    labelKey: "speciesColAreaDu",
    align: "end",
    render: (r, t) =>
      r.area_du === null ? (
        EM_DASH
      ) : (
        <span className="whitespace-nowrap text-xs font-bold">
          {formatInteger(r.area_du)} {t("commonDunumsUnit")}
        </span>
      ),
  },
];

const CATEGORIES: ReadonlyArray<{ value: Category; labelKey: keyof typeof STRINGS }> = [
  { value: "all", labelKey: "speciesAllLabel" },
  { value: "date_palm", labelKey: "commonDatePalmsLabel" },
  { value: "fruit", labelKey: "commonFruitOrchardsLabel" },
  { value: "native", labelKey: "speciesNativeLabel" },
];

export function SpeciesCultivarTable() {
  const t = useT(STRINGS);
  const { label: scope } = useRegionScope();
  const [category, setCategory] = useState<Category>("all");
  // One request for every row: the tab counts and the surveyed-area total need
  // all categories, and the tabs then filter locally.
  const species = useSpeciesSummary("all");
  const allRows = species.data?.rows ?? [];
  const rows = category === "all" ? allRows : allRows.filter((r) => r.category === category);
  const pager = usePagination(rows);

  const countFor = (value: Category) =>
    value === "all" ? allRows.length : allRows.filter((r) => r.category === value).length;
  // Label, then the count in muted normal weight ("Date palms  10"); no count until the rows have loaded.
  const categoryOptions = CATEGORIES.map((c) => ({
    value: c.value,
    label: t(c.labelKey),
    hint: species.data ? formatInteger(countFor(c.value)) : undefined,
  }));

  const totalHa = allRows.reduce((sum, r) => sum + (r.area_ha ?? 0), 0);
  const subtitle = (
    <QueryValue
      query={species}
      inline
      quiet
      render={() =>
        t("speciesSubtitle")
          .replace("{ha}", formatInteger(totalHa))
          .replace("{du}", formatInteger(totalHa * 10))
          .replace("{scope}", scope)
      }
    />
  );

  return (
    <div className="p-5" data-testid="exec-species">
      <CardHeader title={t("speciesTitle")} icon={TreePalm} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<Category>
          label={t("speciesSegmentedLabel")}
          options={categoryOptions}
          value={category}
          onChange={setCategory}
        />
        <div className="min-w-0 flex-1 text-xs text-muted lg:max-w-[640px] lg:text-end">
          {subtitle}
        </div>
      </div>
      <div className="relative overflow-x-auto rounded-xl border border-line">
        <table className="table-sticky-first w-full border-collapse text-xs" data-testid="species-table">
          <thead className="bg-[#F4F7F6]">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cx(
                    "border-b border-line px-6 py-4 align-middle text-[11px] font-bold uppercase leading-snug tracking-wider text-muted",
                    column.align === "end" ? "text-end" : "text-start",
                  )}
                >
                  {t(column.labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {species.isLoading || species.isError || !species.data ? (
              // Skeleton / error+retry, inside a real cell so the table stays valid HTML.
              <tr>
                <td colSpan={COLUMNS.length} className="px-3.5 py-3">
                  <QueryValue query={species} render={() => null} />
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-0 pt-3">
                  <UnavailablePanel title={t("speciesEmptyTitle")}>{t("speciesEmptyBody")}</UnavailablePanel>
                </td>
              </tr>
            ) : (
              pager.pageRows.map((row, i) => (
                // display_name repeats across rows (e.g. several "Medjool (Date Palm)"), so the index keeps keys unique.
                <tr
                  key={`${row.display_name}-${pager.start + i}`}
                  className="border-b border-line transition-colors last:border-0 hover:bg-[#F4F7F6]"
                  data-testid="species-row"
                >
                  {COLUMNS.map((column) => (
                    <td key={column.id} className={cx("px-6 py-5 align-middle", column.align === "end" && "text-end")}>
                      {column.render(row, t)}
                    </td>
                  ))}
                </tr>
              ))
            )}
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
    </div>
  );
}
