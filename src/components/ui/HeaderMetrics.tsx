import { useRef } from "react";

import { cx } from "./cx";
import { type Figure, FigureItem } from "./Figure";
import { useFitMetrics } from "./useFitMetrics";

/** Classes for the header's title block when it has metrics beside it: a floor of width, and the rest of the row. */
export const TITLE_BLOCK_WITH_METRICS = "sm:min-w-[240px] sm:flex-1";
/** Classes for a header row that may hold metrics (add them to the row's own flex classes). */
export const HEADER_ROW_GAP = "sm:gap-x-6";

const NO_METRICS: Figure[] = [];
/** A header never shows more than this many metrics; the rest of the list is left out. */
const MAX_METRICS = 3;

/**
 * A widget header's metrics, top right, aligned with the title. Shared by CardHeader and the module
 * pages' Section header so every widget looks the same.
 *
 * At most MAX_METRICS are kept, the first ones of the list.
 *
 * Put `headerRef` on the header row (title block, then `metricsNode`, then actions) and `actionsRef`
 * on the actions wrapper; give the title block TITLE_BLOCK_WITH_METRICS. When the row lacks the width,
 * metrics hide from the END of the list (see useFitMetrics); on phones, where the row stacks, they show
 * in a two-column grid under the title.
 */
export function useHeaderMetrics(metrics: Figure[] | undefined) {
  const headerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const figures = metrics ? metrics.slice(0, MAX_METRICS) : NO_METRICS;
  const { shown, setMetricRef } = useFitMetrics(headerRef, actionsRef, figures.length);
  const metricsNode = metrics ? (
    <dl
      className="relative m-0 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-none sm:flex-nowrap sm:gap-x-8"
      data-testid="header-metrics"
    >
      {figures.map((figure, i) => (
        <FigureItem
          key={i}
          figure={figure}
          itemRef={setMetricRef(i)}
          // Not shown: still laid out (so it can be measured) but invisible, out of the flow and inert.
          className={cx(i >= shown && "sm:pointer-events-none sm:invisible sm:absolute sm:end-0 sm:top-0")}
        />
      ))}
    </dl>
  ) : null;
  return { headerRef, actionsRef, metricsNode };
}
