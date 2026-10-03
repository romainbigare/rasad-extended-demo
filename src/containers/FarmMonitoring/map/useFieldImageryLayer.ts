import WKT from "ol/format/WKT";
import ImageLayer from "ol/layer/Image";
import ImageStatic from "ol/source/ImageStatic";
import type OlMap from "ol/Map";
import { useEffect, useMemo } from "react";

const wktFormat = new WKT();

export function useFieldImageryLayer({
  map,
  farmBoundary,
  imageBase64,
  opacity = 1,
}: {
  /** 0-1, from the map toolbar's opacity button. */
  opacity?: number;
  map: OlMap | null;
  farmBoundary: string | null | undefined;
  imageBase64: string | null | undefined;
}) {
  const layer = useMemo(() => new ImageLayer({ zIndex: 800 }), []);

  useEffect(() => {
    layer.setOpacity(opacity);
  }, [layer, opacity]);

  useEffect(() => {
    if (!map) return;
    map.addLayer(layer);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, layer]);

  useEffect(() => {
    if (!farmBoundary || !imageBase64) {
      layer.setSource(undefined);
      layer.setVisible(false);
      return;
    }
    try {
      const geometry = wktFormat.readGeometry(farmBoundary, {
        dataProjection: "EPSG:3857",
        featureProjection: "EPSG:3857",
      });
      layer.setSource(
        new ImageStatic({
          url: `data:image/png;base64,${imageBase64}`,
          imageExtent: geometry.getExtent(),
          projection: "EPSG:3857",
        }),
      );
      layer.setVisible(true);
    } catch {
      layer.setSource(undefined);
      layer.setVisible(false);
    }
  }, [layer, farmBoundary, imageBase64]);

  return layer;
}
