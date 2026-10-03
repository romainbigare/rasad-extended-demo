import type { FarmServiceField } from "@shared/farm/endpoints";
import Feature from "ol/Feature";
import WKT from "ol/format/WKT";
import type { Geometry } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type OlMap from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { boundaryStyle } from "@/components/map/mapStyles";

const wktFormat = new WKT();

function wktToFeature(
  boundary: string | null | undefined,
  properties: Record<string, unknown> = {},
): Feature<Geometry> | null {
  if (!boundary) return null;
  try {
    const geometry = wktFormat.readGeometry(boundary, {
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857",
    });
    const feature = new Feature({ geometry });
    feature.setProperties(properties);
    return feature;
  } catch {
    return null;
  }
}

export function useFarmBoundaryLayers({
  map,
  farmId,
  farmBoundary,
  fields,
  onSelectField,
  skipFirstFit = false,
  boundaryVisible = true,
}: {
  map: OlMap | null;
  /** Included so the view re-fits when the farm changes even if the new
   * farm's boundary happens to produce the same extent as a coincidence. */
  farmId: number | null;
  farmBoundary: string | null | undefined;
  fields: FarmServiceField[] | undefined;
  onSelectField?: (id: number) => void;
  /** Keep the view the map started at instead of fitting the first farm (the map reopened in a new tab). */
  skipFirstFit?: boolean;
  /** Farm + field outlines shown (the map toolbar's flag button). */
  boundaryVisible?: boolean;
}) {
  const farmLayer = useMemo(
    () => new VectorLayer({ source: new VectorSource(), style: boundaryStyle("farm"), zIndex: 900 }),
    [],
  );
  const fieldsLayer = useMemo(
    () => new VectorLayer({ source: new VectorSource(), style: boundaryStyle("field"), zIndex: 910 }),
    [],
  );

  useEffect(() => {
    farmLayer.setVisible(boundaryVisible);
    fieldsLayer.setVisible(boundaryVisible);
  }, [farmLayer, fieldsLayer, boundaryVisible]);

  useEffect(() => {
    if (!map) return;
    map.addLayer(farmLayer);
    map.addLayer(fieldsLayer);
    return () => {
      map.removeLayer(farmLayer);
      map.removeLayer(fieldsLayer);
    };
  }, [map, farmLayer, fieldsLayer]);

  useEffect(() => {
    const source = farmLayer.getSource();
    source?.clear();
    const feature = wktToFeature(farmBoundary);
    if (feature) source?.addFeature(feature);
  }, [farmLayer, farmBoundary]);

  useEffect(() => {
    const source = fieldsLayer.getSource();
    source?.clear();
    if (!fields) return;
    for (const field of fields) {
      const feature = wktToFeature(field.boundary, { fieldId: field.id, uid: field.uid });
      if (feature) source?.addFeature(feature);
    }
  }, [fieldsLayer, fields]);

  /** Fits the view to the farm's boundary - on farm change, and from the map's ◎ button. */
  const fitToFarm = useCallback(() => {
    if (!map) return;
    const extent = farmLayer.getSource()?.getExtent();
    if (extent && extent.every((n) => Number.isFinite(n)) && extent[0] !== Infinity) {
      // Extra bottom padding: the pass timeline panel overlaps the map's bottom edge.
      map.getView().fit(extent, { padding: [70, 90, 170, 90], maxZoom: 16, duration: 300 });
    }
  }, [map, farmLayer]);

  const firstFitSkipped = useRef(!skipFirstFit);
  useEffect(() => {
    if (!firstFitSkipped.current) {
      // The first real boundary: leave the view the map was opened at; fit on later farm changes.
      if (farmBoundary) firstFitSkipped.current = true;
      return;
    }
    fitToFarm();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fit whenever the farm changes or its boundary finishes loading
  }, [map, farmId, farmBoundary]);

  useEffect(() => {
    if (!map || !onSelectField) return;
    const handleClick = (event: MapBrowserEvent<PointerEvent>) => {
      map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          const id = feature.get("fieldId");
          if (typeof id === "number") onSelectField(id);
          return true;
        },
        { layerFilter: (l) => l === fieldsLayer, hitTolerance: 3 },
      );
    };
    map.on("click", handleClick);
    return () => map.un("click", handleClick);
  }, [map, fieldsLayer, onSelectField]);

  return { farmLayer, fieldsLayer, fitToFarm };
}
