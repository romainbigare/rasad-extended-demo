import { useQuery } from "react-query";

import { rbacRequest } from "@shared/network/rbacRequest";
import { SATELLITE_ENDPOINTS, type SatelliteCatalogEntry } from "@/lib/network/satellite/endpoints";

/** A farm's own satellite catalog -- which satellite codes it has data for,
 * and each one's available index aliases. The only source of truth for what
 * belongs in the satellite multi-select and the index-select; never
 * hardcode a satellite or index list. */
export function useSatelliteCatalog(farmId: number | null) {
  return useQuery<SatelliteCatalogEntry[], Error>(
    ["satellite", "catalog", farmId],
    async () => {
      const result = await rbacRequest<SatelliteCatalogEntry[]>(
        SATELLITE_ENDPOINTS.CATALOG,
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
