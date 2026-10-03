import type { ReactNode } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { cx } from "./cx";
import { asset } from "@/lib/assetPath";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { language } = useLanguage();
  const resolvedLabel = label ?? t("loading", language);
  return (
    <span role="status" className={cx("inline-flex items-center", className)}>
      <span
        aria-hidden
        className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-green-d"
      />
      <span className="sr-only">{resolvedLabel}</span>
    </span>
  );
}

export function FullPageLoader({ label }: { label?: string }) {
  const { language } = useLanguage();
  const resolvedLabel = label ?? t("loading", language);
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-4 text-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- static
         * export + images.unoptimized:true (next.config.js), same as the
         * sidebar's use of this asset. */}
        <img src={asset("/images/adafsa-logo.png")} alt="" aria-hidden className="h-14 w-auto" />
        <Spinner className="scale-150" label={resolvedLabel} />
        <span className="text-xs font-semibold">{resolvedLabel}…</span>
      </div>
    </div>
  );
}

/** Placeholder bar where a number will land. */
export function SkeletonValue({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block h-7 w-24 animate-pulse rounded-md align-middle",
        tone === "dark" ? "bg-teal-3" : "bg-line",
        className,
      )}
    />
  );
}

export function InlineError({
  message,
  tone = "light",
}: {
  message: string;
  tone?: "light" | "dark";
}) {
  return (
    <span
      role="alert"
      className={cx(
        "inline-flex flex-wrap items-center gap-2 whitespace-normal text-xs font-semibold",
        tone === "dark" ? "text-onDark-orange" : "text-red",
      )}
    >
      {message}
    </span>
  );
}

export function ErrorState({
  title,
  message,
  className,
}: {
  title?: string;
  message: ReactNode;
  className?: string;
}) {
  const { language } = useLanguage();
  return (
    <div
      role="alert"
      className={cx(
        "flex flex-col items-center justify-center gap-2 rounded-[10px] border border-[#f2b8b0] bg-red-l px-3 py-4 text-center",
        className,
      )}
    >
      <b className="text-red">{title ?? t("somethingWentWrong", language)}</b>
      <p className="m-0 max-w-md text-xs text-ink">{message}</p>
    </div>
  );
}
