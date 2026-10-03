import { useQuery } from "react-query";

import { rbacRequest, type RbacRequestError } from "@shared/network/rbacRequest";
import { SATELLITE_ENDPOINTS, type FieldImageryResponse } from "@/lib/network/satellite/endpoints";

export type FieldImageryParams = {
  satellite: string;
  index: string;
  /** The scene's own date, `YYYY-MM-DD` (the calendar day of `datetime`). */
  satelliteDate: string;
  /** The exact pass timestamp, copied verbatim from the chosen `/dates`
   * item -- this is what pins the request to one specific pass rather than
   * "any pass that day". */
  datetime: string;
};

export function useFieldImagery(farmId: number | null, params: FieldImageryParams | null) {
  return useQuery<FieldImageryResponse, RbacRequestError>(
    ["satellite", "field-imagery", farmId, params?.satellite, params?.index, params?.datetime],
    async () => {
      const result = await rbacRequest<FieldImageryResponse>(
        SATELLITE_ENDPOINTS.FIELD_IMAGERY,
        "GET",
        undefined,
        {
          params: {
            farm_id: String(farmId),
            satellite: params!.satellite,
            index: params!.index,
            satellite_date: params!.satelliteDate,
            datetime: params!.datetime,
          },
        },
        { silent: true },
      );
      return result.data;
    },
    { enabled: farmId !== null && !!params, retry: false },
  );
}
