import TileLayer from "ol/layer/Tile";
import TileWMS from "ol/source/TileWMS";
import { createXYZ } from "ol/tilegrid";

import { geoProxyTileLoadFunction } from "@shared/geo/geoProxy";

const TILE_GRID_512_3857 = createXYZ({ tileSize: 512 });

const UNUSED_WMS_BASE = "https://geoserver.invalid/wms";

export interface WmsOverlayDef {
  key: string;
  label: string;
  layers: string;
  styles?: string;
  cqlFilter?: string;
}

export const HRI_OVERLAY: WmsOverlayDef = {
  key: "hri",
  label: "HRI Imagery",
  layers: "ADAFSA_FullScope:70-COG-Overlay-27092026",
};

export const THEMATIC_OVERLAYS: readonly WmsOverlayDef[] = [
  { key: "landUse", label: "Land Use", layers: "ADAFSA_MLRegistry:lulc_v1", styles: "lulc_v1_style" },
  { key: "cropType", label: "Crop Type", layers: "ADAFSA_MLRegistry:field_crops_v4", styles: "field_crops_v4_style" },
  { key: "treeType", label: "Tree Type", layers: "ADAFSA_MLRegistry:trees_v7", styles: "trees_v7_style" },
];

export type CultivarVersion = "v1" | "v2" | "v3" | "v4";

export const DATE_PALM_CULTIVAR_OVERLAYS: readonly (WmsOverlayDef & { key: CultivarVersion; color: string })[] = [
  { key: "v1", label: "Date Palm Species V1", layers: "ADAFSA_MLRegistry:trees_v1", color: "#3b82f6" },
  { key: "v2", label: "Date Palm Species V2", layers: "ADAFSA_MLRegistry:trees_v2", color: "#f59e0b" },
  { key: "v3", label: "Date Palm Species V3", layers: "ADAFSA_MLRegistry:trees_v3", color: "#16a34a" },
  { key: "v4", label: "Date Palm Species V4", layers: "ADAFSA_MLRegistry:trees_v4", color: "#9333ea" },
];

/** Params for a GetLegendGraphic request. */
export function legendParams(def: WmsOverlayDef) {
  return {
    SERVICE: "WMS",
    REQUEST: "GetLegendGraphic",
    LAYER: def.layers,
    STYLE: def.styles ?? "",
    FORMAT: "image/png",
  };
}

export function createWmsOverlayLayer(def: WmsOverlayDef, zIndex: number): TileLayer<TileWMS> {
  return new TileLayer({
    source: new TileWMS({
      url: UNUSED_WMS_BASE,
      params: {
        LAYERS: def.layers,
        STYLES: def.styles ?? "",
        TILED: true,
        ...(def.cqlFilter ? { CQL_FILTER: def.cqlFilter } : {}),
      },
      tileGrid: TILE_GRID_512_3857,
      tileLoadFunction: geoProxyTileLoadFunction,
      crossOrigin: "anonymous",
    }),
    visible: false,
    zIndex,
    properties: { overlayKey: def.key },
  });
}
