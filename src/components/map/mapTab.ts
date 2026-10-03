import type OlMap from "ol/Map";
import type { ParsedUrlQuery } from "querystring";

export interface MapView {
  /** EPSG:3857 */
  center: [number, number];
  zoom: number;
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
export const num = (v: string | undefined) => (v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** The map's current view, for reopening it in a new tab at the same place. */
export function currentView(map: OlMap | null): MapView | null {
  const view = map?.getView();
  const center = view?.getCenter();
  const zoom = view?.getZoom();
  return center && zoom !== undefined ? { center: [center[0], center[1]], zoom } : null;
}

export function setViewParams(q: URLSearchParams, view: MapView | null) {
  if (!view) return;
  q.set("c", view.center.map((n) => Math.round(n)).join(","));
  q.set("z", view.zoom.toFixed(2));
}

export function viewFromQuery(query: ParsedUrlQuery): MapView | null {
  const c = (one(query.c) ?? "").split(",").map(Number);
  const zoom = num(one(query.z));
  return c.length === 2 && c.every(Number.isFinite) && zoom !== null ? { center: [c[0], c[1]], zoom } : null;
}

/** Opens `path?query` in a new tab (no opener access back to this page). */
export function openMapTab(path: string, q: URLSearchParams) {
  window.open(`${path}?${q.toString()}`, "_blank", "noopener");
}
