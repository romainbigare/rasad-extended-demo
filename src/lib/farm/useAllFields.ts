import { useQuery } from "react-query";

import { FARM_ENDPOINTS, type FarmServiceField } from "@shared/farm/endpoints";

import { fetchAllPages } from "./fetchAllPages";

export function useAllFields() {
  return useQuery<FarmServiceField[], Error>(["farm-service", "fields", "all"], () =>
    fetchAllPages<FarmServiceField>(FARM_ENDPOINTS.FIELDS),
  );
}
