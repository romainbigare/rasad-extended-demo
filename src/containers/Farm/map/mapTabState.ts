import type { ParsedUrlQuery } from "querystring";

import type { LayerState } from "@/components/map/mapStyles";
import { type CultivarVersion, DATE_PALM_CULTIVAR_OVERLAYS } from "@/components/map/wmsOverlays";

import { THEMATIC_LAYERS, type ThematicKey } from "./thematicLegend";

/** The Farm map on its own page - where the map's expand button opens it, in a new tab. */
export const FARM_MAP_TAB_PATH = "/farm/map";

/** What the new tab carries over from the Farm page's map, so it opens at the same view. */
export interface FarmMapTabState {
  farmId: number | null;
  zoneId: number | null;
  hriOn: boolean;
  layers: Partial<LayerState>;
  /** Switched-on thematic layers, in the order they were switched on (the last one drives the plot markers). */
  thematics: ThematicKey[];
  cultivar: CultivarVersion | null;
  /** EPSG:3857 */
  center: [number, number] | null;
  zoom: number | null;
}

const LAYER_KEYS: (keyof LayerState)[] = ["farmBoundaries", "fieldBoundaries", "farmClusters", "fieldClusters"];

export function toFarmMapTabQuery(s: FarmMapTabState): string {
  const q = new URLSearchParams();
  if (s.farmId !== null) q.set("farm", String(s.farmId));
  if (s.zoneId !== null) q.set("zone", String(s.zoneId));
  q.set("hri", s.hriOn ? "1" : "0");
  const on = LAYER_KEYS.filter((k) => s.layers[k]);
  if (on.length) q.set("layers", on.join(","));
  if (s.thematics.length) q.set("th", s.thematics.join(","));
  if (s.cultivar) q.set("cv", s.cultivar);
  if (s.center) q.set("c", s.center.map((n) => Math.round(n)).join(","));
  if (s.zoom !== null) q.set("z", s.zoom.toFixed(2));
  return q.toString();
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const num = (v: string | undefined) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** Reads the new tab's query back; anything missing or unknown falls back to the page's defaults. */
export function fromFarmMapTabQuery(query: ParsedUrlQuery): FarmMapTabState {
  const layerList = (one(query.layers) ?? "").split(",");
  const cv = one(query.cv);
  const c = (one(query.c) ?? "").split(",").map(Number);
  return {
    farmId: num(one(query.farm)),
    zoneId: num(one(query.zone)),
    // No "hri" in the link: on, the Farm map's default.
    hriOn: one(query.hri) === undefined ? true : one(query.hri) === "1",
    layers: Object.fromEntries(LAYER_KEYS.map((k) => [k, layerList.includes(k)])) as Partial<LayerState>,
    thematics: (one(query.th) ?? "").split(",").filter((k): k is ThematicKey => k in THEMATIC_LAYERS),
    cultivar: DATE_PALM_CULTIVAR_OVERLAYS.some((d) => d.key === cv) ? (cv as CultivarVersion) : null,
    center: c.length === 2 && c.every(Number.isFinite) ? [c[0], c[1]] : null,
    zoom: num(one(query.z)),
  };
}
