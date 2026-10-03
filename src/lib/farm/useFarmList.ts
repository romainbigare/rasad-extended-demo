import { useQuery } from "react-query";

import { FARM_ENDPOINTS, type FarmServiceFarm } from "@shared/farm/endpoints";

import { fetchAllPages } from "./fetchAllPages";

export function useFarmList() {
  return useQuery<FarmServiceFarm[], Error>(
    ["farm-service", "farms"],
    () => fetchAllPages<FarmServiceFarm>(FARM_ENDPOINTS.FARMS),
    { retry: 2 },
  );
}
