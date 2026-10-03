import { useMemo } from "react";

import { daysFromToday, isoDaysAgo, todayIso } from "@/lib/satellite/passDates";
import { useNextAcquisition } from "@/lib/satellite/useNextAcquisition";
import { useSatelliteDates } from "@/lib/satellite/useSatelliteDates";

/**
 * A farm's latest satellite pass and its next estimated one. Every caller uses the
 * same query params, so the Farm Monitoring header and the Farm page's ranking cards
 * share one cached request per farm.
 */
export function useFarmPasses(farmId: number | null) {
  // Same 365-day default window `/satellite/dates` itself falls back to when
  // start/end are omitted. cloudCover: 100 -- "latest pass" means any pass, cloud or not.
  const dates = useSatelliteDates(farmId, { startDate: isoDaysAgo(365), endDate: todayIso(), cloudCover: 100 });
  const nextAcquisition = useNextAcquisition(farmId);
  const latestPass = useMemo(() => {
    if (!dates.data?.length) return null;
    return [...dates.data].sort((a, b) => b.datetime.localeCompare(a.datetime))[0];
  }, [dates.data]);
  const nextOverpass = useMemo(() => {
    if (!nextAcquisition.data?.length) return null;
    return [...nextAcquisition.data].sort(
      (a, b) => daysFromToday(a.next_estimated_date) - daysFromToday(b.next_estimated_date),
    )[0];
  }, [nextAcquisition.data]);
  return { latestPass, nextOverpass, latestLoading: dates.isLoading, nextLoading: nextAcquisition.isLoading };
}
