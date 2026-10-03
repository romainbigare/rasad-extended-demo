import type { ElementType } from "react";

import { cx } from "./cx";

/**
 * One-line text that ends in "…" when it doesn't fit. The full text on hover comes from the
 * app-wide AutoTruncateTooltip (mounted in _app), which covers any truncated text.
 */
export function TruncatedText({
  text,
  as: Tag = "span",
  className,
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) {
  return <Tag className={cx("block truncate", className)}>{text}</Tag>;
}
