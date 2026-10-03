import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type { Geometry } from "ol/geom";
import Point from "ol/geom/Point";

import { getFeatureCount, getFeatures } from "lib/geoProxy";

const FARM_LAYER = "ADAFSA_MLRegistry:farms";

const DATA_PROJECTION = "EPSG:3857";

const MAX_FEATURES_PER_FETCH = 5000;

const WFS_PARAMS = {
  SERVICE: "WFS",
  VERSION: "1.1.0",
  REQUEST: "GetFeature",
  typeName: FARM_LAYER,
  outputFormat: "application/json",
  srsName: DATA_PROJECTION,
} as const;

export interface FarmProperties {
  uid: string;
  areaDunums: number;
}

export interface FarmDataResult {
  /** One feature per farm, geometry intact — used to draw boundaries. */
  boundaries: Feature<Geometry>[];
  /** One feature per farm, geometry replaced by its centre — used to cluster. */
  centres: Feature<Point>[];
  truncated: { shown: number; total: number } | null;
}

/** The centre of a polygon's bounding box - a cheap stand-in for its centroid. */
function centreOf(geometry: Geometry): [number, number] | null {
  const extent = geometry.getExtent();
  const cx = (extent[0] + extent[2]) / 2;
  const cy = (extent[1] + extent[3]) / 2;
  return Number.isFinite(cx) && Number.isFinite(cy) ? [cx, cy] : null;
}

/**
 * Reads a farm's three fields the map actually uses, tolerating the field
 * being absent rather than throwing — a farm with a missing area should still
 * draw, just without a figure in its tooltip.
 */
function readProperties(raw: Record<string, unknown>): FarmProperties {
  return {
    uid: typeof raw.uid === "string" ? raw.uid : "",
    areaDunums: Number(raw.area_dunum) || 0,
  };
}

export async function fetchFarmData(): Promise<FarmDataResult> {
  const total = await getFeatureCount(WFS_PARAMS);
  const requestCount = Math.min(total, MAX_FEATURES_PER_FETCH);

  const geojson = await getFeatures({
    ...WFS_PARAMS,
    maxFeatures: requestCount || MAX_FEATURES_PER_FETCH,
  });

  const format = new GeoJSON();
  const features = format.readFeatures(geojson, {
    dataProjection: DATA_PROJECTION,
    featureProjection: DATA_PROJECTION,
  }) as Feature<Geometry>[];

  const boundaries: Feature<Geometry>[] = [];
  const centres: Feature<Point>[] = [];
  for (const feature of features) {
    const geometry = feature.getGeometry();
    if (!geometry) continue;
    const centre = centreOf(geometry);
    if (!centre) continue;

    const properties = readProperties(feature.getProperties());

    const point = new Feature<Point>(new Point(centre));
    point.setProperties(properties);
    centres.push(point);

    // Same geometry, a clean feature — not the one GeoJSON parsed.
    const boundary = new Feature<Geometry>(geometry);
    boundary.setProperties(properties);
    boundaries.push(boundary);
  }

  return {
    boundaries,
    centres,
    truncated:
      total > MAX_FEATURES_PER_FETCH
        ? { shown: MAX_FEATURES_PER_FETCH, total }
        : null,
  };
}
