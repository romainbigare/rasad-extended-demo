import type { ReactNode } from "react";

import { EM_DASH } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { InlineError, SkeletonValue } from "./States";

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  /** react-query's "disabled, never ran" state - e.g. no farm selected yet. */
  isIdle?: boolean;
  refetch: () => unknown;
}

/** Renders one value out of a react-query result: skeleton, error+retry, the
 * value - or a plain "—" while the query is idle (nothing to ask for yet),
 * which is not an error and must not offer a Retry. */
export function QueryValue<T>({
  query,
  render,
  tone = "light",
  inline = false,
  quiet = false,
  fallback = null,
}: {
  query: QueryLike<T>;
  render: (data: T) => ReactNode;
  tone?: "light" | "dark";
  /** Small skeleton for values inside running text. */
  inline?: boolean;
  /**
   * For secondary values (subtitles, counts) that share a query with a main
   * value on the same card: on error, render `fallback` instead of a second
   * "Couldn't load · Retry" - the main value already shows one, and its Retry
   * reloads this too.
   */
  quiet?: boolean;
  fallback?: ReactNode;
}) {
  const { language } = useLanguage();
  if (query.isIdle) return <>{EM_DASH}</>;
  if (query.isLoading) return <SkeletonValue tone={tone} className={inline ? "h-3 w-10" : undefined} />;
  if (query.isError || query.data === undefined) {
    if (quiet) return <>{fallback}</>;
    return <InlineError tone={tone} message={t("couldntLoad", language)} />;
  }
  return <>{render(query.data)}</>;
}
