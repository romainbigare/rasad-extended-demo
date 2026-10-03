import type { LandUseClass } from "@/lib/analytics/types";

export const LAND_USE_COLORS: Record<LandUseClass, string> = {
  open_agriculture: "#7CB342",
  barren_land: "#D7B98E",
  protected_agriculture: "#26A69A",
  structures: "#8D6E63",
  fallow_land: "#BDBDBD",
};

/**
 * Each class's share of the five classes' total area, 0-100. The API's own share_pct leaves fallow land out
 * (it is a share of non-fallow land), so a donut that shows fallow draws every share from the areas instead.
 */
export function landUseShares(classes: ReadonlyArray<{ class: LandUseClass; area_du: number | null; area_ha: number | null }>): Record<LandUseClass, number | null> {
  const areaOf = (c: LandUseClass) => {
    const entry = classes.find((e) => e.class === c);
    return entry?.area_du ?? entry?.area_ha ?? 0;
  };
  const all = Object.keys(LAND_USE_COLORS) as LandUseClass[];
  const total = all.reduce((sum, c) => sum + areaOf(c), 0);
  return Object.fromEntries(all.map((c) => [c, total > 0 ? (areaOf(c) / total) * 100 : null])) as Record<LandUseClass, number | null>;
}
