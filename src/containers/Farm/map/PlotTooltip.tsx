import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cx } from "@/components/ui/cx";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import type { ThematicKey } from "./thematicLegend";
import { type BreakdownRow, type PlotBreakdown, SECTION_FOR_LAYER, usePlotBreakdown, usePlotPartAt } from "./usePlotBreakdown";
import type { PlotHover } from "./usePlotMarkers";

const areaFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const OFFSET = 16;

function Section({
  sectionKey,
  title,
  rows,
  highlighted,
}: {
  sectionKey: keyof PlotBreakdown;
  title: string;
  rows: BreakdownRow[];
  highlighted: ReadonlySet<string> | undefined;
}) {
  if (!rows.length) return null;
  return (
    <div className="border-t border-line pt-2">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{title}</div>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {rows.map((r) => {
          const on = highlighted?.has(`${sectionKey}:${r.label}`) ?? false;
          return (
            <li
              key={r.label}
              data-highlighted={on || undefined}
              className={cx(
                "flex items-start gap-2 rounded-md border px-1.5 py-0.5",
                on ? "border-[#6D9300] bg-[#f0f5e0]" : "border-transparent",
              )}
            >
              <i aria-hidden className="mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full" style={{ background: r.color }} />
              <span>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PlotTooltip({
  hover,
  activeLayer,
  onClose,
}: {
  hover: PlotHover;
  /** The thematic layer on the map - only its section's rows get highlighted. */
  activeLayer: ThematicKey | null;
  onClose: () => void;
}) {
  const t = useT(STRINGS);
  const { area, unitWord } = useAreaUnit();
  const breakdown = usePlotBreakdown(hover.uid);
  const pinned = Boolean(hover.pinnedAt);
  const part = usePlotPartAt(
    hover.pinnedAt ? { uid: hover.uid, x: hover.pinnedAt[0], y: hover.pinnedAt[1] } : null,
    activeLayer ? (SECTION_FOR_LAYER[activeLayer] ?? null) : null,
  );
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: hover.x + OFFSET, top: hover.y + OFFSET });

  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = hover.x + OFFSET + w > parent.clientWidth ? Math.max(8, hover.x - OFFSET - w) : hover.x + OFFSET;
    const top = hover.y + OFFSET + h > parent.clientHeight ? Math.max(8, hover.y - OFFSET - h) : hover.y + OFFSET;
    // Small maps: keep the whole card - and its close button - inside the map.
    const clamp = (v: number, size: number, room: number) => Math.max(8, Math.min(v, room - size - 8));
    setPos({ left: clamp(left, w, parent.clientWidth), top: clamp(top, h, parent.clientHeight) });
  }, [hover.x, hover.y, breakdown.data]);

  // Bring the clicked part's row into view.
  useEffect(() => {
    if (!part.data?.size) return;
    listRef.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [part.data, breakdown.data]);

  const d = breakdown.data;
  const empty = d && !d.landUse.length && !d.cropType.length && !d.treeType.length;

  return (
    <div
      ref={ref}
      role={pinned ? "dialog" : "tooltip"}
      aria-label={t("plotTooltipFarmTemplate").replace("{uid}", hover.uid)}
      data-testid="plot-tooltip"
      className={cx(
        // Capped to the map on small screens; 340 x 380 wherever the map is big enough (desktop).
        "absolute z-30 flex max-h-[min(380px,calc(100%-16px))] w-[min(340px,calc(100%-16px))] flex-col rounded-xl border border-line bg-white text-xs leading-snug shadow-[0_8px_24px_rgba(0,0,0,0.16)]",
        pinned ? "pointer-events-auto" : "pointer-events-none",
      )}
      style={pos}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <b className="text-xs">{t("plotTooltipFarmTemplate").replace("{uid}", hover.uid)}</b>
        {pinned && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("plotTooltipClose")}
            className="grid h-6 w-6 flex-none place-items-center rounded-md text-xs text-muted hover:bg-[#eef1f0] hover:text-ink touch:h-10 touch:w-10"
          >
            ×
          </button>
        )}
      </div>
      <div ref={listRef} className={cx("mt-2 flex flex-col gap-2 px-3", pinned ? "overflow-y-auto" : "overflow-hidden")}>
        {breakdown.isLoading && <div className="text-muted">{t("plotTooltipLoading")}</div>}
        {breakdown.isError && <div className="text-muted">{t("plotTooltipError")}</div>}
        {empty && <div className="text-muted">{t("plotTooltipEmpty")}</div>}
        {d && (
          <>
            <Section sectionKey="landUse" title={t("thematicLabelLandUse")} rows={d.landUse} highlighted={part.data} />
            <Section sectionKey="cropType" title={t("thematicLabelCropType")} rows={d.cropType} highlighted={part.data} />
            <Section sectionKey="treeType" title={t("thematicLabelTreeType")} rows={d.treeType} highlighted={part.data} />
          </>
        )}
      </div>
      <div className="mt-2 flex justify-between border-t border-line px-3 pb-3 pt-2">
        <span className="text-muted">{t("plotTooltipArea")}</span>
        <b>{hover.areaDun === null ? "—" : `${areaFmt.format(area({ du: hover.areaDun }) ?? 0)} ${unitWord}`}</b>
      </div>
    </div>
  );
}
