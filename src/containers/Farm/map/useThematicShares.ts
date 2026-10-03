import { useMemo } from "react";

import { useCropSummary, useTreeSummary } from "@/lib/analytics/hooks";
import type { TreeSummary } from "@/lib/analytics/types";
import type { FarmMonitoringField } from "@/lib/farm/types";

import { type ThematicKey, type ThematicNode, thematicTree } from "./thematicLegend";

/** The tree layer's top-level rows and the trees API field each one counts. */
const TREE_FIELD: Record<string, keyof Pick<TreeSummary, "date_palm" | "native_forest" | "fruit" | "olive">> = {
  "Date Palm": "date_palm",
  "Forest Trees": "native_forest",
  "Individual Fruit Trees": "fruit",
  "Olive Trees": "olive",
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Every name a row answers to: its own name and GIS values, and all its descendants'. */
function namesOf(node: ThematicNode): string[] {
  const last = node.conditions[node.conditions.length - 1];
  return [node.name, ...(last?.values ?? []), ...node.children.flatMap(namesOf)].map(norm);
}

/**
 * Shares of the API's items (by area) per top-level legend row, matching an item
 * to the row whose name, or any sub-row's name, equals it. Unmatched items go to
 * `fallbackKey`'s row (or are left out when there is none).
 */
function shareByRow(nodes: ThematicNode[], items: Array<{ name: string; value: number }>, fallbackKey?: string) {
  const lookup = nodes.map((n) => ({ key: n.key, names: new Set(namesOf(n)) }));
  const sums: Record<string, number> = {};
  let total = 0;
  for (const item of items) {
    total += item.value;
    const key = lookup.find((l) => l.names.has(norm(item.name)))?.key ?? fallbackKey;
    if (key) sums[key] = (sums[key] ?? 0) + item.value;
  }
  return (key: string) => (total > 0 ? ((sums[key] ?? 0) / total) * 100 : null);
}

export function useThematicShares(
  layers: readonly ThematicKey[],
  fields: FarmMonitoringField[] | undefined,
): Partial<Record<ThematicKey, ReadonlyMap<string, number | null>>> {
  const crops = useCropSummary("farm");
  const trees = useTreeSummary();

  return useMemo(() => {
    const out: Partial<Record<ThematicKey, ReadonlyMap<string, number | null>>> = {};
    for (const layer of layers) {
      const shares = new Map<string, number | null>();
      const nodes = thematicTree(layer);

      let pctFor: (key: string) => number | null = () => null;
      if (layer === "cropType" && crops.data?.crops) {
        pctFor = shareByRow(nodes, crops.data.crops.map((c) => ({ name: c.crop, value: c.share_pct ?? 0 })));
      } else if (layer === "treeType" && trees.data) {
        const d = trees.data;
        pctFor = (key) => {
          const field = TREE_FIELD[key];
          return field && d.total > 0 ? (d[field] / d.total) * 100 : null;
        };
      }
      for (const n of nodes) shares.set(n.key, pctFor(n.key));
      out[layer] = shares;
    }
    return out;
  }, [layers, crops.data, trees.data]);
}
