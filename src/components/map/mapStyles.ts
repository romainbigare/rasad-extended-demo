import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";

import { CANVAS_FONT_FAMILY } from "@/lib/fonts";

export type FeatureKind = "farm" | "field";

export const MAP_COLORS: Record<FeatureKind, { stroke: string; fill: string; cluster: string }> = {
  farm: { stroke: "#6ab04c", fill: "rgba(106, 176, 76, 0.14)", cluster: "#a3281c" },
  field: { stroke: "#f2d24b", fill: "rgba(242, 210, 75, 0.16)", cluster: "#3b82c4" },
};

const HALO = "rgba(19, 48, 58, 0.85)";

const boundaryCache = new Map<FeatureKind, Style[]>();

export function boundaryStyle(kind: FeatureKind): Style[] {
  const cached = boundaryCache.get(kind);
  if (cached) return cached;
  const { stroke, fill } = MAP_COLORS[kind];
  const styles = [
    new Style({ stroke: new Stroke({ color: HALO, width: 4 }) }),
    new Style({ stroke: new Stroke({ color: stroke, width: 2 }), fill: new Fill({ color: fill }) }),
  ];
  boundaryCache.set(kind, styles);
  return styles;
}

const clusterCache = new Map<string, Style>();

export function clusterStyle(kind: FeatureKind, size: number): Style {
  const key = `${kind}:${size}`;
  const cached = clusterCache.get(key);
  if (cached) return cached;
  const radius = size > 100 ? 22 : size > 20 ? 18 : size > 5 ? 15 : 11;
  const style = new Style({
    image: new CircleStyle({
      radius,
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
      fill: new Fill({ color: MAP_COLORS[kind].cluster }),
    }),
    text: new Text({
      text: String(size),
      fill: new Fill({ color: "#ffffff" }),
      font: `700 11px ${CANVAS_FONT_FAMILY}`,
    }),
  });
  clusterCache.set(key, style);
  return style;
}

/** One highlighted feature (selection), drawn above everything else. */
const SELECTED_STYLE = new Style({
  stroke: new Stroke({ color: "#1d4ed8", width: 3 }),
  fill: new Fill({ color: "rgba(29, 78, 216, 0.12)" }),
});

export function selectedStyle(): Style {
  return SELECTED_STYLE;
}

export type MapLayerKey = "farmBoundaries" | "fieldBoundaries" | "farmClusters" | "fieldClusters";

export type LayerState = Record<MapLayerKey, boolean>;

export const NO_LAYERS: LayerState = {
  farmBoundaries: false,
  fieldBoundaries: false,
  farmClusters: false,
  fieldClusters: false,
};

/** Opens on farm boundaries: the Farm page is about individual holdings, not
 * emirate-wide density, so outlines (not clusters) are the useful default. */
export const FARM_PAGE_DEFAULT_LAYERS: LayerState = {
  farmBoundaries: true,
  fieldBoundaries: false,
  farmClusters: false,
  fieldClusters: false,
};
