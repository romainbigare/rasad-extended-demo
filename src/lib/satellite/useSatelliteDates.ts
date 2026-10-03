import { useQuery } from "react-query";

import { rbacRequest } from "@shared/network/rbacRequest";
import { SATELLITE_ENDPOINTS, type SatelliteDateItem } from "@/lib/network/satellite/endpoints";

export function useSatelliteDates(
  farmId: number | null,
  { startDate, endDate, cloudCover }: { startDate: string; endDate: string; cloudCover: number },
) {
  return useQuery<SatelliteDateItem[], Error>(
    ["satellite", "dates", farmId, startDate, endDate, cloudCover],
    async () => {
      const result = await rbacRequest<SatelliteDateItem[]>(
        SATELLITE_ENDPOINTS.DATES,
        "GET",
        undefined,
        { params: { farm_id: String(farmId), start_date: startDate, end_date: endDate, cloud_cover: cloudCover } },
        { silent: true },
      );
      return result.data;
    },
    { enabled: farmId !== null },
  );
}
