import { useEffect, useState } from "react";

/** Rows per page for every paginated table in the app. */
export const PAGE_SIZE = 10;

/**
 * Client-side pagination: the rows are already loaded in full, this only picks
 * which slice to render. Search / filter / tab changes that change the row count
 * go back to page 1; a page left past the end (fewer rows now) is clamped.
 * `resetKey` also goes back to page 1 when it changes - for a switch to a
 * different list that happens to have the same number of rows.
 */
export function usePagination<T>(rows: readonly T[], { pageSize = PAGE_SIZE, resetKey }: { pageSize?: number; resetKey?: unknown } = {}) {
  const [page, setPage] = useState(0);
  const total = rows.length;
  const pageCount = Math.max(Math.ceil(total / pageSize), 1);

  useEffect(() => setPage(0), [total, resetKey]);
  const current = Math.min(page, pageCount - 1);

  const start = current * pageSize;
  return {
    page: current,
    setPage,
    pageCount,
    total,
    /** 0-based index of the first row on this page (for numbering / colours that follow the full list). */
    start,
    /** 1-based "from"/"to" for the "Showing 11–20 of 89" line. */
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
    pageRows: rows.slice(start, start + pageSize),
    /** Jump to the page holding row `index` (e.g. a field picked on the map). */
    showIndex: (index: number) => index >= 0 && setPage(Math.floor(index / pageSize)),
  };
}
