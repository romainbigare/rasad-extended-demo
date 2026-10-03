import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/** The title block keeps at least this much width (CardHeader's `sm:min-w-[240px]`) before a metric may take the room. */
const TITLE_MIN_WIDTH = 240;
/** Space between the title block and the metrics (HEADER_ROW_GAP, `sm:gap-x-6`). */
const HEADER_GAP = 24;
/** Space between two metrics (matches the metrics row's `sm:gap-x-8`). */
const METRIC_GAP = 32;

// Server render: no layout effect to run (and React warns about it); the first client paint renders all.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * How many of a widget header's metrics fit beside its title, so the header can hide the rest from the
 * END of the list instead of wrapping them under the title or squeezing the title.
 *
 * - Every metric stays mounted: the ones that do not fit are laid out `absolute` + `invisible` by the
 *   caller, which keeps their natural width measurable (no hidden copies, no measuring before hiding).
 * - The first render, and the server render, show all of them; a layout effect trims the list before the
 *   first client paint, and a ResizeObserver on the header, the actions and each metric re-trims it
 *   (a number arriving, the font loading, the window or sidebar resizing).
 * - Widths do not depend on whether a metric is shown, so the count settles in one pass - no loops.
 * - In the stacked (phone) layout - the header is a column - nothing is hidden: the caller wraps them
 *   under the title.
 */
export function useFitMetrics(
  headerRef: RefObject<HTMLElement>,
  actionsRef: RefObject<HTMLElement>,
  total: number,
): { shown: number; setMetricRef: (index: number) => (el: HTMLElement | null) => void } {
  const [shown, setShown] = useState(total);
  const metricEls = useRef<(HTMLElement | null)[]>([]);

  const measure = useCallback(() => {
    const header = headerRef.current;
    if (!header) return;
    const style = getComputedStyle(header);
    if (style.flexDirection !== "row") {
      setShown(total);
      return;
    }
    const actions = actionsRef.current;
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    let room = header.clientWidth - padding - TITLE_MIN_WIDTH - HEADER_GAP - (actions ? actions.offsetWidth + HEADER_GAP : 0);
    let count = 0;
    for (let i = 0; i < total; i++) {
      const w = metricEls.current[i]?.offsetWidth ?? 0;
      const need = w + (count > 0 ? METRIC_GAP : 0);
      if (need > room) break;
      room -= need;
      count += 1;
    }
    setShown(count);
  }, [headerRef, actionsRef, total]);

  // Every render: a metric's content (and so its width) may have changed.
  useIsoLayoutEffect(measure);

  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (headerRef.current) observer.observe(headerRef.current);
    if (actionsRef.current) observer.observe(actionsRef.current);
    metricEls.current.slice(0, total).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [measure, headerRef, actionsRef, total]);

  const setMetricRef = useCallback((index: number) => (el: HTMLElement | null) => {
    metricEls.current[index] = el;
  }, []);

  return { shown: Math.min(shown, total), setMetricRef };
}
