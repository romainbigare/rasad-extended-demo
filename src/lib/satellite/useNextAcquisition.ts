import { useQuery } from "react-query";

import { rbacRequest } from "@shared/network/rbacRequest";
import { SATELLITE_ENDPOINTS, type NextAcquisitionItem } from "@/lib/network/satellite/endpoints";

/** `GET /satellite/next-acquisition` -- one row per satellite this farm has
 * ANY cached pass for. Backs the "Next pass: S2 in 3 days" chips. Comes back
 * `[]` until `/satellite/dates` has populated the cache for this farm, so
 * this app always fires the dates query first (see SatellitePassRibbon). */
export function useNextAcquisition(farmId: number | null) {
  return useQuery<NextAcquisitionItem[], Error>(
    ["satellite", "next-acquisition", farmId],
    async () => {
      const result = await rbacRequest<NextAcquisitionItem[]>(
        SATELLITE_ENDPOINTS.NEXT_ACQUISITION,
        "GET",
        undefined,
        { params: { farm_id: String(farmId) } },
        { silent: true },
      );
      return result.data;
    },
    { enabled: farmId !== null },
  );
}
