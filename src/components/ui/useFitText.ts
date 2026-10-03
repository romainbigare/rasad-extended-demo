import { type RefObject, useEffect, useLayoutEffect } from "react";

/**
 * Shrinks a one-line (`whitespace-nowrap`) element's font, 1px at a time down to
 * `minPx`, only while its content overflows it - so a big figure in a narrow tile
 * fits instead of being clipped, and a figure that already fits keeps the class's
 * own size (the inline style is cleared first). Re-checks on every render (new
 * value) and whenever the element is resized.
 */
export function useFitText(ref: RefObject<HTMLElement>, enabled: boolean, minPx = 16) {
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = "";
    if (!enabled) return;
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth + 1 && size > minPx) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  };

  // Every render: the value (and so its width) may have changed.
  useLayoutEffect(fit);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `fit` only reads the ref
  }, [ref, enabled, minPx]);
}
