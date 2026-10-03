import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cx } from "./cx";
import type { Figure } from "./Figure";
import { HEADER_ROW_GAP, TITLE_BLOCK_WITH_METRICS, useHeaderMetrics } from "./HeaderMetrics";
import { TitleIcon } from "./TitleIcon";

export type CardTone = "light" | "dark" | "darkInset";

const TONE: Record<CardTone, string> = {
  light: "bg-panel border-line shadow-xs",
  dark: "bg-teal border-teal text-[#e7f0ee]",
  darkInset: "bg-teal-2 border-teal-3 text-[#e7f0ee]",
};

interface CardProps {
  tone?: CardTone;
  className?: string;
  children: ReactNode;
  testId?: string;
  as?: "section" | "div";
}

export function Card({ tone = "light", className, children, testId, as = "section" }: CardProps) {
  const Tag = as;
  return (
    <Tag
      data-testid={testId}
      className={cx("relative rounded-card border p-5", TONE[tone], className)}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title?: ReactNode;
  /** The widget's icon, shown before the title. Main widgets only - not the sub-cards inside them. */
  icon?: LucideIcon;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /**
   * The widget's headline figures, most important first: shown at the top right of the header, aligned
   * with the title. When the header lacks the width they hide from the END of the list (none when not
   * even one fits) - they never wrap under the title or squeeze it. On phones, where the header stacks,
   * they all show in a two-column grid under the title.
   */
  metrics?: Figure[];
  tone?: CardTone;
  /** "lg" is the Executive View hero's larger section-title style. */
  size?: "md" | "lg";
  /**
   * Width below which the actions stack under the title. "lg" suits wide
   * actions (a 400px picker, search + buttons) that would otherwise squeeze
   * the title to one word per line on tablet widths.
   */
  stackBelow?: "sm" | "lg";
  className?: string;
}

export function CardHeader({
  title,
  icon,
  subtitle,
  actions,
  metrics,
  tone = "light",
  size = "md",
  stackBelow = "sm",
  className,
}: CardHeaderProps) {
  const dark = tone !== "light";
  const lg = size === "lg";
  const { headerRef, actionsRef, metricsNode } = useHeaderMetrics(metrics);
  return (
    <div
      ref={headerRef}
      className={cx(
        "flex flex-col gap-3",
        stackBelow === "lg"
          ? "lg:flex-row lg:items-start lg:justify-between"
          : "sm:flex-row sm:items-start sm:justify-between",
        metrics && HEADER_ROW_GAP,
        lg ? "mb-3" : "mb-3",
        className,
      )}
    >
      <div className={cx("min-w-0", metrics && TITLE_BLOCK_WITH_METRICS)}>
        {title && (
          <h3
            className={cx(
              "m-0 leading-snug",
              icon && "flex items-start gap-2",
              lg ? "text-base font-extrabold tracking-tight" : "text-sm font-bold",
            )}
          >
            {/* The icon is centred on the title's first line (line-height 1.375). */}
            {icon && <TitleIcon icon={icon} className={cx(lg ? "mt-[3px]" : "mt-[1.5px]", dark && "text-onDark-sub")} />}
            {icon ? <span className="min-w-0">{title}</span> : title}
          </h3>
        )}
        {subtitle && (
          <div className={cx(lg ? "mt-0.5 text-xs" : "mt-[3px] text-xs", dark ? "text-onDark-sub" : "text-muted")}>
            {subtitle}
          </div>
        )}
      </div>
      {metricsNode}
      {actions && (
        <div ref={actionsRef} className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
