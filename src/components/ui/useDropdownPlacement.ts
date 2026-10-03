import { type RefObject, useLayoutEffect, useState } from "react";

const EDGE = 8; // keep this far from the screen edge
const GAP = 6; // the list's own offset from its button (mt-1.5 / mb-1.5)

export interface DropdownPlacement {
  /** Open above the button instead of below it. */
  up: boolean;
  /** Cap for the list's height when neither side has room for all of it (then it scrolls). */
  maxHeight?: number;
}

/**
 * Where an open dropdown list should go: below its button (the default, unchanged
 * whenever it fits), above it when the space below is too small and there's more
 * above, and capped to the bigger side when neither fits. Measured every time it
 * opens, so scrolling or resizing between opens is taken into account.
 */
export function useDropdownPlacement(
  open: boolean,
  anchorRef: RefObject<HTMLElement>,
  listRef: RefObject<HTMLElement>,
): DropdownPlacement {
  const [placement, setPlacement] = useState<DropdownPlacement>({ up: false });

  useLayoutEffect(() => {
    if (!open) {
      setPlacement({ up: false });
      return;
    }
    const anchor = anchorRef.current?.getBoundingClientRect();
    const list = listRef.current;
    if (!anchor || !list) return;
    // Rendered height (already capped by the list's own max-h), not scrollHeight - a long list only
    // needs room for what it shows.
    const needed = list.offsetHeight + GAP;
    const below = window.innerHeight - anchor.bottom - EDGE;
    const above = anchor.top - EDGE;
    if (needed <= below) setPlacement({ up: false });
    else if (above > below) setPlacement({ up: true, maxHeight: needed > above ? above - GAP : undefined });
    else setPlacement({ up: false, maxHeight: below - GAP });
  }, [open, anchorRef, listRef]);

  return placement;
}
