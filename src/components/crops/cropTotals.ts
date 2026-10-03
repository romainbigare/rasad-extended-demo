import type { FarmCrops } from "@/lib/analytics/types";

export interface CropTotal {
  crop: string;
  /** Planted area summed over every farm that grows the crop, in dunums. */
  area_du: number;
}

/**
 * Per-crop planted area from the farm list (`analytics/crops?group_by=farm`): each crop's `area_du`
 * summed across `farms[].crops[]`, largest first. Crops with no area are left out, so the list's
 * length is the number of crops with planted area.
 */
export function cropAreaTotals(farms: readonly FarmCrops[]): CropTotal[] {
  const totals = new Map<string, number>();
  for (const farm of farms) for (const c of farm.crops) totals.set(c.crop, (totals.get(c.crop) ?? 0) + (c.area_du ?? 0));
  return [...totals.entries()]
    .filter(([, area]) => area > 0)
    .map(([crop, area_du]) => ({ crop, area_du }))
    .sort((a, b) => b.area_du - a.area_du);
}
