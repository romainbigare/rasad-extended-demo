import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface FieldModelState {
  fieldModelVersionId: number | null;
  setFieldModelVersionId: (id: number | null) => void;
}

const FieldModelContext = createContext<FieldModelState>({
  fieldModelVersionId: null,
  setFieldModelVersionId: () => undefined,
});

// Kept in sessionStorage like the region pick (RegionContext), so it survives navigation.
const STORAGE_KEY = "rasad.farm.fieldModelVersionId";

function readStored(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/** Holds the field-model pick, so every Farm Monitoring field view uses the same version. */
export function FieldModelProvider({ children }: { children: ReactNode }) {
  const [fieldModelVersionId, setState] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readStored(),
  );

  const setFieldModelVersionId = useCallback((id: number | null) => {
    setState(id);
    try {
      if (id === null) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Storage blocked - the pick just won't survive navigation.
    }
  }, []);

  const value = useMemo(
    () => ({ fieldModelVersionId, setFieldModelVersionId }),
    [fieldModelVersionId, setFieldModelVersionId],
  );
  return <FieldModelContext.Provider value={value}>{children}</FieldModelContext.Provider>;
}

export function useFieldModel() {
  return useContext(FieldModelContext);
}
