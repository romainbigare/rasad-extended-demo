
export type ThematicKey = "landUse" | "cropType" | "treeType";

interface Entry {
  name: string;
  color: string;
  /** Data values this entry matches; defaults to [name]. */
  values?: string[];
  /** Style that draws this entry on its own, when its parent's style can't (e.g. Olive Trees). */
  style?: string;
}

interface Children {
  field: string;
  style: string;
  scopedToParent?: boolean;
  entries: EntryWithChildren[];
}

interface EntryWithChildren extends Entry {
  children?: Children;
}

interface LayerDef {
  key: ThematicKey;
  wmsLayer: string;
  wfsLayer?: string;
  geometryField: string;
  /** Style that draws the whole layer, coloured by its first level. */
  style: string;
  /** Field the first level filters on. */
  field: string;
  farmIdField?: string;
  entries: EntryWithChildren[];
}

export const THEMATIC_LAYERS: Record<ThematicKey, LayerDef> = {
  landUse: {
    key: "landUse",
    wmsLayer: "ADAFSA_MLRegistry:lulc_v1",
    wfsLayer: "ADAFSA_MLRegistry:lulc_v1_attrs",
    geometryField: "geometry",
    style: "lulc_v1_style",
    field: "l1",
    farmIdField: "farm_uid",
    entries: [
      {
        // Colours match landUseColors.ts's LAND_USE_COLORS (the Farm page's
        // land-use distribution widget) - same l1 classes, different feature.
        name: "Open Agriculture",
        color: "#7CB342",
        children: {
          field: "l2",
          style: "lulc_v1_style",
          entries: [
            { name: "Palm Trees", color: "#1B5E20" },
            { name: "Cultivated Fields", color: "#558B2F" },
            { name: "Fallow Land", color: "#CDDC39" },
          ],
        },
      },
      // l1 and l2 are the same single value here, so no children.
      { name: "Barren Land", color: "#D7B98E" },
      {
        name: "Protected Agriculture",
        color: "#26A69A",
        children: {
          field: "l2",
          style: "lulc_v1_style",
          entries: [
            { name: "Greenhouse", color: "#8E24AA" },
            { name: "Shade House", color: "#CE93D8" },
            { name: "Open Shed", color: "#BDBDBD" },
          ],
        },
      },
      {
        name: "Structures",
        color: "#8D6E63",
        children: {
          field: "l2",
          style: "lulc_v1_style",
          entries: [
            { name: "Residential", color: "#A1887F" },
            { name: "Labour Housing", color: "#EC407A" },
            { name: "Animal Pens", color: "#6D4C41" },
            { name: "Warehouse", color: "#607D8B" },
            { name: "Machine Storage", color: "#3949AB" },
            { name: "Water Storage", color: "#29B6F6" },
            { name: "Irrigation & Utilities", color: "#4DD0E1" },
            { name: "Vehicle/Road", color: "#424242" },
            { name: "Other Structures", color: "#757575" },
          ],
        },
      },
    ],
  },

  cropType: {
    key: "cropType",
    wmsLayer: "ADAFSA_MLRegistry:field_crops_v4",
    wfsLayer: "ADAFSA_MLRegistry:field_crops_v4_attrs",
    geometryField: "boundary",
    style: "field_crops_v4_style",
    field: "crop_name",
    farmIdField: "farm_uid",
    entries: [
      { name: "Alfalfa", color: "#5AA02C" },
      { name: "Rhodes Grass", values: ["Rhodes grass"], color: "#9ACD32" },
      { name: "Other", color: "#9E9E9E" },
    ],
  },

  treeType: {
    key: "treeType",
    wmsLayer: "ADAFSA_MLRegistry:trees_v7",
    wfsLayer: "ADAFSA_MLRegistry:trees_v7_attrs",
    geometryField: "crown_boundary",
    style: "trees_v7_style",
    field: "species",
    farmIdField: "farm_uid",
    entries: [
      {
        name: "Date Palm",
        // The data spells it lower-case ("Date palm").
        values: ["Date palm"],
        color: "#7B4B2A",
        children: {
          field: "variety_cultivar",
          style: "trees_v7_style",
          entries: [
            { name: "Khalas", color: "#E8862E" },
            { name: "Dabbas", color: "#A0522D" },
            { name: "Shishi", color: "#D2691E" },
            { name: "Khanizi", color: "#8E2D22" },
            { name: "Fardh", color: "#3E2A1A" },
            { name: "Medjool", color: "#6B4226" },
            { name: "Bomaan", color: "#8B5A2B" },
            { name: "Other", color: "#B8A98A" },
          ],
        },
      },
    ],
  },
};

