import type { FarmServiceField } from "@shared/farm/endpoints";
import { Briefcase, Crosshair, Droplet, Flag, Layers, Maximize2, Minus, Plus } from "lucide-react";
import type OlMap from "ol/Map";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { MapAttribution } from "@/components/map/MapAttribution";
import type { MapView } from "@/components/map/mapTab";
import { useFullscreen } from "@/components/map/useFullscreen";
import { useOlMap } from "@/components/map/useOlMap";
import { cx } from "@/components/ui/cx";
import { Spinner } from "@/components/ui/States";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t as tChrome } from "@/lib/i18n/translations";
import type { FieldImageryLegendEntry } from "@/lib/network/satellite/endpoints";

import { STRINGS } from "../data/translations";
import { ImageryLegend } from "../components/satellite/ImageryLegend";
import { useFarmBoundaryLayers } from "./useFarmBoundaryLayers";
import { useFarmLabel } from "./useFarmLabel";
import { useFieldImageryLayer } from "./useFieldImageryLayer";
import { useHriLayer } from "./useHriLayer";

function ToolButton({
  label,
  onClick,
  on = false,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  on?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "grid h-9 w-9 place-items-center rounded-lg border shadow-lg transition-all disabled:cursor-not-allowed disabled:!bg-[#181f25] touch:h-11 touch:w-11",
        on ? "border-[#22c55e] bg-[#22c55e] text-white" : "border-white/10 bg-[#181f25]/95 text-white hover:bg-black",
      )}
    >
      {children}
    </button>
  );
}

