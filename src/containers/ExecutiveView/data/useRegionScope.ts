import { useSelectedZone } from "@/lib/analytics/hooks";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "./translations";

/**
 * Wording for the region picked in the top bar, so headings match the
 * numbers under them: "Al Ain region" when one is picked, "Abu Dhabi
 * Emirate" for all regions. `regionName` is null for all regions, for
 * headings that phrase the whole-emirate case differently.
 */
export function useRegionScope() {
  const t = useT(STRINGS);
  const zone = useSelectedZone();
  const regionName = zone ? t("commonRegionName").replace("{name}", zone.name) : null;
  return { zone, regionName, label: regionName ?? t("commonEmirateName") };
}
