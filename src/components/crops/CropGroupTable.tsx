import { ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";

import { cx } from "@/components/ui/cx";
import { CROP_GROUPS, type CropGroupId, cropGroup, groupInfo } from "@/lib/crops/groups";
import { formatPercent } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { type Dict, useT } from "@/lib/i18n/createDict";

const STRINGS = {
  group: { en: "Crop group", ar: "مجموعة المحاصيل" },
  share: { en: "Share", ar: "الحصة" },
  expand: { en: "Show crops in {group}", ar: "عرض محاصيل {group}" },
  collapse: { en: "Hide crops in {group}", ar: "إخفاء محاصيل {group}" },
  empty: { en: "No crops for this selection.", ar: "لا توجد محاصيل لهذا الاختيار." },
  loading: { en: "Loading…", ar: "جارٍ التحميل…" },
  error: { en: "Something went wrong on our end. Please check back later.", ar: "حدث خطأ ما من جانبنا. يرجى المحاولة لاحقًا." },
} satisfies Dict;

export interface CropItem {
  name: string;
  value: number;
}

/**
 * Crops grouped (cereals, fodder, open field, date palm, fruit trees, forest trees, other) in a fixed
 * order, one value per group with its share of the total. A group row opens into its crops. Used for
 * "Crops by area" and "Crops by farms", so the value's meaning and format come from the caller.
 */
export function CropGroupTable({
  items,
  valueHeader,
  formatValue,
  shareTotal,
  groupValues,
  shareHeader,
  isLoading = false,
  isError = false,
  testId,
}: {
  items: readonly CropItem[];
  valueHeader: string;
  formatValue: (value: number) => string;
  /** What the shares are a share of: the total over all crops, so a crop selection keeps its real share. Defaults to the sum of `items`. */
  shareTotal?: number;
  /** A value for each group that is not the sum of its crops (distinct farms, where a farm can grow several crops of one group). */
  groupValues?: ReadonlyMap<CropGroupId, number>;
  /** Heading of the share column; "Share" by default. */
  shareHeader?: string;
  isLoading?: boolean;
  isError?: boolean;
  testId?: string;
}) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const [open, setOpen] = useState<ReadonlySet<CropGroupId>>(new Set());

  const { groups, total } = useMemo(() => {
    const sum = shareTotal ?? items.reduce((acc, item) => acc + item.value, 0);
    const built = CROP_GROUPS.map((group) => {
      const crops = items.filter((item) => cropGroup(item.name) === group.id).sort((a, b) => b.value - a.value);
      return { id: group.id, crops, value: groupValues?.get(group.id) ?? crops.reduce((acc, c) => acc + c.value, 0) };
    }).filter((group) => group.crops.length > 0);
    return { groups: built, total: sum };
  }, [items, shareTotal, groupValues]);

  const toggle = (id: CropGroupId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const share = (value: number) => (total > 0 ? (value / total) * 100 : null);
  const bar = (value: number, color: string) => (
    <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-[#eef1f0]">
      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, share(value) ?? 0)}%`, background: color }} />
    </span>
  );

  return (
    <div data-testid={testId}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-xs text-muted">
            <th scope="col" className="border-b border-line py-2 pe-3 text-start font-semibold">
              {t("group")}
            </th>
            <th scope="col" className="border-b border-line px-3 py-2 text-end font-semibold">
              {valueHeader}
            </th>
            <th scope="col" className="w-[34%] border-b border-line py-2 ps-3 text-start font-semibold">
              {shareHeader ?? t("share")}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const info = groupInfo(group.id);
            const expanded = open.has(group.id);
            const label = info[language];
            return (
              <Fragment key={group.id}>
                <tr className="border-b border-line">
                  <td className="py-2.5 pe-3">
                    <button
                      type="button"
                      onClick={() => toggle(group.id)}
                      aria-expanded={expanded}
                      aria-label={(expanded ? t("collapse") : t("expand")).replace("{group}", label)}
                      className="flex items-center gap-2 font-medium"
                    >
                      <ChevronRight size={14} strokeWidth={2} aria-hidden className={cx("flex-none text-muted transition rtl:rotate-180", expanded && "rotate-90 rtl:rotate-90")} />
                      <i aria-hidden className="inline-block h-2.5 w-2.5 flex-none rounded-full" style={{ background: info.color }} />
                      {label}
                      <span className="text-xs font-normal text-muted">({group.crops.length})</span>
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-end font-medium tabular-nums">{formatValue(group.value)}</td>
                  <td className="py-2.5 ps-3">
                    <span className="flex items-center gap-2">
                      <span className="w-12 flex-none text-xs tabular-nums text-muted">{formatPercent(share(group.value))}</span>
                      {bar(group.value, info.color)}
                    </span>
                  </td>
                </tr>
                {expanded &&
                  group.crops.map((crop) => (
                    <tr key={crop.name} className="border-b border-line bg-[#fafbfb] last:border-0">
                      <td className="py-2 pe-3 ps-[38px] text-start">{crop.name}</td>
                      <td className="px-3 py-2 text-end tabular-nums">{formatValue(crop.value)}</td>
                      <td className="py-2 ps-3">
                        <span className="flex items-center gap-2">
                          <span className="w-12 flex-none text-xs tabular-nums text-muted">{formatPercent(share(crop.value))}</span>
                          {bar(crop.value, info.color)}
                        </span>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {isLoading ? (
        <p className="m-0 py-6 text-center text-xs text-muted">{t("loading")}</p>
      ) : isError ? (
        <p role="alert" className="m-0 py-6 text-center text-xs text-red">
          {t("error")}
        </p>
      ) : (
        groups.length === 0 && <p className="m-0 py-6 text-center text-xs text-muted">{t("empty")}</p>
      )}
    </div>
  );
}
