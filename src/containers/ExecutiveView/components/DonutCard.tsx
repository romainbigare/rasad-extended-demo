import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CardHeader } from "@/components/ui/Card";
import { useFilterHref } from "@/lib/filters/FilterContext";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";

/**
 * A compact donut card of the Executive View: title and one muted line on top, the donut (with its legend)
 * below, and a "View more" link to the module page at the bottom.
 */
export function DonutCard({
  title,
  icon,
  subtitle,
  to,
  testId,
  children,
}: {
  title: string;
  icon: LucideIcon;
  subtitle: string;
  /** The module page the link opens, e.g. "/modules/trees"; the region in the current link is kept. */
  to: string;
  testId: string;
  children: ReactNode;
}) {
  const t = useT(STRINGS);
  const href = useFilterHref();
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-panel p-4 shadow-xs" data-testid={testId}>
      <CardHeader className="!mb-0" title={title} icon={icon} subtitle={subtitle} />
      <div className="flex-1">{children}</div>
      <Link href={href(to)} className="inline-flex w-fit items-center gap-0.5 text-xs font-semibold text-green-d hover:underline">
        {t("viewMore")}
        <span aria-hidden className="inline-block rtl:-scale-x-100">›</span>
      </Link>
    </section>
  );
}
