import type Feature from "ol/Feature";
import type OlMap from "ol/Map";
import type { Geometry, Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import Cluster from "ol/source/Cluster";
import VectorSource from "ol/source/Vector";
import { useEffect, useState } from "react";
import { useQuery } from "react-query";

import { ensureGeoToken } from "@/lib/geoAuthBridge";

import { boundaryStyle, clusterStyle, type FeatureKind } from "./mapStyles";

/** Shape shared by shared/geo's fetchFarmData and fetchFieldData. */
export interface GeoFeatureData {
  boundaries: Feature<Geometry>[];
  centres: Feature<Point>[];
  truncated: { shown: number; total: number } | null;
}

export interface FeatureLayerPair {
  kind: FeatureKind;
  boundary: VectorLayer<VectorSource<Geometry>>;
  cluster: VectorLayer<Cluster>;
}

export type LayerLoadStatus = "idle" | "loading" | "ready" | "error";

const CLUSTER_DISTANCE = 40;
const CLUSTER_MIN_DISTANCE = 20;

/**
 * One kind's boundary + cluster layers. Data is fetched once, the first time
 * either layer is switched on, and cached by react-query across remounts AND
 * across pages - Executive View and Farm share the same `["map-features",
 * kind]` query, so visiting one after the other costs no extra request.
 */
export function useFeatureLayers({
  map,
  kind,
  fetcher,
  showBoundaries,
  showClusters,
}: {
  map: OlMap | null;
  kind: FeatureKind;
  fetcher: () => Promise<GeoFeatureData>;
  showBoundaries: boolean;
  showClusters: boolean;
}) {
  const [layers, setLayers] = useState<FeatureLayerPair | null>(null);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (showBoundaries || showClusters) setRequested(true);
  }, [showBoundaries, showClusters]);

  const query = useQuery<GeoFeatureData, Error>(
    ["map-features", kind],
    async () => {
      await ensureGeoToken();
      return fetcher();
    },
    { enabled: requested, staleTime: Infinity, cacheTime: 10 * 60 * 1000 },
  );

  useEffect(() => {
    if (!map) return;
    const zIndex = kind === "farm" ? 910 : 900;
    const boundary = new VectorLayer({
      source: new VectorSource<Geometry>(),
      style: boundaryStyle(kind),
      zIndex,
      visible: false,
      properties: { featureKind: kind, layerRole: "boundary" },
    });
    const cluster = new VectorLayer({
      source: new Cluster({
        distance: CLUSTER_DISTANCE,
        minDistance: CLUSTER_MIN_DISTANCE,
        source: new VectorSource<Point>(),
      }),
      style: (feature) => clusterStyle(kind, (feature.get("features") as Feature[]).length),
      zIndex: zIndex + 50,
      visible: false,
      properties: { featureKind: kind, layerRole: "cluster" },
    });
    map.addLayer(boundary);
    map.addLayer(cluster);
    setLayers({ kind, boundary, cluster });
    return () => {
      map.removeLayer(boundary);
      map.removeLayer(cluster);
      setLayers(null);
    };
  }, [map, kind]);

  useEffect(() => {
    if (!layers || !query.data) return;
    const boundarySource = layers.boundary.getSource();
    const pointSource = layers.cluster.getSource()?.getSource();
    boundarySource?.clear();
    boundarySource?.addFeatures(query.data.boundaries);
    pointSource?.clear();
    pointSource?.addFeatures(query.data.centres);
  }, [layers, query.data]);

  useEffect(() => {
    layers?.boundary.setVisible(showBoundaries);
  }, [layers, showBoundaries]);

  useEffect(() => {
    layers?.cluster.setVisible(showClusters);
  }, [layers, showClusters]);

  let status: LayerLoadStatus = "idle";
  if (requested) status = query.isError ? "error" : query.data ? "ready" : "loading";

  return {
    layers,
    status,
    count: query.data?.boundaries.length,
    truncated: query.data?.truncated ?? null,
    error: query.error,
  };
}
