import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FarmProperties } from "@shared/geo/farmData";
import { fetchFarmData } from "@shared/geo/farmData";
import type { FieldProperties } from "@shared/geo/fieldData";
import { fetchFieldData } from "@shared/geo/fieldData";
import { CultivarLegend, CultivarTooltip } from "@/components/map/CultivarMapOverlays";
import { MapAttribution } from "@/components/map/MapAttribution";
import { MapControls } from "@/components/map/MapControls";
import { MapCoordinateChip } from "@/components/map/MapCoordinateChip";
import { MapTooltip } from "@/components/map/MapTooltip";
import type { FeatureKind, LayerState } from "@/components/map/mapStyles";
import { useCultivarLayers } from "@/components/map/useCultivarLayers";
import { useFeatureLayers } from "@/components/map/useFeatureLayers";
import { useFullscreen } from "@/components/map/useFullscreen";
import { type TooltipState, useMapInteractions } from "@/components/map/useMapInteractions";
import { useOlMap } from "@/components/map/useOlMap";
import type { CultivarVersion } from "@/components/map/wmsOverlays";
import { Spinner } from "@/components/ui/States";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t as tChrome } from "@/lib/i18n/translations";

import { STRINGS } from "../data/translations";
import { THEMATIC_LABEL_KEY } from "../data/translations";
import { useSelectedFarmOutline } from "@/components/map/useSelectedFarmOutline";
import { useSelectionHighlight } from "./useSelectionHighlight";
import { ThematicLegendTree } from "../components/ThematicLegendTree";
import { PlotTooltip } from "./PlotTooltip";
import { THEMATIC_LAYERS, type ThematicKey, type ThematicNode, thematicTree } from "./thematicLegend";
import { usePlotMarkers } from "./usePlotMarkers";
import { THEMATIC_ORDER, useThematicLayers } from "./useThematicLayers";
import { useWmsOverlays } from "./useWmsOverlays";

/** Stable empties, so memoised draw plans don't recompute on every render. */
const NO_TICKS: ReadonlySet<string> = new Set();
const NO_NODES: ThematicNode[] = [];

export interface FarmMapHandle {
  fitToHome: () => void;
  fitToSelection: (() => void) | null;
  /** The current view (EPSG:3857), for reopening the map in a new tab at the same place. */
  getView: () => { center: [number, number]; zoom: number } | null;
}

