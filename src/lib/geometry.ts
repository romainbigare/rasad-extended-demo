import { getCenter } from "ol/extent";
import WKT from "ol/format/WKT";
import { toLonLat } from "ol/proj";
import { toStringHDMS } from "ol/coordinate";

export function wktExtentCentroidLonLat(wkt: string | null | undefined): [number, number] | null {
  if (!wkt) return null;
  try {
    const geometry = new WKT().readGeometry(wkt, {
      dataProjection: "EPSG:3857",
      featureProjection: "EPSG:3857",
    });
    const center = getCenter(geometry.getExtent());
    return toLonLat(center, "EPSG:3857") as [number, number];
  } catch {
    return null;
  }
}

/** "23° 54′ 10″ N 54° 16′ 36″ E" from a [lon, lat] pair. */
export function formatDms(lonLat: [number, number]): string {
  return toStringHDMS(lonLat);
}
