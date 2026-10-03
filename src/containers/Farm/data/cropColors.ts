import type { CropShare } from "@/lib/analytics/types";

const COLORS = ["#52be40", "#7cc22b", "#fcd20a", "#0b84c6", "#f28c10", "#8e5bd6", "#c0392b"];

/**
 * A crop's colour from its rank in the region-wide crop list (the crops API's
 * `crops`), so the Crop Type card and the map panel's legend always agree.
 */
export function cropColor(allCrops: readonly CropShare[], crop: string): string {
  return COLORS[Math.max(0, allCrops.findIndex((c) => c.crop === crop)) % COLORS.length];
}
