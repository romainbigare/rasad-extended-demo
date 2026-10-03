import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface TreeModelState {
  treeModelVersionId: number | null;
  setTreeModelVersionId: (id: number | null) => void;
}

const TreeModelContext = createContext<TreeModelState>({
  treeModelVersionId: null,
  setTreeModelVersionId: () => undefined,
});

// Kept in sessionStorage like the region pick (RegionContext), so it survives navigation.
const STORAGE_KEY = "rasad.exec.treeModelVersionId";

function readStored(): number | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const id = raw ? Number(raw) : NaN;
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

/** Holds the tree-model pick, so every Executive View tree number uses the same run. */
export function TreeModelProvider({ children }: { children: ReactNode }) {
  const [treeModelVersionId, setState] = useState<number | null>(() =>
    typeof window === "undefined" ? null : readStored(),
  );

  const setTreeModelVersionId = useCallback((id: number | null) => {
    setState(id);
    try {
      if (id === null) sessionStorage.removeItem(STORAGE_KEY);
      else sessionStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // Storage blocked - the pick just won't survive navigation.
    }
  }, []);

  const value = useMemo(() => ({ treeModelVersionId, setTreeModelVersionId }), [treeModelVersionId, setTreeModelVersionId]);
  return <TreeModelContext.Provider value={value}>{children}</TreeModelContext.Provider>;
}

export function useTreeModel() {
  return useContext(TreeModelContext);
}
