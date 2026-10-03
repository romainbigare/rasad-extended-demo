import type { FarmCrops } from "@/lib/analytics/types";
import { type CropGroupId, cropGroup } from "@/lib/crops/groups";

/**
 * How many distinct farms grow what, from each farm's own crop mix. A farm that grows tomato and
 * cucumber is one farm in "Open field", not two, so a group's count is not the sum of its crops' counts.
 */
export interface FarmCounts {
  /** Farms growing at least one crop of the group. */
  byGroup: Map<CropGroupId, number>;
  /** Farms growing the crop. */
  byCrop: Map<string, number>;
  /** Farms with any crop at all: what the shares are shares of. */
  withAnyCrop: number;
}

export function distinctFarmCounts(farms: readonly FarmCrops[]): FarmCounts {
  const byGroup = new Map<CropGroupId, number>();
  const byCrop = new Map<string, number>();
  let withAnyCrop = 0;
  for (const farm of farms) {
    if (farm.crops.length > 0) withAnyCrop += 1;
    const groups = new Set<CropGroupId>();
    for (const c of farm.crops) {
      byCrop.set(c.crop, (byCrop.get(c.crop) ?? 0) + 1);
      groups.add(cropGroup(c.crop));
    }
    for (const id of groups) byGroup.set(id, (byGroup.get(id) ?? 0) + 1);
  }
  return { byGroup, byCrop, withAnyCrop };
}
