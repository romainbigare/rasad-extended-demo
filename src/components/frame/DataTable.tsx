import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";

import { cx } from "@/components/ui/cx";
import { Pagination } from "@/components/ui/Pagination";
import { useFilterHref } from "@/lib/filters/FilterContext";
import { useT } from "@/lib/i18n/createDict";
import { usePagination } from "@/lib/usePagination";

import { FRAME_STRINGS } from "./translations";

export interface DataColumn<R> {
  key: string;
  header: string;
  /** Numbers read right-aligned (left in Arabic, with the start/end logic). */
  align?: "end";
  render: (row: R) => ReactNode;
  /** What the column sorts on; a column without one is not sortable. null sorts last. */
  sortValue?: (row: R) => number | string | null | undefined;
}

const compare = (a: number | string | null | undefined, b: number | string | null | undefined, dir: 1 | -1): number => {
  // A field the API leaves out (undefined) sorts like an empty one (null): last.
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return dir * (a - b);
  return dir * String(a).localeCompare(String(b));
};

/**
 * A small sortable table: a header click sorts (again to reverse), numbers are right-aligned, long
 * lists are paged. One header style everywhere on the new pages.
 */
export function DataTable<R>({
  columns,
  rows,
  rowKey,
  defaultSort,
  pageSize,
  isLoading = false,
  isError = false,
  emptyText,
  testId = "data-table",
}: {
  columns: ReadonlyArray<DataColumn<R>>;
  rows: readonly R[] | undefined;
  rowKey: (row: R) => string;
  /** Column key and direction the table opens sorted on. */
  defaultSort?: { key: string; dir: "asc" | "desc" };
  pageSize?: number;
  isLoading?: boolean;
  isError?: boolean;
  emptyText?: string;
  testId?: string;
}) {
  const t = useT(FRAME_STRINGS);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(defaultSort ?? null);
  const sorted = useMemo(() => {
    const column = columns.find((c) => c.key === sort?.key);
    if (!rows || !column?.sortValue || !sort) return rows ?? [];
    const pick = column.sortValue;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => compare(pick(a), pick(b), dir));
  }, [rows, columns, sort]);
  const pager = usePagination(sorted, { pageSize, resetKey: `${sort?.key}|${sort?.dir}` });

  const toggle = (key: string) =>
    setSort((current) => (current?.key === key ? { key, dir: current.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  return (
    <div data-testid={testId}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const label = (
                  <>
                    {c.header}
                    {active && (
                      <span aria-hidden className="ms-1 text-green-d">
                        {sort?.dir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </>
                );
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cx("whitespace-nowrap border-b border-line px-3 py-2 text-xs font-semibold text-muted first:ps-0 last:pe-0", c.align === "end" ? "text-end" : "text-start")}
                  >
                    {c.sortValue ? (
                      <button type="button" onClick={() => toggle(c.key)} className="font-semibold hover:text-ink">
                        {label}
                        {active && <span className="sr-only">, {sort?.dir === "asc" ? t("tableSortedAscending") : t("tableSortedDescending")}</span>}
                      </button>
                    ) : (
                      label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pager.pageRows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-[#fafbfb]">
                {columns.map((c) => (
                  <td key={c.key} className={cx("px-3 py-2.5 align-middle first:ps-0 last:pe-0", c.align === "end" ? "text-end tabular-nums" : "text-start")}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isLoading ? (
        <p className="m-0 py-6 text-center text-xs text-muted">{t("tableLoading")}</p>
      ) : isError ? (
        <p role="alert" className="m-0 py-6 text-center text-xs text-red">
          {t("tableError")}
        </p>
      ) : (
        sorted.length === 0 && <p className="m-0 py-6 text-center text-xs text-muted">{emptyText ?? t("tableEmpty")}</p>
      )}
      <Pagination page={pager.page} pageCount={pager.pageCount} total={pager.total} from={pager.from} to={pager.to} onPage={pager.setPage} />
    </div>
  );
}

/** A farm's name as a link to that farm in Farm Monitoring, carrying the region and crop choice. */
export function FarmLink({ farmId, name }: { farmId: number | string | null; name: string }) {
  const t = useT(FRAME_STRINGS);
  const href = useFilterHref();
  if (farmId === null) return <>{name}</>;
  return (
    <Link
      href={href(`/farm-monitoring?farm=${farmId}`)}
      title={t("tableOpenFarm").replace("{farm}", name)}
      className="font-medium text-green-d hover:underline"
    >
      {name}
    </Link>
  );
}
