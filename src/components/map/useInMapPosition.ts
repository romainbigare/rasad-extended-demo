import { type RefObject, useLayoutEffect, useState } from "react";

const GAP = 12;
const EDGE = 8;

/**
 * Places a map tooltip above the pointer, centred on it, but keeps it inside the
 * map frame: slid sideways near the left/right edge, flipped below the pointer
 * near the top.
 */
export function useInMapPosition(ref: RefObject<HTMLElement>, x: number, y: number) {
  const [pos, setPos] = useState({ left: x, top: y, ready: false });

  useLayoutEffect(() => {
    const el = ref.current;
    const frame = el?.offsetParent as HTMLElement | null;
    if (!el || !frame) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxLeft = Math.max(EDGE, frame.clientWidth - w - EDGE);
    const left = Math.min(Math.max(x - w / 2, EDGE), maxLeft);
    const above = y - h - GAP;
    const top = above >= EDGE ? above : Math.min(y + GAP, Math.max(EDGE, frame.clientHeight - h - EDGE));
    // Only on a real change, so a re-measure never re-renders for nothing.
    setPos((prev) => (prev.ready && prev.left === left && prev.top === top ? prev : { left, top, ready: true }));
  }, [ref, x, y]);

  // Hidden for the one frame before it's measured, so it never flashes at the wrong spot.
  return { left: pos.left, top: pos.top, visibility: pos.ready ? ("visible" as const) : ("hidden" as const) };
}
