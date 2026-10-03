import type OlMap from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "react-query";

import { getFeatureCount, getFeatureInfo } from "@shared/geo/geoProxy";
import { ensureGeoToken } from "@/lib/geoAuthBridge";

import { type CultivarVersion, createWmsOverlayLayer, DATE_PALM_CULTIVAR_OVERLAYS } from "./wmsOverlays";

/** Above HRI (800) and the Farm page's thematic overlays, below the farm/field boundaries (900+). */
const CULTIVAR_Z_INDEX = 880;
const HOVER_DELAY_MS = 250;
/** Tree points are ~6px; a few pixels of slack around the cursor. */
const HIT_BUFFER_PX = 8;
const TREE_FIELDS = ["tree_name", "species", "variety_cultivar", "canopy_health_index", "farm_id", "last_confirmed_at"];

export interface CultivarTreeProps {
  tree_name: string | null;
  species: string | null;
  variety_cultivar: string | null;
  canopy_health_index: number | null;
  farm_id: number | null;
  last_confirmed_at: string | null;
}

export interface CultivarHover {
  x: number;
  y: number;
  version: CultivarVersion;
  tree: CultivarTreeProps;
}

export function useCultivarLayers(map: OlMap | null, active: CultivarVersion | null) {
  const layersRef = useRef<Map<CultivarVersion, ReturnType<typeof createWmsOverlayLayer>>>(new Map());
  const [hover, setHover] = useState<CultivarHover | null>(null);

  useEffect(() => {
    if (!map) return;
    const layers = layersRef.current;
    DATE_PALM_CULTIVAR_OVERLAYS.forEach((def) => {
      const layer = createWmsOverlayLayer(def, CULTIVAR_Z_INDEX);
      layers.set(def.key, layer);
      map.addLayer(layer);
    });
    return () => {
      layers.forEach((layer) => map.removeLayer(layer));
      layers.clear();
    };
  }, [map]);

  useEffect(() => {
    layersRef.current.forEach((layer, key) => layer.setVisible(key === active));
  }, [map, active]);

  useEffect(() => {
    setHover(null);
    if (!map || !active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Only the latest pointer position's answer is shown.
    let seq = 0;

    const clear = () => {
      clearTimeout(timer);
      seq += 1;
      setHover(null);
    };

    const handleMove = (evt: MapBrowserEvent<PointerEvent>) => {
      clear();
      if (evt.dragging || map.hasFeatureAtPixel(evt.pixel)) return;
      const { pixel, coordinate } = evt;
      const mine = seq;
      timer = setTimeout(async () => {
        const source = layersRef.current.get(active)?.getSource();
        const resolution = map.getView().getResolution();
        const url =
          resolution !== undefined &&
          source?.getFeatureInfoUrl(coordinate, resolution, "EPSG:3857", {
            INFO_FORMAT: "application/json",
            FEATURE_COUNT: 1,
            BUFFER: HIT_BUFFER_PX,
            propertyName: TREE_FIELDS.join(","),
          });
        if (!url) return;
        try {
          await ensureGeoToken();
          const json = await getFeatureInfo(url);
          const tree = json?.features?.[0]?.properties as CultivarTreeProps | undefined;
          if (mine === seq) setHover(tree ? { x: pixel[0], y: pixel[1], version: active, tree } : null);
        } catch {
          // No tooltip when the lookup fails - the layer itself still shows.
        }
      }, HOVER_DELAY_MS);
    };

    // Touch screens have no hover: a tap looks the tree up the same way (mouse clicks unchanged).
    const handleTap = (evt: MapBrowserEvent<PointerEvent>) => {
      if (evt.originalEvent.pointerType === "touch") handleMove(evt);
    };

    const viewport = map.getViewport();
    map.on("pointermove", handleMove);
    map.on("singleclick", handleTap);
    viewport.addEventListener("mouseleave", clear);
    return () => {
      clearTimeout(timer);
      map.un("pointermove", handleMove);
      map.un("singleclick", handleTap);
      viewport.removeEventListener("mouseleave", clear);
    };
  }, [map, active]);

  return { hover };
}

export function useCultivarTreeCount(active: CultivarVersion | null) {
  const def = DATE_PALM_CULTIVAR_OVERLAYS.find((d) => d.key === active);
  return useQuery<number, Error>(
    ["cultivar-tree-count", def?.layers],
    async () => {
      await ensureGeoToken();
      return getFeatureCount({ SERVICE: "WFS", VERSION: "1.1.0", REQUEST: "GetFeature", typeName: def!.layers, resultType: "hits" });
    },
    { enabled: Boolean(def), staleTime: 30 * 60 * 1000, retry: 1 },
  );
}
