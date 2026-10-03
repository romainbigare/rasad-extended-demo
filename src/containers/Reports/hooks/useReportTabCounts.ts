import { useCropReportRows, useFieldReportRows, useFarmReportRows, useStructureReportRows } from "./useReportRows";
import { useDateCultivarRows, useWaterQuotaRows } from "./useReportsApi";

/** Row count per tab - the same rows each table shows. */
export function useReportTabCounts() {
  const farms = useFarmReportRows();
  const fields = useFieldReportRows();
  const structures = useStructureReportRows();
  const crops = useCropReportRows();
  const cultivars = useDateCultivarRows();
  const water = useWaterQuotaRows();

  return {
    farms: farms.rows?.length,
    fields: fields.rows?.length,
    structures: structures.rows?.reduce((sum, r) => sum + r.count, 0),
    "date-cultivars": cultivars.data?.rows.length,
    crops: crops.rows?.length,
    "water-quota": water.data?.rows.length,
  };
}
