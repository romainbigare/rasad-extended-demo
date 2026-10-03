import { useQuery } from "react-query";

import { FARM_ENDPOINTS, type FarmServiceFarm } from "@shared/farm/endpoints";
import { rbacRequest } from "@shared/network/rbacRequest";

export function useFarmRecord(farmId: number | null) {
  return useQuery<FarmServiceFarm, Error>(
    ["farm-service", "farm", farmId],
    async () => {
      const result = await rbacRequest<FarmServiceFarm>(
        FARM_ENDPOINTS.FARM_BY_ID(farmId as number),
        "GET",
        undefined,
        undefined,
        { silent: true },
      );
      return result.data;
    },
    { enabled: farmId !== null, retry: 2 },
  );
}
