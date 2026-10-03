import { useMemo } from "react";

import { useFarmList } from "@/lib/farm/useFarmList";

/** Farm names (or the farm code) by farm id and by farm uid, from the farm list. */
export function useFarmNames() {
  const farms = useFarmList();
  return useMemo(() => {
    const byId = new Map<number, { name: string; uid: string }>();
    const idByUid = new Map<string, number>();
    for (const farm of farms.data ?? []) {
      byId.set(farm.id, { name: farm.name ?? farm.uid, uid: farm.uid });
      idByUid.set(farm.uid, farm.id);
    }
    return { byId, idByUid, isLoading: farms.isLoading };
  }, [farms.data, farms.isLoading]);
}
