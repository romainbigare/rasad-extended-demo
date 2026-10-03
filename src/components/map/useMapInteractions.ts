import type Feature from "ol/Feature";
import type OlMap from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import { boundingExtent } from "ol/extent";
import type { Geometry, Point } from "ol/geom";
import type BaseLayer from "ol/layer/Base";
import { useEffect } from "react";

import type { FarmProperties } from "@shared/geo/farmData";
import type { FieldProperties } from "@shared/geo/fieldData";

import type { FeatureLayerPair } from "./useFeatureLayers";
import type { FeatureKind } from "./mapStyles";

export type TooltipState =
  | { x: number; y: number; type: "farm"; props: FarmProperties }
  | { x: number; y: number; type: "field"; props: FieldProperties }
  | { x: number; y: number; type: "group"; kind: FeatureKind; size: number }
  | { x: number; y: number; type: "label"; title: string; subtitle?: string };

type Hit =
  | { type: "group"; kind: FeatureKind; members: Feature<Point>[] }
  | { type: "single"; kind: FeatureKind; feature: Feature<Geometry> };

const FIT_PADDING = [60, 60, 60, 60];

/** The property that identifies one feature within its kind (field `uid` is its farm, not itself). */
const ID_KEY: Record<FeatureKind, "uid" | "id"> = { farm: "uid", field: "id" };

/**
 * Hover tooltip + click-to-zoom across both kinds' layers. One handler over
 * all interactive layers, so the cursor and tooltip never fight between
 * farms and fields.
 *
 * `onFeatureClick`, if given, additionally fires on every single-feature
 * click (not group clicks) with that feature's kind and properties - e.g.
 * the Farm page uses it to select a farm and drive the fields/land-use
 * panels, on top of the zoom this hook always does.
 */
export function useMapInteractions(
  map: OlMap | null,
  pairs: ReadonlyArray<FeatureLayerPair | null>,
  onTooltip: (tooltip: TooltipState | null) => void,
  onFeatureClick?: (kind: FeatureKind, props: FarmProperties | FieldProperties) => void,
) {
  const [first, second] = pairs;

  useEffect(() => {
    if (!map) return;
    const active = [first, second].filter((p): p is FeatureLayerPair => Boolean(p));
    if (!active.length) return;
    const interactive = new Set<BaseLayer>(active.flatMap((p) => [p.boundary, p.cluster]));

    const hitAt = (pixel: number[]): Hit | null => {
      let hit: Hit | null = null;
      map.forEachFeatureAtPixel(
        pixel,
        (feature, layer) => {
          const kind = layer.get("featureKind") as FeatureKind;
          if (layer.get("layerRole") === "cluster") {
            const members = (feature.get("features") as Feature<Point>[]) ?? [];
            hit =
              members.length > 1
                ? { type: "group", kind, members }
                : members[0]
                  ? { type: "single", kind, feature: members[0] as Feature<Geometry> }
                  : null;
          } else {
            hit = { type: "single", kind, feature: feature as Feature<Geometry> };
          }
          return true;
        },
        { layerFilter: (layer) => interactive.has(layer), hitTolerance: 3 },
      );
      return hit;
    };

    const boundaryGeometry = (kind: FeatureKind, id: string): Geometry | undefined => {
      const pair = active.find((p) => p.kind === kind);
      return pair?.boundary
        .getSource()
        ?.getFeatures()
        .find((f) => f.get(ID_KEY[kind]) === id)
        ?.getGeometry();
    };

    // Touch: the first tap on a farm / field / cluster shows its tooltip (there's no hover), a second
    // tap on the same one does what a mouse click does. Mouse behaviour is unchanged.
    let tappedKey: string | null = null;
    const hitKey = (hit: NonNullable<ReturnType<typeof hitAt>>) =>
      hit.type === "group"
        ? `group:${hit.kind}:${hit.members.map((f) => f.getId() ?? f.get(ID_KEY[hit.kind])).join(",")}`
        : `${hit.kind}:${hit.feature.get(ID_KEY[hit.kind])}`;

    const handlePointerMove = (event: MapBrowserEvent<PointerEvent>) => {
      if (event.dragging) return;
      const hit = hitAt(event.pixel);
      const viewport = map.getViewport();
      viewport.style.cursor = hit ? "pointer" : "";
      if (!hit) {
        onTooltip(null);
        return;
      }
      const rect = viewport.getBoundingClientRect();
      const x = event.originalEvent.clientX - rect.left;
      const y = event.originalEvent.clientY - rect.top;
      if (hit.type === "group") {
        onTooltip({ x, y, type: "group", kind: hit.kind, size: hit.members.length });
      } else if (hit.kind === "farm") {
        onTooltip({ x, y, type: "farm", props: hit.feature.getProperties() as FarmProperties });
      } else {
        onTooltip({ x, y, type: "field", props: hit.feature.getProperties() as FieldProperties });
      }
    };

    const handleClick = (event: MapBrowserEvent<PointerEvent>) => {
      if (event.originalEvent.pointerType === "touch") {
        const tapped = hitAt(event.pixel);
        const key = tapped ? hitKey(tapped) : null;
        if (tapped && key !== tappedKey) {
          tappedKey = key;
          handlePointerMove(event);
          return;
        }
        tappedKey = null;
      }
      onTooltip(null);
      const hit = hitAt(event.pixel);
      if (!hit) return;
      const view = map.getView();
      if (hit.type === "group") {
        const extent = boundingExtent(hit.members.map((f) => (f.getGeometry() as Point).getCoordinates()));
        view.fit(extent, { duration: 700, padding: FIT_PADDING, maxZoom: 16 });
        return;
      }
      const id = hit.feature.get(ID_KEY[hit.kind]) as string;
      const shape = boundaryGeometry(hit.kind, id) ?? hit.feature.getGeometry();
      if (shape) view.fit(shape.getExtent(), { duration: 700, padding: FIT_PADDING, maxZoom: 17 });
      onFeatureClick?.(hit.kind, hit.feature.getProperties() as FarmProperties | FieldProperties);
    };

    const handleMoveStart = () => {
      tappedKey = null;
      onTooltip(null);
    };
    const viewportEl = map.getViewport();
    const handleLeave = () => {
      viewportEl.style.cursor = "";
      onTooltip(null);
    };

    map.on("pointermove", handlePointerMove);
    map.on("click", handleClick);
    map.on("movestart", handleMoveStart);
    viewportEl.addEventListener("pointerleave", handleLeave);
    return () => {
      map.un("pointermove", handlePointerMove);
      map.un("click", handleClick);
      map.un("movestart", handleMoveStart);
      viewportEl.removeEventListener("pointerleave", handleLeave);
    };
  }, [map, first, second, onTooltip, onFeatureClick]);
}
