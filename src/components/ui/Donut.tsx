import type { ReactNode } from "react";

import { formatPercent } from "@/lib/format";

import { cx } from "./cx";

export interface DonutItem {
  key: string;
  label: string;
  color: string;
  /** Share, 0-100. null shows "—" in the legend and draws no segment. */
  pct: number | null;
  /** Optional muted text after the name, e.g. a count "(2,687,991)". */
  detail?: string;
}

const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Shortest drawn segment (in circumference units), so a 0.2% class is still a visible sliver. */
const MIN_SEGMENT = 1.4;

/**
 * A small donut chart with a compact legend (colour, name, share). Pure SVG, no dependencies.
 * - Sizes to its content (chart + legend), so it sits in a card as wide as it needs; give the card its
 *   title and supporting text (CardHeader or DonutCard), not the chart.
 * - Accessible: the SVG is a `role="img"` with `ariaLabel` (give it a one-sentence summary); the legend is
 *   the keyboard path: with `onSelect` each legend row is a button, and clicking a segment does the same.
 * - RTL-safe: the ring is symmetric and starts at 12 o'clock; only the legend and layout follow the
 *   writing direction (logical spacing, no left/right).
 * - `selectedKey` dims the other segments and legend rows.
 */
export function Donut({
  items,
  ariaLabel,
  selectedKey,
  onSelect,
  centerValue,
  centerCaption,
  size = 116,
  testId,
  legendTestId,
  className,
}: {
  items: DonutItem[];
  ariaLabel: string;
  selectedKey?: string | null;
  onSelect?: (key: string) => void;
  /** Big text in the hole, e.g. "3,184,645". */
  centerValue?: ReactNode;
  /** Small text under it, e.g. "trees". */
  centerCaption?: ReactNode;
  size?: number;
  testId?: string;
  legendTestId?: string;
  className?: string;
}) {
  const dim = (key: string) => Boolean(selectedKey) && selectedKey !== key;
  const drawn = items.filter((item) => (item.pct ?? 0) > 0);
  const sum = drawn.reduce((total, item) => total + (item.pct ?? 0), 0);
  const scale = sum > 100 ? 100 / sum : 1; // shares that add up past 100 still fit in one ring
  let offset = 0;
  const segments = drawn.map((item) => {
    const length = Math.max(MIN_SEGMENT, ((item.pct ?? 0) * scale * CIRCUMFERENCE) / 100);
    const segment = { item, length, offset };
    offset += length;
    return segment;
  });

  return (
    <div className={cx("flex w-fit max-w-full flex-wrap items-center gap-x-6 gap-y-3", className)} data-testid={testId}>
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={ariaLabel} className="-rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#e9eeec" strokeWidth="11" />
          {segments.map(({ item, length, offset: start }) => (
            <circle
              key={item.key}
              cx="50"
              cy="50"
              r={RADIUS}
              fill="none"
              stroke={item.color}
              strokeWidth={selectedKey === item.key ? 14 : 11}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-start}
              className={cx("transition-opacity", dim(item.key) && "opacity-35", onSelect && "cursor-pointer hover:opacity-80")}
              onClick={onSelect ? () => onSelect(item.key) : undefined}
            >
              <title>{`${item.label} ${formatPercent(item.pct)}`}</title>
            </circle>
          ))}
        </svg>
        {(centerValue || centerCaption) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-tight">
            {centerValue && <b className="text-[11px] font-bold tabular-nums text-ink">{centerValue}</b>}
            {centerCaption && <span className="text-[10px] text-muted">{centerCaption}</span>}
          </div>
        )}
      </div>

      <ul
        className={cx("m-0 flex min-w-[150px] list-none flex-col gap-1 p-0 text-xs", items.length > 6 && "max-h-[8.5rem] overflow-y-auto pe-1")}
        data-testid={legendTestId}
      >
        {items.map((item) => {
          const content = (
            <>
              <i aria-hidden className="inline-block h-2.5 w-2.5 flex-none rounded-[3px]" style={{ background: item.color }} />
              <span className="min-w-0 flex-1 truncate">
                {item.label}
                {item.detail && <span className="ms-1.5 font-normal text-muted">{item.detail}</span>}
              </span>
              <b className="flex-none font-bold tabular-nums">{formatPercent(item.pct)}</b>
            </>
          );
          return (
            <li key={item.key} className={cx("transition-opacity", dim(item.key) && "opacity-50")}>
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={selectedKey === item.key}
                  onClick={() => onSelect(item.key)}
                  className="flex w-full items-center gap-2 rounded-md text-start hover:underline touch:min-h-[36px]"
                >
                  {content}
                </button>
              ) : (
                <span className="flex items-center gap-2">{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One sentence for a donut's `ariaLabel`: "<what>: Name 34%, Name 19%, ..." (largest first, at most `max`). */
export function donutSummary(what: string, items: DonutItem[], max = 6): string {
  const shown = [...items]
    .filter((item) => item.pct !== null)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
    .slice(0, max)
    .map((item) => `${item.label} ${formatPercent(item.pct)}`);
  return shown.length ? `${what}: ${shown.join(", ")}` : what;
}
