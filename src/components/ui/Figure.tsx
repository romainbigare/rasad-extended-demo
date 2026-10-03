import type { ReactNode, Ref } from "react";

import { cx } from "./cx";

export interface Figure {
  /** Short muted name above the figure, in sentence case. */
  label: ReactNode;
  value: ReactNode;
  /** Muted unit after the value, e.g. "du". */
  unit?: string;
  /** One small muted line under the figure. */
  sub?: ReactNode;
  testId?: string;
}

/**
 * One headline figure: a muted label, the figure in ink, an optional unit and one muted line under it.
 * No box - it sits at the top right of a widget header (CardHeader `metrics`).
 */
export function FigureItem({ figure, className, itemRef }: { figure: Figure; className?: string; itemRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={itemRef} className={cx("min-w-0", className)} data-testid={figure.testId}>
      <dt className="text-xs text-muted sm:whitespace-nowrap">{figure.label}</dt>
      <dd className="m-0 mt-0.5 whitespace-nowrap text-xl font-bold leading-tight tabular-nums text-ink">
        {figure.value}
        {figure.unit && <small className="ms-1 text-xs font-normal text-muted">{figure.unit}</small>}
      </dd>
      {figure.sub && <div className="mt-0.5 text-[11px] leading-snug text-muted sm:whitespace-nowrap">{figure.sub}</div>}
    </div>
  );
}
