import { useQuery } from "react-query";

import { getFeatureCount, getFeatures } from "@shared/geo/geoProxy";
import { ensureGeoToken } from "@/lib/geoAuthBridge";

import { createLimiter, QUERY_RETRY } from "./geoRequests";
import { conditionFields, recordMatches, THEMATIC_LAYERS, type ThematicKey, type ThematicNode } from "./thematicLegend";

/** Layers whose attributes are downloaded once and counted locally. */
const BULK: ReadonlySet<ThematicKey> = new Set(["cropType"]);
const MAX_RECORDS = 20000;
const perRowLimit = createLimiter(2);

function allNodes(nodes: ThematicNode[]): ThematicNode[] {
  return nodes.flatMap((n) => [n, ...allNodes(n.children)]);
}

/** Counts for every row of a bulk layer, keyed by row key; undefined for per-row layers. */
export function useBulkLegendCounts(key: ThematicKey | null, tree: ThematicNode[]) {
  const bulk = key !== null && BULK.has(key);
  return useQuery<Map<string, number>, Error>(
    ["thematic-counts", key],
    async () => {
      await ensureGeoToken();
      const nodes = allNodes(tree);
      const layer = THEMATIC_LAYERS[key as ThematicKey];
      const data = await getFeatures({
        SERVICE: "WFS",
        VERSION: "1.1.0",
        REQUEST: "GetFeature",
        typeName: layer.wfsLayer ?? layer.wmsLayer,
        outputFormat: "application/json",
        propertyName: conditionFields(nodes).join(","),
        maxFeatures: String(MAX_RECORDS),
      });
      const counts = new Map(nodes.map((n) => [n.key, 0]));
      for (const f of data?.features ?? []) {
        const props = f.properties ?? {};
        for (const n of nodes) if (recordMatches(n, props)) counts.set(n.key, (counts.get(n.key) ?? 0) + 1);
      }
      return counts;
    },
    { enabled: bulk && tree.length > 0, staleTime: 30 * 60 * 1000, ...QUERY_RETRY },
  );
}

/** One row's count, for layers that aren't counted in bulk. */
export function useRowCount(wmsLayer: string, node: ThematicNode, enabled: boolean) {
  return useQuery<number, Error>(
    ["thematic-count", wmsLayer, node.filter],
    () =>
      perRowLimit(async () => {
        await ensureGeoToken();
        return getFeatureCount({
          SERVICE: "WFS",
          VERSION: "1.1.0",
          REQUEST: "GetFeature",
          typeName: wmsLayer,
          resultType: "hits",
          CQL_FILTER: node.filter,
        });
      }),
    { enabled, staleTime: 30 * 60 * 1000, ...QUERY_RETRY },
  );
}
