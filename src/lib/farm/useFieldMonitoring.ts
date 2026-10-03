import { useQuery } from "react-query";

import { FARM_ENDPOINTS } from "@shared/farm/endpoints";
import { rbacRequest } from "@shared/network/rbacRequest";

import type { FieldMonitoringDetail } from "./types";

/** Field-level drill-down (row click). Only enabled once a field is actually
 * selected - never fanned out across a whole farm. */
export function useFieldMonitoring(farmId: number | null, fieldId: number | null) {
  return useQuery<FieldMonitoringDetail, Error>(
    ["farm-service", "field-monitoring", farmId, fieldId],
    async () => {
      const result = await rbacRequest<FieldMonitoringDetail>(
        FARM_ENDPOINTS.FIELD_MONITORING(farmId as number, fieldId as number),
        "GET",
        undefined,
        undefined,
        { silent: true },
      );
      return result.data;
    },
    { enabled: farmId !== null && fieldId !== null },
  );
}
