import WKT from "ol/format/WKT";
import type OlMap from "ol/Map";
import Overlay from "ol/Overlay";
import { getBottomLeft, getTopRight } from "ol/extent";
import { type RefObject, useEffect } from "react";

const wkt = new WKT();

/** Pins the farm's name tag above the top-centre of its boundary. */
export function useFarmLabel(
  map: OlMap | null,
  elementRef: RefObject<HTMLDivElement>,
  boundary: string | null | undefined,
  label: string | null,
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!map || !element || !boundary || !label) return;
    let extent: number[];
    try {
      extent = wkt.readGeometry(boundary, { dataProjection: "EPSG:3857", featureProjection: "EPSG:3857" }).getExtent();
    } catch {
      return;
    }
    const [minX] = getBottomLeft(extent);
    const [maxX, maxY] = getTopRight(extent);
    const overlay = new Overlay({ element, positioning: "bottom-center", offset: [0, -8], stopEvent: false });
    overlay.setPosition([(minX + maxX) / 2, maxY]);
    map.addOverlay(overlay);
    return () => {
      map.removeOverlay(overlay);
    };
  }, [map, elementRef, boundary, label]);
}
