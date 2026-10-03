import { useQueries } from "react-query";

import { rbacRequest } from "@shared/network/rbacRequest";
import { SATELLITE_ENDPOINTS, type SatelliteIndexEntry } from "@/lib/network/satellite/endpoints";

export function useSatelliteIndicesForMany(farmId: number | null, satellites: string[]) {
  const results = useQueries(
    satellites.map((satellite) => ({
      queryKey: ["satellite", "indices", farmId, satellite],
      queryFn: async () => {
        const result = await rbacRequest<Record<string, SatelliteIndexEntry[]>>(
          SATELLITE_ENDPOINTS.INDICES,
          "GET",
          undefined,
          { params: { farm_id: String(farmId), satellite } },
          { silent: true },
        );
        return Object.values(result.data).flat();
      },
      enabled: farmId !== null && !!satellite,
    })),
  );

  const isLoading = results.some((r) => r.isLoading);
  /** satellite code -> its own process:true aliases (for validating a pick
   * against whichever scene is actually highlighted). */
  const bySatellite = new Map<string, string[]>();
  satellites.forEach((satellite, i) => {
    const data = results[i]?.data as SatelliteIndexEntry[] | undefined;
    bySatellite.set(satellite, (data ?? []).filter((entry) => entry.process).map((entry) => entry.alias));
  });

  return { isLoading, bySatellite };
}
