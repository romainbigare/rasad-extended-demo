import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { getCenter, getHeight, getWidth, type Extent } from "ol/extent";
import { fromExtent as polygonFromExtent } from "ol/geom/Polygon";
import type { Geometry } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import type OlMap from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import { useEffect, useMemo, useRef, useState } from "react";

import { getFeatures } from "@shared/geo/geoProxy";
import { ensureGeoToken } from "@/lib/geoAuthBridge";

import { withRetry } from "./geoRequests";
import {
  conditionFields,
  recordMatches,
  type ThematicNode,
} from "./thematicLegend";

const FARM_LAYER = "ADAFSA_MLRegistry:farms";
const MAX_CQL_CHARS = 3000;
const BATCH_SIZE = 1;
const MAX_FEATURES_PER_FETCH = 5000;
const TOTAL_FEATURE_BUDGET = 15000;
const MIN_PER_ROW = 500;
const DEBOUNCE_MS = 350;
const Z_INDEX = 890;
/** On-screen size tiers (pixels). */
const TINY_PX = 10;
const SMALL_PX = 50;

const geojson = new GeoJSON();
const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;

const TINY_STROKE = new Stroke({ color: "#ffffff", width: 1.5 });
const tinyFillCache = new Map<string, Fill>();
const smallStyleCache = new Map<string, Style>();
const largeStyleCache = new Map<string, Style>();

function getTinyFill(color: string): Fill {
  let fill = tinyFillCache.get(color);
  if (!fill) {
    fill = new Fill({ color });
    tinyFillCache.set(color, fill);
  }
  return fill;
}

function getSmallStyle(color: string): Style {
  let style = smallStyleCache.get(color);
  if (!style) {
    style = new Style({
      fill: new Fill({ color: hexToRgba(color, 0.55) }),
      stroke: new Stroke({ color, width: 2 }),
    });
    smallStyleCache.set(color, style);
  }
  return style;
}

function getLargeStyle(color: string): Style {
  let style = largeStyleCache.get(color);
  if (!style) {
    style = new Style({
      fill: new Fill({ color: hexToRgba(color, 0.12) }),
      stroke: new Stroke({ color, width: 2.5 }),
    });
    largeStyleCache.set(color, style);
  }
  return style;
}

