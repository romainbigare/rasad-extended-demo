import { useQuery } from "react-query";

import { FARM_ENDPOINTS } from "@shared/farm/endpoints";
import { rbacRequest } from "@shared/network/rbacRequest";
import type { ModelVersionOption } from "@/lib/analytics/types";

export function useFieldModelVersions() {
  return useQuery<ModelVersionOption[], Error>(["farm-service", "field-model-versions"], async () => {
    const result = await rbacRequest<ModelVersionOption[]>(
      FARM_ENDPOINTS.FIELD_MODEL_VERSIONS,
      "GET",
      undefined,
      undefined,
      { silent: true },
    );
    return result.data;
  });
}
