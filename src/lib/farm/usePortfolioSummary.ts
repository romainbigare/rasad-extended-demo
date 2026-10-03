import { useQuery } from "react-query";

import { FARM_ENDPOINTS, type PortfolioSummary } from "@shared/farm/endpoints";
import { rbacRequest } from "@shared/network/rbacRequest";

export function usePortfolioSummary(zoneId?: number, treeModelVersionId?: number) {
  return useQuery<PortfolioSummary, Error>(
    ["farm-service", "portfolio-summary", zoneId ?? null, treeModelVersionId ?? null],
    async () => {
      const params = {
        ...(zoneId === undefined ? {} : { zone_id: zoneId }),
        ...(treeModelVersionId === undefined ? {} : { tree_model_version_id: treeModelVersionId }),
      };
      const result = await rbacRequest<PortfolioSummary>(
        FARM_ENDPOINTS.PORTFOLIO_SUMMARY,
        "GET",
        undefined,
        { params: Object.keys(params).length ? params : undefined },
        { silent: true },
      );
      return result.data;
    },
  );
}
