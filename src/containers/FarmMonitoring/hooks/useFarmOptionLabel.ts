import type { FarmServiceFarm } from "@shared/farm/endpoints";
import { useZones } from "@/lib/analytics/hooks";
import { useT } from "@/lib/i18n/createDict";
import { farmServiceLabel } from "@/lib/format";

import { STRINGS } from "../data/translations";

export function useFarmOptionLabel(): (farm: FarmServiceFarm) => string {
  const t = useT(STRINGS);
  const zones = useZones();
  const zoneName = new Map((zones.data ?? []).map((z) => [z.id, z.name]));
  return (farm) => {
    const name = farm.name ?? farmServiceLabel(farm.uid);
    const zone = farm.zone_id === null ? undefined : zoneName.get(farm.zone_id);
    return zone ? t("headerFarmOptionTemplate").replace("{farm}", name).replace("{region}", zone) : name;
  };
}
