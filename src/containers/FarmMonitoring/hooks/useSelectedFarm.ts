import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

import { replaceQuery } from "@/lib/filters/replaceQuery";

function toId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) ? id : null;
}

export function useSelectedFarm() {
  const router = useRouter();
  const consumed = useRef(false);
  const [farmId, setFarmIdState] = useState<number | null>(null);
  const [fieldId, setFieldIdState] = useState<number | null>(null);
  // True once the ?farm=&field= link has been read. The page waits for it before defaulting to the first
  // farm, so a deep link is never overwritten by the default.
  const [queryRead, setQueryRead] = useState(false);

  // Runs exactly once, the first time the router has real query values to
  // read (router.isReady - on first render router.query is {} even when the
  // URL has a query string, until Next.js finishes parsing it).
  useEffect(() => {
    if (consumed.current || !router.isReady) return;
    consumed.current = true;

    const initialFarm = toId(router.query.farm);
    const initialField = toId(router.query.field);
    if (initialFarm !== null) setFarmIdState(initialFarm);
    if (initialField !== null) setFieldIdState(initialField);
    setQueryRead(true);

    if (router.query.farm !== undefined || router.query.field !== undefined) {
      // Only these two keys go; the region, crop and view the other effects write are left as the address has them.
      void replaceQuery(router, { farm: null, field: null });
    }
    // router itself is stable across renders (Next.js singleton); only isReady flipping matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const setFarmId = useCallback((id: number) => {
    setFarmIdState(id);
    setFieldIdState(null); // picking a farm clears any selected field
  }, []);

  const setFieldId = useCallback((id: number | null) => {
    setFieldIdState(id);
  }, []);

  return { farmId, fieldId, setFarmId, setFieldId, queryRead };
}
