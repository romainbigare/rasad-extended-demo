import type OlMap from "ol/Map";
import { useEffect, useRef } from "react";

import { createWmsOverlayLayer, HRI_OVERLAY } from "@/components/map/wmsOverlays";

export function useWmsOverlays(map: OlMap | null, hriOn: boolean) {
  const hriRef = useRef<ReturnType<typeof createWmsOverlayLayer> | null>(null);

  useEffect(() => {
    if (!map) return;
    const hri = createWmsOverlayLayer(HRI_OVERLAY, 800);
    hriRef.current = hri;
    map.addLayer(hri);
    return () => {
      map.removeLayer(hri);
      hriRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    hriRef.current?.setVisible(hriOn);
  }, [map, hriOn]);
}