export function FarmMapCanvas({
  layerState,
  hriOn,
  cultivar,
  activeThematics,
  thematicChecked,
  onThematicChange,
  thematicExpanded,
  onThematicExpandedChange,
  selectedFarmUid,
  selectedBoundary,
  selectedLabel,
  onSelectFarm,
  onReady,
  initialView,
  onExpand,
  thematicShares,
}: {
  layerState: LayerState;
  hriOn: boolean;
  cultivar: CultivarVersion | null;
  /** Switched-on thematic layers, in the order they were switched on - the last one drives the plot markers. */
  activeThematics: readonly ThematicKey[];
  /** Ticked legend rows per thematic layer (leaf keys). */
  thematicChecked: Partial<Record<ThematicKey, ReadonlySet<string>>>;
  onThematicChange: (key: ThematicKey, next: Set<string>) => void;
  /** Open legend rows per thematic layer - split into their children's colours. */
  thematicExpanded: Partial<Record<ThematicKey, ReadonlySet<string>>>;
  onThematicExpandedChange: (key: ThematicKey, next: Set<string>) => void;
  selectedFarmUid: string | null;
  /** WKT (EPSG:3857) of the farm picked in the FIELDS panel - outlined and used by Fit To Selection. */
  selectedBoundary: string | null;
  /** Hover tooltip text for that outline, e.g. { title: "Farm 101", subtitle: "40.4 du" }. */
  selectedLabel: { title: string; subtitle?: string } | null;
  onSelectFarm: (uid: string) => void;
  /** Hands the parent fit functions once the map instance exists, for its "Clear All"/"Fit To Selection" buttons. */
  onReady?: (handle: FarmMapHandle) => void;
  /** Start here (EPSG:3857) instead of the emirate fit - the map reopened in a new tab. */
  initialView?: { center: [number, number]; zoom: number } | null;
  /** When set, the expand button calls this (open in a new tab) instead of browser full screen. */
  onExpand?: () => void;
  /** Area share (%) per top-level legend row, per layer - shown next to the class name in its map legend. */
  thematicShares?: Partial<Record<ThematicKey, ReadonlyMap<string, number | null>>>;
}) {
  const t = useT(STRINGS);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  // Always the satellite basemap; HRI is the imagery toggle.
  const { language } = useLanguage();
  const { map, fitToHome, zoomBy, attribution } = useOlMap(containerRef, undefined, initialView);
  const fullscreen = useFullscreen(frameRef);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const farms = useFeatureLayers({
    map,
    kind: "farm",
    fetcher: fetchFarmData,
    showBoundaries: layerState.farmBoundaries,
    showClusters: layerState.farmClusters,
  });
  const fields = useFeatureLayers({
    map,
    kind: "field",
    fetcher: fetchFieldData,
    showBoundaries: layerState.fieldBoundaries,
    showClusters: layerState.fieldClusters,
  });

  useSelectionHighlight(map, farms.layers, selectedFarmUid, "uid");
  const outline = useSelectedFarmOutline(map, selectedBoundary, selectedLabel);
  const fitToSelection = outline.fit;
  useWmsOverlays(map, hriOn);
  const cultivarLayers = useCultivarLayers(map, cultivar);
  const thematicLayers = useMemo(
    () =>
      activeThematics.map((key) => ({
        key,
        checked: thematicChecked[key] ?? NO_TICKS,
        expanded: thematicExpanded[key] ?? NO_TICKS,
      })),
    [activeThematics, thematicChecked, thematicExpanded],
  );
  const drawnByLayer = useThematicLayers(map, thematicLayers);
  // Plot markers (and their hover card) follow the most recently switched-on layer - several
  // layers' markers on the same farms would pile up on top of each other.
  const primaryThematic = activeThematics[activeThematics.length - 1] ?? null;
  const plots = usePlotMarkers(
    map,
    primaryThematic
      ? (THEMATIC_LAYERS[primaryThematic].wfsLayer ?? THEMATIC_LAYERS[primaryThematic].wmsLayer)
      : null,
    primaryThematic ? (THEMATIC_LAYERS[primaryThematic].farmIdField ?? "uid") : "uid",
    // False when the layer only has a geometry-free wfsLayer to query - no real geometry
    // to viewport-filter on (see usePlotMarkers.ts's viewportFilterable param doc).
    primaryThematic ? !THEMATIC_LAYERS[primaryThematic].wfsLayer : true,
    (primaryThematic && drawnByLayer[primaryThematic]) || NO_NODES,
  );
  // Legends in the same fixed order the layers are stacked in.
  const legendLayers = useMemo(
    () => THEMATIC_ORDER.filter((k) => activeThematics.includes(k)).map((key) => ({ key, tree: thematicTree(key) })),
    [activeThematics],
  );

  useEffect(() => {
    if (!map) return;
    const getView = () => {
      const view = map.getView();
      const center = view.getCenter();
      const zoom = view.getZoom();
      return center && zoom !== undefined ? { center: [center[0], center[1]] as [number, number], zoom } : null;
    };
    onReady?.({ fitToHome, fitToSelection, getView });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-expose when the map or the selected farm changes, not on every render
  }, [map, fitToSelection]);

  const handleTooltip = useCallback((next: TooltipState | null) => setTooltip(next), []);
  const handleFeatureClick = useCallback(
    (kind: FeatureKind, props: FarmProperties | FieldProperties) => {
      if (kind === "farm") onSelectFarm((props as FarmProperties).uid);
    },
    [onSelectFarm],
  );
  useMapInteractions(map, [farms.layers, fields.layers], handleTooltip, handleFeatureClick);

  const loading = [
    farms.status === "loading" && t("mapLoadingFarmBoundaries"),
    fields.status === "loading" && t("mapLoadingFieldBoundaries"),
  ].filter(Boolean);

  return (
    <div
      ref={frameRef}
      data-testid="farm-map-canvas"
      className="relative h-full min-h-[520px] overflow-hidden [container-type:inline-size] max-lg:min-h-[min(520px,70svh)] rounded-xl border border-line bg-[#ebe7dc] [&:fullscreen]:h-screen [&:fullscreen]:rounded-none"
    >
      <div ref={containerRef} className="absolute inset-0" data-testid="farm-map-ol-canvas" />
      <MapAttribution attribution={attribution} />
      <MapControls
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFullscreen={onExpand ?? fullscreen.toggle}
        isFullscreen={onExpand ? false : fullscreen.isFullscreen}
        fullscreenSupported={onExpand ? true : fullscreen.supported}
        fullscreenLabel={onExpand ? tChrome("openMapInNewTab", language) : undefined}
      />
      <MapCoordinateChip map={map} className="absolute left-3 top-3 z-10 [@container(max-width:560px)]:hidden" />
      {loading.length > 0 && (
        <div className="absolute left-3 top-14 z-10 flex max-w-[calc(100%-4.5rem)] [@container(max-width:560px)]:top-3 items-center gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
          <Spinner className="scale-75" /> {t("mapLoadingPrefix")} {loading.join(` ${t("mapLoadingJoiner")} `)}…
        </div>
      )}
      {(legendLayers.length > 0 || selectedFarmUid || cultivar) && (
        <div className="absolute bottom-3 right-3 z-10 flex max-h-[70%] flex-col items-end gap-2 [@container(max-width:640px)]:bottom-7 [@container(max-width:640px)]:max-w-[calc(50%-1rem)]">
          {legendLayers.length > 0 && (
            <div
              // Never wider than the map (phones, narrow columns); scrolls on its own when tall.
              className="flex min-h-0 w-[min(290px,calc(100vw-4.5rem))] max-w-full flex-col gap-2 overflow-y-auto"
              data-testid="farm-map-legend"
            >
              {legendLayers.map(({ key, tree }) => (
                <div key={key} className="flex-none rounded-xl bg-white/95 p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
                  <ThematicLegendTree
                    title={t(THEMATIC_LABEL_KEY[key])}
                    layerKey={key}
                    tree={tree}
                    wmsLayer={THEMATIC_LAYERS[key].wmsLayer}
                    checked={thematicChecked[key] ?? NO_TICKS}
                    onChange={(next) => onThematicChange(key, next)}
                    expanded={thematicExpanded[key] ?? NO_TICKS}
                    onExpandedChange={(next) => onThematicExpandedChange(key, next)}
                    shares={thematicShares?.[key]}
                  />
                </div>
              ))}
            </div>
          )}
          <CultivarLegend active={cultivar} embedded />
          {selectedFarmUid && (
            <div className="rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-blue shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
              {t("selectedFarmTemplate").replace("{uid}", selectedFarmUid)}
            </div>
          )}
        </div>
      )}
      {plots.loading && (
        <div className="absolute right-16 top-3 z-10 flex max-w-[calc(100%-8rem)] items-center gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.15)]">
          <Spinner className="scale-75" /> {t("plotMarkersLoading")}
        </div>
      )}
      {plots.hover ? (
        <PlotTooltip hover={plots.hover} activeLayer={primaryThematic} onClose={plots.unpin} />
      ) : tooltip ? (
        <MapTooltip tooltip={tooltip} />
      ) : cultivarLayers.hover ? (
        <CultivarTooltip hover={cultivarLayers.hover} />
      ) : (
        outline.tooltip && <MapTooltip tooltip={outline.tooltip} />
      )}
    </div>
  );
}
