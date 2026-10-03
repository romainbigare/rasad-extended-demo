import type { ReactNode } from "react";

import { Pagination } from "@/components/ui/Pagination";
import { UnitCase } from "@/components/ui/UnitCase";
import { useT } from "@/lib/i18n/createDict";
import { usePagination } from "@/lib/usePagination";

import { STRINGS } from "../data/translations";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** "center" centres the header and the cells; "end" right-aligns them (Actions). */
  align?: "start" | "center" | "end";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}) {
  const t = useT(STRINGS);
  const resolvedEmptyMessage = emptyMessage ?? t("dataTableEmptyDefault");
  const pager = usePagination(rows);
  const { pageRows } = pager;

  const [titleColumn, ...detailColumns] = columns;

  return (
    <div>
      {/* Phones: one card per row - the first column as its title, the rest as label / value lines -
       * instead of a table scrolled sideways. From sm the table below. */}
      <ul className="m-0 flex list-none flex-col gap-2 p-0 sm:hidden" data-testid="data-table-cards">
        {pageRows.length === 0 && <li className="px-3 py-5 text-center text-xs text-muted">{resolvedEmptyMessage}</li>}
        {pageRows.map((row) => (
          <li key={rowKey(row)} className="relative rounded-xl border border-line bg-panel p-3 text-xs">
            {titleColumn && <div className="min-w-0 break-words font-semibold">{titleColumn.render(row)}</div>}
            <dl className="m-0 mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              {detailColumns.map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-xs font-semibold uppercase tracking-[0.04em] text-muted"><UnitCase>{c.label}</UnitCase></dt>
                  <dd className="m-0 min-w-0 break-words text-end">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>

      {/* `relative`: an absolutely-positioned sr-only span inside a cell
       * (EmptyStateBadge) escapes this scroller without it, widening the
       * whole page instead of just this table. */}
      <div className="relative hidden overflow-x-auto rounded-xl border border-line sm:block">
        <table className="table-sticky-first w-full border-collapse text-xs">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`whitespace-nowrap border-b border-line bg-[#F4F7F6] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.05em] text-muted ${
                    c.align === "center" ? "text-center" : c.align === "end" ? "text-end" : "text-start"
                  }`}
                >
                  <UnitCase>{c.label}</UnitCase>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-5 text-center text-xs text-muted">
                  {resolvedEmptyMessage}
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line transition-colors last:border-b-0 hover:bg-[#F4F7F6]">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={c.className ?? `px-4 py-3.5 align-middle ${c.align === "center" ? "text-center" : c.align === "end" ? "text-end" : ""}`}
                  >
                    {c.render(row)}
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
    </div>
  );
}
