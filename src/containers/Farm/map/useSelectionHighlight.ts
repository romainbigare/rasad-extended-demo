import type OlMap from "ol/Map";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useEffect } from "react";

import { selectedStyle } from "@/components/map/mapStyles";
import type { FeatureLayerPair } from "@/components/map/useFeatureLayers";

/**
 * Draws the selected feature's boundary in a distinct highlight style, on
 * its own layer above everything else. Reads the geometry out of the
 * already-loaded boundary layer's source (whether or not that layer is
 * currently visible - clicking a farm cluster point still resolves to its
 * real boundary this way), so selecting a farm never triggers a second
 * network request.
 */
export function useSelectionHighlight(
  map: OlMap | null,
  layers: FeatureLayerPair | null,
  selectedId: string | null,
  idKey: "uid" | "id",
) {
  useEffect(() => {
    if (!map) return;
    const highlight = new VectorLayer({
      source: new VectorSource(),
      style: selectedStyle(),
      zIndex: 950,
    });
    map.addLayer(highlight);
    return () => {
      map.removeLayer(highlight);
    };
  }, [map]);

  useEffect(() => {
    if (!map || !layers) return;
    const highlight = map
      .getLayers()
      .getArray()
      .find((l): l is VectorLayer<VectorSource> => l instanceof VectorLayer && l.getZIndex() === 950);
    const source = highlight?.getSource();
    if (!source) return;
    source.clear();
    if (!selectedId) return;
    const feature = layers.boundary
      .getSource()
      ?.getFeatures()
      .find((f) => f.get(idKey) === selectedId);
    if (feature) source.addFeature(feature);
  }, [map, layers, selectedId, idKey]);
}
