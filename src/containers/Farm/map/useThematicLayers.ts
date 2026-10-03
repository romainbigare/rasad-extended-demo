import type OlMap from "ol/Map";
import type TileLayer from "ol/layer/Tile";
import type TileWMS from "ol/source/TileWMS";
import { useEffect, useMemo, useRef, useState } from "react";

import { createWmsOverlayLayer } from "@/components/map/wmsOverlays";

import { drawPlan, type ThematicKey, type ThematicNode } from "./thematicLegend";

/** Wait this long after the last tick before re-requesting tiles. */
const DEBOUNCE_MS = 300;
/** Above HRI (800), below the farm/field boundaries (900+). */
const Z_INDEX = 810;

/** Stacking order when several are on. */
export const THEMATIC_ORDER: readonly ThematicKey[] = ["landUse", "cropType", "treeType"];

export interface ThematicLayerState {
  key: ThematicKey;
  /** Ticked legend rows (leaf keys). */
  checked: ReadonlySet<string>;
  /** Open legend rows - drawn split into their children's colours. */
  expanded: ReadonlySet<string>;
}

export function useThematicLayers(map: OlMap | null, layers: readonly ThematicLayerState[]) {
  const layersRef = useRef(new Map<string, TileLayer<TileWMS>>());
  const plans = useMemo(
    () => layers.map((l) => ({ key: l.key, plan: drawPlan(l.key, l.checked, l.expanded) })),
    [layers],
  );

  // Debounce so a burst of clicks makes one set of tile requests.
  const [applied, setApplied] = useState(plans);
  useEffect(() => {
    const id = setTimeout(() => setApplied(plans), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [plans]);

  useEffect(() => {
    if (!map) return;
    const current = layersRef.current;
    const wanted = new Map<string, { wmsLayer: string; style: string; cqlFilter: string; zIndex: number }>();
    for (const { key, plan } of applied) {
      const zIndex = Z_INDEX + THEMATIC_ORDER.indexOf(key);
      for (const r of plan.requests) {
        wanted.set(`${key}::${plan.wmsLayer}::${r.style}`, { wmsLayer: plan.wmsLayer, style: r.style, cqlFilter: r.cqlFilter, zIndex });
      }
    }

    for (const [id, layer] of current) {
      if (!wanted.has(id)) {
        map.removeLayer(layer);
        current.delete(id);
      }
    }
    for (const [id, request] of wanted) {
      const existing = current.get(id);
      if (existing) {
        const params = existing.getSource()?.getParams() ?? {};
        if (params.CQL_FILTER !== request.cqlFilter) existing.getSource()?.updateParams({ CQL_FILTER: request.cqlFilter });
        continue;
      }
      const layer = createWmsOverlayLayer(
        { key: id, label: id, layers: request.wmsLayer, styles: request.style, cqlFilter: request.cqlFilter },
        request.zIndex,
      );
      layer.setVisible(true);
      map.addLayer(layer);
      current.set(id, layer);
    }
  }, [map, applied]);

  // Remove everything when the map goes away.
  useEffect(() => {
    const current = layersRef.current;
    return () => {
      if (map) for (const layer of current.values()) map.removeLayer(layer);
      current.clear();
    };
  }, [map]);

  return useMemo(() => {
    const drawn: Partial<Record<ThematicKey, ThematicNode[]>> = {};
    for (const { key, plan } of plans) drawn[key] = plan.drawn;
    return drawn;
  }, [plans]);
}
