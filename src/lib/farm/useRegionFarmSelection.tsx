import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { useFarmList } from "@/lib/farm/useFarmList";
import { useRegion } from "@/lib/region/RegionContext";

type SelectedFarm = [number | null, (farmId: number | null) => void];

const SelectedFarmContext = createContext<SelectedFarm | null>(null);

/** One selected farm for the whole Farm page, so its farm pickers (telemetry,
 * FIELDS panel) always show - and drive - the same farm. */
export function SelectedFarmProvider({ children }: { children: ReactNode }) {
  const state = useState<number | null>(null);
  return <SelectedFarmContext.Provider value={state}>{children}</SelectedFarmContext.Provider>;
}

/** A farm picker's state: the top-bar region's farms, and the selected one -
 * defaulting to (and falling back to) the region's first farm. Shared across
 * the page when inside SelectedFarmProvider. */
export function useRegionFarmSelection() {
  const { zoneId } = useRegion();
  const farms = useFarmList();
  const shared = useContext(SelectedFarmContext);
  const local = useState<number | null>(null);
  const [farmId, setFarmId] = shared ?? local;
  const options = useMemo(
    () => (farms.data ?? []).filter((f) => zoneId === null || f.zone_id === zoneId),
    [farms.data, zoneId],
  );
  useEffect(() => {
    if (!options.some((f) => f.id === farmId)) setFarmId(options[0]?.id ?? null);
  }, [options, farmId, setFarmId]);
  return { isLoading: farms.isLoading, options, farmId, setFarmId };
}
