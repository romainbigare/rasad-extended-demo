import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface RegionState {
  /** Selected zone from the top-bar region picker; null means the whole emirate. */
  zoneId: number | null;
  setZoneId: (zoneId: number | null) => void;
}

const RegionContext = createContext<RegionState>({ zoneId: null, setZoneId: () => undefined });

// AppShell (and so this provider) remounts on every page change, so the pick
// is kept in sessionStorage to survive navigation within the tab.
const STORAGE_KEY = "rasad.region.zoneId";

function readStored(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/** Holds the region picked in the top bar, so every analytics card filters by it. */
export function RegionProvider({ children }: { children: ReactNode }) {
  const [zoneId, setZoneIdState] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readStored(),
  );

  const setZoneId = useCallback((id: number | null) => {
    setZoneIdState(id);
    try {
      if (id === null) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Storage blocked (private mode etc.) - the pick just won't survive navigation.
    }
  }, []);

  const value = useMemo(() => ({ zoneId, setZoneId }), [zoneId, setZoneId]);
  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  return useContext(RegionContext);
}
