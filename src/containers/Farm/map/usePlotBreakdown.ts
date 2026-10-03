import { useQuery } from "react-query";

import { getFeatures } from "@shared/geo/geoProxy";
import { ensureGeoToken } from "@/lib/geoAuthBridge";

import { QUERY_RETRY } from "./geoRequests";
import { THEMATIC_LAYERS, type ThematicKey } from "./thematicLegend";

export interface BreakdownRow {
  label: string;
  color: string;
}

export interface PlotBreakdown {
  landUse: BreakdownRow[];
  cropType: BreakdownRow[];
  treeType: BreakdownRow[];
}

const SOURCES: Array<{ key: keyof PlotBreakdown; layer: ThematicKey; fields: string[] }> = [
  { key: "landUse", layer: "landUse", fields: ["l1", "l2"] },
  { key: "cropType", layer: "cropType", fields: ["crop_name"] },
  { key: "treeType", layer: "treeType", fields: ["species", "variety_cultivar"] },
];

/** The farm-uid attribute a source's thematic layer carries (thematicLegend.ts's farmIdField). */
const farmIdFieldOf = (layer: ThematicKey) => THEMATIC_LAYERS[layer].farmIdField ?? "uid";

const wfsLayerOf = (layer: ThematicKey) => THEMATIC_LAYERS[layer].wfsLayer ?? THEMATIC_LAYERS[layer].wmsLayer;

/** A farm can have thousands of tree records; cap the breakdown fetch. */
const MAX_RECORDS = 20000;

function formatValue(value: string): string {
  const v = value.trim();
  if (/^ornamental$/i.test(v)) return "Non Agricultural Trees";
  if (v === "Other Trees") return "Forest Trees";
  if (v === "Date Plam") return "Date Palm";
  if (/^date palm$/i.test(v)) return "Date Palm";
  if (/^rhodes grass$/i.test(v)) return "Rhodes Grass";
  if (v.includes("_")) return v.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  return v;
}

/** Top-level legend colour for a level-1 value (grey when unknown). */
function topColor(layer: ThematicKey, value: string): string {
  const v = value.trim().toLowerCase();
  const entry = THEMATIC_LAYERS[layer].entries.find((e) => (e.values ?? [e.name]).some((x) => x.toLowerCase() === v));
  return entry?.color ?? "#888888";
}

/** A record's breadcrumb label, e.g. "Structures › Warehouse › Storage Unit" (null when empty). */
export function recordLabel(key: keyof PlotBreakdown, props: Record<string, unknown>): string | null {
  const src = SOURCES.find((s) => s.key === key);
  if (!src) return null;
  const parts: string[] = [];
  for (const field of src.fields) {
    const raw = props[field];
    if (raw === null || raw === undefined || String(raw).trim() === "") continue;
    const label = formatValue(String(raw));
    if (parts[parts.length - 1] !== label) parts.push(label); // "Barren Land › Barren Land" -> one
  }
  return parts.length ? parts.join(" › ") : null;
}

async function fetchBreakdown(uid: string): Promise<PlotBreakdown> {
  await ensureGeoToken();
  const out: PlotBreakdown = { landUse: [], cropType: [], treeType: [] };
  await Promise.all(
    SOURCES.map(async (src) => {
      const farmIdField = farmIdFieldOf(src.layer);
      const data = await getFeatures({
        SERVICE: "WFS",
        VERSION: "1.1.0",
        REQUEST: "GetFeature",
        typeName: wfsLayerOf(src.layer),
        outputFormat: "application/json",
        propertyName: [farmIdField, ...src.fields].join(","),
        maxFeatures: String(MAX_RECORDS),
        CQL_FILTER: `${farmIdField} = '${uid.replace(/'/g, "''")}'`,
      });
      const seen = new Map<string, BreakdownRow>();
      for (const f of data?.features ?? []) {
        const p = f.properties ?? {};
        const label = recordLabel(src.key, p);
        if (!label) continue;
        if (!seen.has(label)) seen.set(label, { label, color: topColor(src.layer, String(p[src.fields[0]] ?? "")) });
      }
      // Group by top-level legend order, then alphabetically.
      const order = THEMATIC_LAYERS[src.layer].entries.map((e) => e.color);
      out[src.key] = [...seen.values()].sort(
        (a, b) => order.indexOf(a.color) - order.indexOf(b.color) || a.label.localeCompare(b.label),
      );
    }),
  );
  return out;
}

export function usePlotBreakdown(uid: string | null) {
  return useQuery<PlotBreakdown, Error>(["plot-breakdown", uid], () => fetchBreakdown(uid as string), {
    enabled: uid !== null,
    staleTime: Infinity,
    cacheTime: 30 * 60 * 1000,
    ...QUERY_RETRY,
  });
}

/** The tooltip section that belongs to each thematic map layer. */
export const SECTION_FOR_LAYER: Record<ThematicKey, keyof PlotBreakdown> = {
  landUse: "landUse",
  cropType: "cropType",
  treeType: "treeType",
};

async function fetchPartAt(uid: string, x: number, y: number, section: keyof PlotBreakdown): Promise<Set<string>> {
  await ensureGeoToken();
  const labels = new Set<string>();
  await Promise.all(
    SOURCES.filter((src) => src.key === section).map(async (src) => {
      const farmIdField = farmIdFieldOf(src.layer);
      const geometryField = THEMATIC_LAYERS[src.layer].geometryField;
      const box = `BBOX(${geometryField},${(x - 1).toFixed(2)},${(y - 1).toFixed(2)},${(x + 1).toFixed(2)},${(y + 1).toFixed(2)},'EPSG:3857')`;
      const data = await getFeatures({
        SERVICE: "WFS",
        VERSION: "1.1.0",
        REQUEST: "GetFeature",
        typeName: THEMATIC_LAYERS[src.layer].wmsLayer,
        outputFormat: "application/json",
        maxFeatures: "20",
        CQL_FILTER: `${farmIdField} = '${uid.replace(/'/g, "''")}' AND ${box}`,
      });
      for (const f of data?.features ?? []) {
        const label = recordLabel(src.key, f.properties ?? {});
        if (label) labels.add(`${src.key}:${label}`);
      }
    }),
  );
  return labels;
}

export function usePlotPartAt(point: { uid: string; x: number; y: number } | null, section: keyof PlotBreakdown | null) {
  return useQuery<Set<string>, Error>(
    ["plot-part", point?.uid, point?.x, point?.y, section],
    () => fetchPartAt(point!.uid, point!.x, point!.y, section!),
    { enabled: point !== null && section !== null, staleTime: Infinity, ...QUERY_RETRY },
  );
}
