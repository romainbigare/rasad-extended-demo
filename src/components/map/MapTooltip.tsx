import { useRef } from "react";

import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { formatInteger } from "@/lib/format";

import { useInMapPosition } from "./useInMapPosition";
import type { TooltipState } from "./useMapInteractions";

const area = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function Body({ tooltip }: { tooltip: TooltipState }) {
  const { area: toArea, unitLabel } = useAreaUnit();
  if (tooltip.type === "label") {
    return (
      <>
        <b>{tooltip.title}</b>
        {tooltip.subtitle && <div className="text-muted">{tooltip.subtitle}</div>}
      </>
    );
  }
  if (tooltip.type === "group") {
    return (
      <>
        <b>
          {formatInteger(tooltip.size)} {tooltip.kind === "farm" ? "farms" : "fields"}
        </b>
        <div className="text-muted">Click to zoom in</div>
      </>
    );
  }
  if (tooltip.type === "farm") {
    return (
      <>
        <b>Farm {tooltip.props.uid || "—"}</b>
        <div className="text-muted">
          {tooltip.props.areaDunums > 0
            ? `${area.format(toArea({ du: tooltip.props.areaDunums }) ?? 0)} ${unitLabel}`
            : "Area not recorded"}
        </div>
      </>
    );
  }
  return (
    <>
      <b>Field {tooltip.props.id || "—"}</b>
      <div className="text-muted">Farm {tooltip.props.farmUid || "—"}</div>
      {tooltip.props.productionSystem && <div className="text-muted">{tooltip.props.productionSystem}</div>}
    </>
  );
}

export function MapTooltip({ tooltip }: { tooltip: TooltipState }) {
  const ref = useRef<HTMLDivElement>(null);
  const style = useInMapPosition(ref, tooltip.x, tooltip.y);
  return (
    <div
      ref={ref}
      role="tooltip"
      data-testid="map-tooltip"
      className="pointer-events-none absolute z-20 max-w-[min(220px,calc(100%-16px))] rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] leading-snug shadow-[0_6px_20px_rgba(0,0,0,0.12)]"
      style={style}
    >
      <Body tooltip={tooltip} />
    </div>
  );
}
