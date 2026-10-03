import { useQuery } from "react-query";

import { FARM_ENDPOINTS } from "@shared/farm/endpoints";
import { rbacRequest } from "@shared/network/rbacRequest";

import { useFieldModel } from "./FieldModelContext";
import type { FarmMonitoringResponse } from "./types";

export function useFarmMonitoring(farmId: number | null) {
  const { fieldModelVersionId } = useFieldModel();
  return useQuery<FarmMonitoringResponse, Error>(
    ["farm-service", "farm-monitoring", farmId, fieldModelVersionId],
    async () => {
      const result = await rbacRequest<FarmMonitoringResponse>(
        FARM_ENDPOINTS.FARM_MONITORING(farmId as number),
        "GET",
        undefined,
        fieldModelVersionId === null ? undefined : { params: { field_model_version_id: fieldModelVersionId } },
        { silent: true },
      );
      return result.data;
    },
    { enabled: farmId !== null, retry: 2 },
  );
}
