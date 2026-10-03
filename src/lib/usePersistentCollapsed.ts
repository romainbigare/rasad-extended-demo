import { useCallback, useEffect, useState } from "react";

/** Last known value per key, so a page change (each page mounts its own copy)
 * starts in the saved state straight away instead of flashing open for a frame. */
const cache = new Map<string, boolean>();

function read(key: string, fallback: boolean): boolean {
  try {
    const saved = window.localStorage.getItem(key);
    return saved === null ? fallback : saved === "1";
  } catch {
    return fallback; // private window / blocked storage: just use the default
  }
}

/**
 * A collapsed / expanded panel (the app sidebar, the Farm map's Fields panel),
 * remembered in this browser across pages and reloads under `key`.
 * `defaultCollapsed`: the state before the user has chosen anything (and when storage
 * is blocked). The static export renders in that default, so a full reload applies a
 * saved choice right after mount; later page changes reuse the cached value.
 */
export function usePersistentCollapsed(key: string, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState<boolean>(cache.get(key) ?? defaultCollapsed);

  useEffect(() => {
    if (!cache.has(key)) cache.set(key, read(key, defaultCollapsed));
    setCollapsed(cache.get(key) ?? defaultCollapsed);
  }, [key, defaultCollapsed]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      cache.set(key, next);
      try {
        window.localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // not saved - it still works for this page
      }
      return next;
    });
  }, [key]);

  return { collapsed, toggle };
}
