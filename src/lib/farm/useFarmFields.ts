import { useQuery } from "react-query";

import { FARM_ENDPOINTS, type FarmServiceField } from "@shared/farm/endpoints";

import { fetchAllPages } from "./fetchAllPages";

import { useFieldModel } from "./FieldModelContext";

/** A farm's fields WITH their boundary WKT (the monitoring response's
 * fields[] omits it) - used to derive a display-only centroid per field.
 * Loaded page by page so no field is dropped past a page cap. */
export function useFarmFields(farmId: number | null) {
  const { fieldModelVersionId } = useFieldModel();
  return useQuery<FarmServiceField[], Error>(
    ["farm-service", "fields", farmId, fieldModelVersionId],
    () =>
      fetchAllPages<FarmServiceField>(FARM_ENDPOINTS.FIELDS, {
        farm_id: farmId as number,
        ...(fieldModelVersionId === null ? {} : { field_model_version_id: fieldModelVersionId }),
      }),
    { enabled: farmId !== null, retry: 2 },
  );
}