export function FarmBoundaryMap({
  farmId,
  farmBoundary,
  farmLabel = null,
  fields,
  fieldsLoading,
  onSelectField,
  imageryBase64,
  legends,
  legendUnit,
  hriOn = false,
  topLeft,
  className,
  initialView,
  onExpand,
  onMapReady,
  onExport,
}: {
  /** Farm tools & export (the briefcase button) - downloads the farm dossier. */
  onExport?: () => Promise<void>;
  farmId: number | null;
  farmBoundary: string | null | undefined;
  /** Name tag drawn above the farm, e.g. "Farm 101". */
  farmLabel?: string | null;
  fields: FarmServiceField[] | undefined;
  fieldsLoading: boolean;
  onSelectField?: (id: number) => void;
  /** The currently selected scene's `/satellite/field-imagery` PNG (raw
   * base64, no `data:` prefix), or null/undefined when nothing is loaded
   * yet. See useFieldImageryLayer for why this is always the whole farm's
   * raster, never a single field's. */
  imageryBase64?: string | null;
  legends?: FieldImageryLegendEntry[];
  legendUnit?: "hectare" | "acre";
  /** Shows the HRI imagery mosaic under everything else. */
  hriOn?: boolean;
  /** Controls shown in the map's top-left corner (e.g. layer toggles). */
  topLeft?: ReactNode;
  /** Size / spacing of the map frame. */
  className?: string;
  /** Start here (EPSG:3857) instead of fitting the farm - the map reopened in a new tab. */
  initialView?: MapView | null;
  /** When set, the expand button calls this (open in a new tab) instead of browser full screen. */
  onExpand?: () => void;
  /** The map instance, e.g. to read the current view for the new tab. */
  onMapReady?: (map: OlMap | null) => void;
}) {
  const t = useT(STRINGS);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { map, zoomBy, attribution } = useOlMap(containerRef, undefined, initialView);
  const { language } = useLanguage();
  useEffect(() => onMapReady?.(map), [map, onMapReady]);
  const fullscreen = useFullscreen(frameRef);
  const [boundaryOn, setBoundaryOn] = useState(true);
  const [opacity, setOpacity] = useState(0.95);
  const [legendOpen, setLegendOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const hasImagery = Boolean(imageryBase64);
  const hasLegend = Boolean(legends && legends.length > 0);

  const { fitToFarm } = useFarmBoundaryLayers({
    map,
    farmId,
    farmBoundary,
    fields,
    onSelectField,
    skipFirstFit: Boolean(initialView),
    boundaryVisible: boundaryOn,
  });
  useFieldImageryLayer({ map, farmBoundary, imageBase64: imageryBase64, opacity });
  useHriLayer(map, hriOn);
  useFarmLabel(map, labelRef, farmBoundary, farmLabel);

  return (
    <div
      ref={frameRef}
      data-testid="mon-map-canvas"
      className={cx(
        "relative overflow-hidden rounded-xl border border-line bg-[#2f3a33] [container-type:inline-size] [&:fullscreen]:h-screen [&:fullscreen]:rounded-none",
        className ?? "mb-3.5 h-[300px] sm:h-[400px]",
      )}
    >
      <div ref={containerRef} className="absolute inset-0" data-testid="mon-map-ol-canvas" />
      <div>
        <div
          ref={labelRef}
          className={cx(
            "pointer-events-none max-w-[220px] truncate whitespace-nowrap rounded-lg border-2 border-[#7ccf5a] bg-[#1f4d2c] px-3 py-1 text-xs font-bold text-white",
            !(farmLabel && farmBoundary) && "hidden",
          )}
        >
          {farmLabel}
        </div>
      </div>
      <MapAttribution attribution={attribution} />
      <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5" data-testid="mon-map-toolbar">
        <ToolButton label={t("mapToolRecenter")} onClick={fitToFarm} disabled={!farmBoundary}>
          <Crosshair size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label={onExpand ? tChrome("openMapInNewTab", language) : t("mapToolFullscreen")}
          onClick={onExpand ?? fullscreen.toggle}
          disabled={!onExpand && !fullscreen.supported}
          on={!onExpand && fullscreen.isFullscreen}
        >
          <Maximize2 size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton label={t("mapToolZoomIn")} onClick={() => zoomBy(1)}>
          <Plus size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton label={t("mapToolZoomOut")} onClick={() => zoomBy(-1)}>
          <Minus size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton label={t("mapToolBoundary")} onClick={() => setBoundaryOn((v) => !v)} on={boundaryOn} disabled={!farmBoundary}>
          <Flag size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label={t("mapToolOpacity").replace("{pct}", String(Math.round(opacity * 100)))}
          onClick={() => setOpacity((o) => (o >= 0.8 ? 0.35 : Math.round((o + 0.2) * 100) / 100))}
          disabled={!hasImagery}
        >
          <Droplet size={16} strokeWidth={2} />
        </ToolButton>
        <ToolButton
          label={t("mapToolExport")}
          onClick={() => {
            if (!onExport || exporting) return;
            setExporting(true);
            void onExport().finally(() => setExporting(false));
          }}
          disabled={!onExport || exporting}
        >
          {exporting ? <Spinner className="scale-75" /> : <Briefcase size={16} strokeWidth={2} />}
        </ToolButton>
        <ToolButton label={t("mapToolLegend")} onClick={() => setLegendOpen((v) => !v)} on={legendOpen && hasLegend} disabled={!hasLegend}>
          <Layers size={16} strokeWidth={2} />
        </ToolButton>
      </div>
      <div className="absolute left-5 top-5 z-10 flex max-w-[calc(100%-5rem)] flex-col items-start gap-2">
        {topLeft}
        {(fieldsLoading || !farmBoundary) && (
          <div className="flex items-center gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
            <Spinner className="scale-75" /> {t("mapLoadingBoundary")}
          </div>
        )}
        {onSelectField && fields && fields.length > 0 && (
          <div className="hidden rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-muted shadow-[0_1px_3px_rgba(0,0,0,0.15)] sm:block">
            {t("mapClickFieldHint")}
          </div>
        )}
      </div>
      {legends && legends.length > 0 && (
        <ImageryLegend legends={legends} unit={legendUnit ?? "hectare"} open={legendOpen} onOpenChange={setLegendOpen} />
      )}
    </div>
  );
}
