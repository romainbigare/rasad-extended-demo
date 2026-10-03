import { cx } from "@/components/ui/cx";
import { formatInteger } from "@/lib/format";
import { type Dict, useT } from "@/lib/i18n/createDict";

const STRINGS = {
  showing: { en: "Showing {from}–{to} of {total}", ar: "عرض {from}–{to} من {total}" },
  prev: { en: "Prev", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },
  navLabel: { en: "Pagination", ar: "التنقل بين الصفحات" },
  pageLabel: { en: "Page {n}", ar: "الصفحة {n}" },
} satisfies Dict;

/** 1 … 4 5 [6] 7 8 … 20 - first, last, and two either side of the current page. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  const items: (number | "gap")[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    if (i === 0 || i === pageCount - 1 || Math.abs(i - page) <= 2) items.push(i);
    else if (items[items.length - 1] !== "gap") items.push("gap");
  }
  return items;
}

const buttonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2.5 touch:h-11 touch:min-w-11 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The one pager under every table (Reports, Field Parcels, Species & Cultivar).
 * Renders nothing when everything fits on one page. Pair with usePagination.
 */
export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPage,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPage: (page: number) => void;
  className?: string;
}) {
  const t = useT(STRINGS);
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label={t("navLabel")}
      data-testid="pagination"
      className={cx("mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted", className)}
    >
      <span>
        {t("showing")
          .replace("{from}", formatInteger(from))
          .replace("{to}", formatInteger(to))
          .replace("{total}", formatInteger(total))}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={page === 0}
          onClick={() => onPage(page - 1)}
          className={cx(buttonClass, "border-line bg-white text-ink hover:bg-[#F4F7F6]")}
        >
          {/* rtl:-scale-x-100: the arrows point the reading direction's way in Arabic. */}
          <span aria-hidden className="inline-block rtl:-scale-x-100">
            ‹
          </span>
          <span className="ms-1">{t("prev")}</span>
        </button>
        {pageItems(page, pageCount).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} aria-hidden className="px-1">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPage(item)}
              aria-label={t("pageLabel").replace("{n}", String(item + 1))}
              aria-current={item === page ? "page" : undefined}
              className={cx(
                buttonClass,
                item === page ? "border-green-d bg-green-d text-white" : "border-line bg-white text-ink hover:bg-[#F4F7F6]",
              )}
            >
              {formatInteger(item + 1)}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className={cx(buttonClass, "border-line bg-white text-ink hover:bg-[#F4F7F6]")}
        >
          <span className="me-1">{t("next")}</span>
          <span aria-hidden className="inline-block rtl:-scale-x-100">
            ›
          </span>
        </button>
      </div>
    </nav>
  );
}
