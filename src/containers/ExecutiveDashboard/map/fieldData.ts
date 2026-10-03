import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type { Geometry } from "ol/geom";
import Point from "ol/geom/Point";

import { getFeatureCount, getFeatures } from "lib/geoProxy";

const FIELD_LAYER = "ADAFSA_MLRegistry:fields";

const DATA_PROJECTION = "EPSG:3857";

const MAX_FEATURES_PER_FETCH = 6000;

const WFS_PARAMS = {
  SERVICE: "WFS",
  VERSION: "1.1.0",
  REQUEST: "GetFeature",
  typeName: FIELD_LAYER,
  outputFormat: "application/json",
  srsName: DATA_PROJECTION,
} as const;

/**
 * Deliberately holds no owner name — same rule, same reasoning as
 * `FarmProperties`: a field that is never read cannot leak by a future edit
 * that renders one property more than intended.
 */
export interface FieldProperties {
  /** Unique per field — `farmUid` below is not (several fields share one
   *  farm's uid), so this is the join key back to a specific field's own
   *  boundary geometry. */
  id: string;
  /** Which farm this field belongs to. */
  farmUid: string;
  productionSystem: string;
}

export interface FieldDataResult {
  /** One feature per field, geometry intact — used to draw boundaries. */
  boundaries: Feature<Geometry>[];
  /** One feature per field, geometry replaced by its centre — used to cluster. */
  centres: Feature<Point>[];
  truncated: { shown: number; total: number } | null;
}

/** The centre of a polygon's bounding box — same stand-in `farmData.ts` uses
 *  for the same reason: cheap enough for a few thousand records fetched once. */
function centreOf(geometry: Geometry): [number, number] | null {
  const extent = geometry.getExtent();
  const cx = (extent[0] + extent[2]) / 2;
  const cy = (extent[1] + extent[3]) / 2;
  return Number.isFinite(cx) && Number.isFinite(cy) ? [cx, cy] : null;
}

function readProperties(raw: Record<string, unknown>): FieldProperties {
  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : "",
    farmUid: typeof raw.farm_uid === "string" ? raw.farm_uid : "",
    productionSystem: typeof raw.production_system === "string" ? raw.production_system : "",
  };
}

export async function fetchFieldData(): Promise<FieldDataResult> {
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
