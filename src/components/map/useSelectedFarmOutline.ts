import Feature from "ol/Feature";
import WKT from "ol/format/WKT";
import VectorLayer from "ol/layer/Vector";
import type OlMap from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { TooltipState } from "@/components/map/useMapInteractions";

const wktFormat = new WKT();

const OUTLINE_STYLE = new Style({ stroke: new Stroke({ color: "#2f7d32", width: 3, lineDash: [8, 6] }) });

export function useSelectedFarmOutline(
  map: OlMap | null,
  boundaryWkt: string | null | undefined,
  label: { title: string; subtitle?: string } | null,
) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const layer = useMemo(() => new VectorLayer({ source: new VectorSource(), style: OUTLINE_STYLE, zIndex: 960 }), []);

  useEffect(() => {
    if (!map) return;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, layer]);

  const geometry = useMemo(() => {
    if (!boundaryWkt) return null;
    try {
      return wktFormat.readGeometry(boundaryWkt, { dataProjection: "EPSG:3857", featureProjection: "EPSG:3857" });
    } catch {
      return null;
    }
  }, [boundaryWkt]);

  useEffect(() => {
    const source = layer.getSource();
    source?.clear();
    if (geometry) source?.addFeature(new Feature({ geometry }));
  }, [layer, geometry]);

  // Hover: show the farm's name and area while the pointer is over its outline or inside it.
  useEffect(() => {
    if (!map || !geometry || !label) {
      setTooltip(null);
      return;
    }
    const onMove = (event: MapBrowserEvent<PointerEvent>) => {
      if (event.dragging) return;
      if (!geometry.intersectsCoordinate(event.coordinate)) {
        setTooltip(null);
        return;
      }
      const rect = map.getViewport().getBoundingClientRect();
      setTooltip({
        x: event.originalEvent.clientX - rect.left,
        y: event.originalEvent.clientY - rect.top,
        type: "label",
        title: label.title,
        subtitle: label.subtitle,
      });
    };
    const onLeave = () => setTooltip(null);
    map.on("pointermove", onMove);
    const viewport = map.getViewport();
    viewport.addEventListener("pointerleave", onLeave);
    return () => {
      map.un("pointermove", onMove);
      viewport.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- label's text drives it, not its object identity
  }, [map, geometry, label?.title, label?.subtitle]);

  const fit = useCallback(() => {
    if (map && geometry) map.getView().fit(geometry.getExtent(), { duration: 300, padding: [60, 60, 60, 60], maxZoom: 17 });
  }, [map, geometry]);

  return { fit: geometry ? fit : null, tooltip };
}
