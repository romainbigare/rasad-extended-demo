import { Fragment, useRef } from "react";

import { cx } from "@/components/ui/cx";
import { formatInteger } from "@/lib/format";
import { type Dict, useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { type CultivarHover, useCultivarTreeCount } from "./useCultivarLayers";
import { useInMapPosition } from "./useInMapPosition";
import { type CultivarVersion, DATE_PALM_CULTIVAR_OVERLAYS } from "./wmsOverlays";

const STRINGS = {
  legendTitle: { en: "Date palm species", ar: "أنواع نخيل التمر" },
  legendRow: { en: "Date palm tree · model {v}", ar: "نخلة تمر · النموذج {v}" },
  legendCount: { en: "{n} trees", ar: "{n} شجرة" },
  legendHint: { en: "Hover a tree for details", ar: "مرّر المؤشر على شجرة للتفاصيل" },
  legendHintTouch: { en: "Tap a tree for details", ar: "المس شجرة لعرض التفاصيل" },
  tooltipTitle: { en: "Date palm tree", ar: "نخلة تمر" },
  unknownValue: { en: "Not identified", ar: "غير محدد" },
  modelChip: { en: "Model {v}", ar: "النموذج {v}" },
  cultivarLabel: { en: "Species", ar: "النوع" },
  speciesLabel: { en: "Tree type", ar: "نوع الشجرة" },
  treeIdLabel: { en: "Tree ID", ar: "معرّف الشجرة" },
  farmLabel: { en: "Farm ID", ar: "معرّف المزرعة" },
  canopyHealthLabel: { en: "Canopy Health Index", ar: "مؤشر صحة المظلة الشجرية" },
  confirmedLabel: { en: "Last confirmed", ar: "آخر تأكيد" },
} satisfies Dict;

const colorOf = (v: CultivarVersion) => DATE_PALM_CULTIVAR_OVERLAYS.find((d) => d.key === v)?.color;

/** Bottom-right legend while a cultivar version is on: its colour, and how many trees it has.
 * `embedded`: placed by the parent (e.g. stacked with another bottom-right chip) instead of pinning itself. */
export function CultivarLegend({ active, embedded = false }: { active: CultivarVersion | null; embedded?: boolean }) {
  const t = useT(STRINGS);
  const count = useCultivarTreeCount(active);
  if (!active) return null;
  const v = active.toUpperCase();
  return (
    <div
      data-testid="cultivar-legend"
      className={cx(
        "rounded-lg bg-white/95 px-2.5 py-2 text-[11px] shadow-[0_1px_3px_rgba(0,0,0,0.15)]",
        // Narrow maps: above the Google credit line, at most half the map wide.
        !embedded &&
          "absolute bottom-3 right-3 z-10 [@container(max-width:640px)]:bottom-7 [@container(max-width:640px)]:max-w-[calc(50%-1rem)]",
      )}
    >
      <div className="mb-1 font-semibold text-muted">{t("legendTitle")}</div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 flex-none rounded-full border border-white shadow-[0_0_0_1px_rgba(19,48,58,0.25)]"
          style={{ background: colorOf(active) }}
        />
        <span>{t("legendRow").replace("{v}", v)}</span>
        {count.data !== undefined && (
          <b className="ms-auto ps-2">{t("legendCount").replace("{n}", formatInteger(count.data))}</b>
        )}
      </div>
      <div className="mt-1 text-muted">
        <span className="touch:hidden">{t("legendHint")}</span>
        <span className="hidden touch:inline">{t("legendHintTouch")}</span>
      </div>
    </div>
  );
}

/** Hover card for one tree point: cultivar, species, tree id, farm, canopy health and last confirmation. */
export function CultivarTooltip({ hover }: { hover: CultivarHover }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const { tree, version } = hover;
  const confirmed = tree.last_confirmed_at
    ? new Date(tree.last_confirmed_at).toLocaleDateString(language === "ar" ? "ar-AE" : "en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;
  // Label / value pairs; a field the model left empty shows "Not identified" (cultivar) or is skipped.
  const rows: [string, string][] = [
    [t("cultivarLabel"), tree.variety_cultivar || t("unknownValue")],
    ...(tree.species ? [[t("speciesLabel"), tree.species] as [string, string]] : []),
    ...(tree.tree_name ? [[t("treeIdLabel"), tree.tree_name] as [string, string]] : []),
    ...(tree.farm_id !== null ? [[t("farmLabel"), String(tree.farm_id)] as [string, string]] : []),
    ...(tree.canopy_health_index !== null
      ? [[t("canopyHealthLabel"), Math.round(Number(tree.canopy_health_index)).toString()] as [string, string]]
      : []),
    ...(confirmed ? [[t("confirmedLabel"), confirmed] as [string, string]] : []),
  ];
  const ref = useRef<HTMLDivElement>(null);
  const style = useInMapPosition(ref, hover.x, hover.y);
  return (
    <div
      ref={ref}
      role="tooltip"
      data-testid="cultivar-tooltip"
      className="pointer-events-none absolute z-20 w-[min(210px,calc(100%-16px))] rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] leading-snug shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
      style={style}
    >
      <div className="flex items-center justify-between gap-2">
        <b className="text-xs">{t("tooltipTitle")}</b>
        <span className="flex flex-none items-center gap-1 rounded-md bg-[#eef1f0] px-1.5 py-0.5 font-bold text-muted">
          <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: colorOf(version) }} />
          {t("modelChip").replace("{v}", version.toUpperCase())}
        </span>
      </div>
      <dl className="m-0 mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-t border-line pt-1.5">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-muted">{label}</dt>
            <dd className="m-0 text-end font-semibold">{value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}
