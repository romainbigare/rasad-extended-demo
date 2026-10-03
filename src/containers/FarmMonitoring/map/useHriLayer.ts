import type OlMap from "ol/Map";
import { useEffect, useMemo } from "react";

import { createWmsOverlayLayer, HRI_OVERLAY } from "@/components/map/wmsOverlays";

export function useHriLayer(map: OlMap | null, visible: boolean) {
  const layer = useMemo(() => createWmsOverlayLayer(HRI_OVERLAY, 800), []);

  useEffect(() => {
    if (!map) return;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, layer]);

  useEffect(() => {
    layer.setVisible(visible);
  }, [layer, visible]);
}
