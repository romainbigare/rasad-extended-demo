import { type ReactNode, useRef } from "react";

import { cx } from "./cx";
import { useFitText } from "./useFitText";

export type KpiTone = "light" | "dark" | "feature";

const TONE: Record<KpiTone, string> = {
  light: "bg-panel border-line",
  dark: "bg-teal-2 border-teal-3",
  feature: "bg-teal border-teal text-white",
};

export type KpiSize = "md" | "lg";

interface KpiTileProps {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  /** Right of the label, e.g. a share badge. */
  aside?: ReactNode;
  tone?: KpiTone;
  /** "lg" is the Executive View hero's larger headline style. */
  size?: KpiSize;
  /** With size "lg": a small grey UPPERCASE label instead of the bold one (Farm page KPIs). */
  capsLabel?: boolean;
  className?: string;
  testId?: string;
}

export function KpiTile({ label, value, sub, aside, tone = "light", size = "md", capsLabel = false, className, testId }: KpiTileProps) {
  const dark = tone !== "light";
  const lg = size === "lg";
  const valueRef = useRef<HTMLDivElement>(null);
  // lg figures stay on one line: shrink to fit a narrow tile instead of clipping (unchanged where they fit).
  useFitText(valueRef, lg);
  return (
    <div
      data-testid={testId}
      className={cx(
        "min-w-0 border",
        lg
          ? capsLabel && !dark
            ? "rounded-xl p-5 shadow-xs"
            : dark
              ? "rounded-lg p-3"
              : "rounded-xl p-4"
          : cx("rounded-xl p-3.5", !dark && "shadow-2xs"),
        TONE[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cx(
            lg
              ? capsLabel
                ? cx("text-[11px] font-bold uppercase tracking-wider", dark ? "text-onDark-label" : "text-muted")
                : cx("text-[11px] font-medium", dark ? "text-white/70" : "text-ink")
              : dark
                ? "text-xs font-semibold text-onDark-label"
                : "text-[11px] font-semibold uppercase tracking-[0.03em] text-muted",
          )}
        >
          {label}
        </div>
        {aside}
      </div>
      {/* overflow-hidden: an RTL context can position a long LTR numeral run
       * (e.g. a stress/real value like "12,345,678.90") starting outside this
       * box's left edge rather than wrapping it - contain it here rather than
       * rely on bidi text-wrapping behavior across languages. */}
      <div
        ref={valueRef}
        className={cx(
          "overflow-hidden font-extrabold leading-tight",
          lg
            ? capsLabel && !dark
              ? "mb-1 mt-1 min-h-[36px] whitespace-nowrap text-3xl !font-bold tabular-nums"
              : "mb-1 mt-1.5 min-h-[28px] whitespace-nowrap text-2xl !font-black tracking-tight tabular-nums"
            : "mb-1 mt-1 min-h-[24px] break-words text-xl",
        )}
      >
        {value}
      </div>
      {sub && (
        <div className={cx(lg && dark ? "text-[10px] leading-snug" : "text-[11px] leading-snug", dark ? "text-onDark-sub" : "text-muted")}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function ValueWithUnit({ value, unit, size = "md" }: { value: ReactNode; unit?: string; size?: KpiSize }) {
  return (
    <>
      {value}
      {unit && (
        <small className={cx("text-muted", size === "lg" ? "ms-1.5 text-sm font-normal" : "ms-1 text-xs font-medium")}>
          {unit}
        </small>
      )}
    </>
  );
}