export interface PlotHover {
  x: number;
  y: number;
  uid: string;
  areaDun: number | null;
  /** Set when the tooltip was pinned by a click - the clicked map point (EPSG:3857). */
  pinnedAt?: [number, number];
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function plotStyle(feature: Feature<Geometry>, resolution: number): Style {
  const color = (feature.get("plotColor") as string) ?? "#ff0000";
  const extent = feature.getGeometry()?.getExtent();
  if (!extent) return new Style({});
  const px = Math.max(getWidth(extent), getHeight(extent)) / resolution;
  if (px < TINY_PX) {
    const half = (TINY_PX * resolution) / 2;
    const [cx, cy] = getCenter(extent);
    return new Style({
      geometry: polygonFromExtent([cx - half, cy - half, cx + half, cy + half]),
      fill: getTinyFill(color),
      stroke: TINY_STROKE,
    });
  }
  if (px < SMALL_PX) return getSmallStyle(color);
  return getLargeStyle(color);
}

/** Rows grouped into batches of at most BATCH_SIZE and MAX_CQL_CHARS of filter. */
function batches(rows: ThematicNode[]): ThematicNode[][] {
  const out: ThematicNode[][] = [];
  let current: ThematicNode[] = [];
  let chars = 0;
  for (const row of rows) {
    const len = row.filter.length + 6;
    if (
      current.length &&
      (current.length >= BATCH_SIZE || chars + len > MAX_CQL_CHARS)
    ) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(row);
    chars += len;
  }
  if (current.length) out.push(current);
  return out;
}

/** uid IN (...) filters, each under MAX_CQL_CHARS. */
function uidFilters(uids: string[]): string[] {
  const out: string[] = [];
  let current: string[] = [];
  let chars = 0;
  for (const uid of uids) {
    const q = quote(uid);
    if (current.length && chars + q.length + 1 > MAX_CQL_CHARS) {
      out.push(`uid IN (${current.join(",")})`);
      current = [];
      chars = 0;
    }
    current.push(q);
    chars += q.length + 1;
  }
  if (current.length) out.push(`uid IN (${current.join(",")})`);
  return out;
}

export function usePlotMarkers(
  map: OlMap | null,
  wmsLayer: string | null,
  farmIdField: string,
  viewportFilterable: boolean,
  drawn: ThematicNode[],
) {
  const layer = useMemo(
    () =>
      new VectorLayer({
        source: new VectorSource(),
        style: (f, r) => plotStyle(f as Feature<Geometry>, r),
        zIndex: Z_INDEX,
      }),
    [],
  );
  /** Farm boundaries don't change - keep them for the session. */
  const boundaries = useRef(
    new Map<string, { geometry: Geometry | null; areaDun: number | null }>(),
  );
  const syncId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const [moveTick, setMoveTick] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<PlotHover | null>(null);
  const pinnedRef = useRef(false);
  const unpin = () => {
    pinnedRef.current = false;
    setHover(null);
  };

  const signature = `${wmsLayer}|${farmIdField}|${drawn.map((n) => `${n.key}:${n.color}`).join("|")}`;

  useEffect(() => {
    if (!map) return;
    map.addLayer(layer);
    const onMoveEnd = () => {
      setMoveTick((n) => n + 1);
      // A pinned tooltip's position no longer matches the map once it moves.
      if (pinnedRef.current) {
        pinnedRef.current = false;
        setHover(null);
      }
    };
    map.on("moveend", onMoveEnd);
    return () => {
      map.un("moveend", onMoveEnd);
      map.removeLayer(layer);
    };
  }, [map, layer]);

  // Re-sync after ticks change or the view moves (debounced).
  useEffect(() => {
    if (!map) return;
    const source = layer.getSource();
    if (!wmsLayer || drawn.length === 0) {
      syncId.current += 1;
      source?.clear();
      setLoading(false);
      return;
    }
    const id = setTimeout(() => void sync(), DEBOUNCE_MS);
    return () => {
      clearTimeout(id);
      abortRef.current?.abort();
    };

    async function sync() {
      const mine = ++syncId.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        await ensureGeoToken();
        const extent = map!.getView().calculateExtent(map!.getSize());
        // Only usable against a geometry-bearing layer - the geometry-free `_attrs`
        // layers this hook also targets (see the viewportFilterable param doc) have
        // no geometry column at all. Omitted, results fall back to the maxFeatures/
        // budget caps below without viewport scoping.
        const bbox = viewportFilterable
          ? `BBOX(geom,${extent.map((v) => v.toFixed(1)).join(",")},'EPSG:3857')`
          : null;
        const rows = drawn.map((node, rank) => ({ node, rank }));
        const perRow = Math.max(
          MIN_PER_ROW,
          Math.min(
            MAX_FEATURES_PER_FETCH,
            Math.floor(TOTAL_FEATURE_BUDGET / rows.length),
          ),
        );

        // farm uid -> the best-ranked matching row, and the extent of its matched records (fallback shape)
        const farms = new Map<
          string,
          { rank: number; color: string; extent: Extent }
        >();

        const requestedUids = new Set<string>();
        const boundaryFetches: Promise<void>[] = [];
        function fetchBoundaries(uids: string[]) {
          const toFetch = uids.filter(
            (uid) => !boundaries.current.has(uid) && !requestedUids.has(uid),
          );
          if (!toFetch.length) return;
          for (const uid of toFetch) requestedUids.add(uid);
          for (const filter of uidFilters(toFetch)) {
            boundaryFetches.push(
              (async () => {
                const data = await withRetry(() =>
                  getFeatures(
                    {
                      SERVICE: "WFS",
                      VERSION: "1.1.0",
                      REQUEST: "GetFeature",
                      typeName: FARM_LAYER,
                      outputFormat: "application/json",
                      srsName: "EPSG:3857",
                      propertyName: "uid,area_dunum,boundary",
                      CQL_FILTER: filter,
                    },
                    controller.signal,
                  ),
                );
                for (const f of data?.features ?? []) {
                  const uid = String(f.properties?.uid ?? "").trim();
                  if (!uid) continue;
                  const geometry = f.geometry
                    ? (geojson.readGeometry(f.geometry) as Geometry)
                    : null;
                  const area = Number(f.properties?.area_dunum);
                  boundaries.current.set(uid, {
                    geometry,
                    areaDun: Number.isFinite(area) ? area : null,
                  });
                }
              })(),
            );
          }
        }

        await Promise.allSettled(
          batches(drawn).map(async (batch) => {
            const data = await withRetry(() =>
              getFeatures(
                {
                  SERVICE: "WFS",
                  VERSION: "1.1.0",
                  REQUEST: "GetFeature",
                  typeName: wmsLayer!,
                  outputFormat: "application/json",
                  srsName: "EPSG:3857",
                  propertyName: [farmIdField, ...conditionFields(batch)].join(","),
                  maxFeatures: String(perRow * batch.length),
                  CQL_FILTER: bbox
                    ? `(${batch.map((n) => n.filter).join(") OR (")}) AND ${bbox}`
                    : `(${batch.map((n) => n.filter).join(") OR (")})`,
                },
                controller.signal,
              ),
            );
            const rowUids: string[] = [];
            for (const f of data?.features ?? []) {
              const props = f.properties ?? {};
              const uid = String(props[farmIdField] ?? "").trim();
              if (!uid) continue;
              const best = rows
                .filter(
                  (r) => batch.includes(r.node) && recordMatches(r.node, props),
                )
                .pop();
              if (!best) continue;
              rowUids.push(uid);
              const prev = farms.get(uid);
              const fExtent: Extent | undefined = f.bbox;
              const merged: Extent = prev
                ? fExtent
                  ? [
                      Math.min(prev.extent[0], fExtent[0]),
                      Math.min(prev.extent[1], fExtent[1]),
                      Math.max(prev.extent[2], fExtent[2]),
                      Math.max(prev.extent[3], fExtent[3]),
                    ]
                  : prev.extent
                : (fExtent ?? extent);
              if (!prev || best.rank > prev.rank)
                farms.set(uid, {
                  rank: best.rank,
                  color: best.node.color,
                  extent: merged,
                });
              else farms.set(uid, { ...prev, extent: merged });
            }
            // Fired as soon as this row's own data is in - doesn't wait for sibling
            // rows' fetches, which may still be in flight.
            fetchBoundaries(rowUids);
          }),
        );
        if (mine !== syncId.current) return;

        await Promise.allSettled(boundaryFetches);
        for (const uid of farms.keys())
          if (!boundaries.current.has(uid))
            boundaries.current.set(uid, { geometry: null, areaDun: null });
        if (mine !== syncId.current) return;

        const features = [...farms.entries()].map(([uid, farm]) => {
          const b = boundaries.current.get(uid);
          const feature = new Feature<Geometry>({
            geometry: b?.geometry ?? polygonFromExtent(farm.extent),
          });
          feature.setProperties({
            plotUid: uid,
            plotColor: farm.color,
            plotAreaDun: b?.areaDun ?? null,
          });
          return feature;
        });
        source?.clear();
        source?.addFeatures(features);
      } finally {
        if (mine === syncId.current) setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures the drawn rows
  }, [map, layer, signature, moveTick]);

  // Hover (tooltip), and click: zoom to a small farm, or - once it's big
  // enough to see its parts - pin the tooltip and identify the clicked part.
  useEffect(() => {
    if (!map) return;
    const markerAt = (pixel: number[]) =>
      map.forEachFeatureAtPixel(pixel, (f) => f as Feature<Geometry>, {
        layerFilter: (l) => l === layer,
        hitTolerance: 2,
      });
    const onMove = (e: MapBrowserEvent<PointerEvent>) => {
      if (e.dragging || pinnedRef.current) return;
      const f = markerAt(e.pixel);
      if (!f) {
        setHover(null);
        return;
      }
      const rect = map.getViewport().getBoundingClientRect();
      setHover({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        uid: f.get("plotUid"),
        areaDun: f.get("plotAreaDun"),
      });
    };
    const onClick = (e: MapBrowserEvent<PointerEvent>) => {
      const f = markerAt(e.pixel);
      const geometry = f?.getGeometry();
      if (!f || !geometry) {
        pinnedRef.current = false;
        setHover(null);
        return;
      }
      const extent = geometry.getExtent();
      const px =
        Math.max(getWidth(extent), getHeight(extent)) /
        (map.getView().getResolution() ?? 1);
      if (px < SMALL_PX) {
        pinnedRef.current = false;
        map
          .getView()
          .fit(extent, {
            padding: [80, 80, 80, 80],
            duration: 1000,
            maxZoom: 18,
          });
        return;
      }
      const rect = map.getViewport().getBoundingClientRect();
      pinnedRef.current = true;
      setHover({
        x: e.originalEvent.clientX - rect.left,
        y: e.originalEvent.clientY - rect.top,
        uid: f.get("plotUid"),
        areaDun: f.get("plotAreaDun"),
        pinnedAt: [e.coordinate[0], e.coordinate[1]],
      });
    };
    const onLeave = () => {
      if (!pinnedRef.current) setHover(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pinnedRef.current) {
        pinnedRef.current = false;
        setHover(null);
      }
    };
    document.addEventListener("keydown", onKey);
    map.on("pointermove", onMove);
    map.on("singleclick", onClick);
    const viewport = map.getViewport();
    viewport.addEventListener("pointerleave", onLeave);
    return () => {
      map.un("pointermove", onMove);
      map.un("singleclick", onClick);
      viewport.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("keydown", onKey);
    };
  }, [map, layer]);

  return { hover, loading, unpin };
}
