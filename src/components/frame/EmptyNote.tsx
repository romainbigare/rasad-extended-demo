import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

/**
 * A plain-language empty state: what is not here and what the platform needs before it can be.
 * Used where the API has no data (history, season budgets) - never a chart of made-up numbers.
 */
export function EmptyNote({ title, children, className, testId }: { title: string; children: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={cx("rounded-lg border border-dashed border-line bg-[#fafbfb] px-5 py-6 text-center", className)} data-testid={testId ?? "empty-note"}>
      <p className="m-0 text-sm font-medium">{title}</p>
      <p className="m-0 mx-auto mt-1 max-w-xl text-xs leading-relaxed text-muted">{children}</p>
    </div>
  );
}