const FIELD_OVERRIDES: Partial<Record<ThematicKey, Record<string, string>>> = {};

// ─── Resolved tree ───────────────────────────────────────────────────────────

/** A legend row, with everything needed to draw it on its own. */
export interface ThematicNode {
  /** Unique within its layer: the path of names, joined by " / ". */
  key: string;
  name: string;
  color: string;
  depth: 1 | 2 | 3;
  filter: string;
  conditions: Array<{ field: string; values: string[] }>;
  style: string;
  children: ThematicNode[];
}

const quote = (v: string) => `'${v.replace(/'/g, "''")}'`;
const match = (field: string, values: string[]) =>
  values.length === 1 ? `${field} = ${quote(values[0])}` : `${field} IN (${values.map(quote).join(",")})`;
const and = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(" AND ");

type Condition = ThematicNode["conditions"][number];

function resolve(
  entry: EntryWithChildren,
  field: string,
  drawStyle: string,
  parent: { filter?: string; conditions: Condition[] },
  parentKey: string | null,
  depth: 1 | 2 | 3,
): ThematicNode {
  const key = parentKey ? `${parentKey} / ${entry.name}` : entry.name;
  const values = entry.values ?? [entry.name];
  const filter = and(parent.filter, match(field, values));
  const conditions = [...parent.conditions, { field, values }];
  const kids = entry.children;
  return {
    key,
    name: entry.name,
    color: entry.color,
    depth,
    filter,
    conditions,
    style: entry.style ?? drawStyle,
    children:
      kids && depth < 3
        ? kids.entries.map((child) =>
            resolve(
              child,
              kids.field,
              kids.style,
              kids.scopedToParent === false ? { conditions: [] } : { filter, conditions },
              key,
              (depth + 1) as 2 | 3,
            ),
          )
        : [],
  };
}

/** The layer's legend tree, with each row's own filter and style resolved. */
export function thematicTree(key: ThematicKey): ThematicNode[] {
  const layer = THEMATIC_LAYERS[key];
  return layer.entries.map((entry) =>
    resolve(entry, FIELD_OVERRIDES[key]?.[entry.name] ?? layer.field, layer.style, { conditions: [] }, null, 1),
  );
}

/** Every leaf key under a node (the node itself when it has no children). */
export function leafKeys(node: ThematicNode): string[] {
  return node.children.length ? node.children.flatMap(leafKeys) : [node.key];
}

export type CheckState = "all" | "some" | "none";

export function checkState(node: ThematicNode, checked: ReadonlySet<string>): CheckState {
  const leaves = leafKeys(node);
  const n = leaves.filter((k) => checked.has(k)).length;
  return n === 0 ? "none" : n === leaves.length ? "all" : "some";
}

export interface DrawItem {
  node: ThematicNode;
}

export function drawPlan(key: ThematicKey, checked: ReadonlySet<string>, expanded: ReadonlySet<string> = new Set()) {
  const drawn: ThematicNode[] = [];
  const visit = (node: ThematicNode) => {
    const state = checkState(node, checked);
    if (state === "none") return;
    const split = node.children.length > 0 && (state === "some" || expanded.has(node.key));
    if (split) node.children.forEach(visit);
    else drawn.push(node);
  };
  thematicTree(key).forEach(visit);

  const byStyle = new Map<string, string[]>();
  for (const node of drawn) byStyle.set(node.style, [...(byStyle.get(node.style) ?? []), node.filter]);
  const requests = [...byStyle.entries()].map(([style, filters]) => ({
    style,
    cqlFilter: filters.length === 1 ? filters[0] : filters.map((f) => `(${f})`).join(" OR "),
  }));
  return { wmsLayer: THEMATIC_LAYERS[key].wmsLayer, requests, drawn };
}

/** Does a record's properties satisfy all of a row's conditions? (trimmed, case-insensitive) */
export function recordMatches(node: ThematicNode, props: Record<string, unknown>): boolean {
  return node.conditions.every(({ field, values }) => {
    const v = String(props[field] ?? "").trim().toLowerCase();
    return values.some((x) => x.trim().toLowerCase() === v);
  });
}

export function conditionFields(nodes: ThematicNode[]): string[] {
  return [...new Set(nodes.flatMap((n) => n.conditions.map((c) => c.field)))];
}
