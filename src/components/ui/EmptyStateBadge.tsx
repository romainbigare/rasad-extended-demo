import type { ReactNode } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { cx } from "./cx";

export function useUnavailableReason(): string {
  const { language } = useLanguage();
  return t("backendEndpointNotAvailable", language);
}

export function EmptyStateBadge({
  endpoint,
  reason: reasonOverride,
  tone = "light",
  size = "value",
}: {
  endpoint?: string;
  /** Hover/screen-reader text; defaults to the generic "not available" message. */
  reason?: string;
  tone?: "light" | "dark";
  size?: "value" | "inline";
}) {
  const unavailable = useUnavailableReason();
  const reason = reasonOverride ?? unavailable;
  return (
    <span
      title={reason}
      data-testid="endpoint-unavailable"
      data-endpoint={endpoint}
      className="inline-flex flex-wrap items-center gap-2 align-middle"
    >
      <span
        aria-hidden
        className={cx(
          "font-extrabold",
          size === "value" ? "text-xl leading-none" : "text-sm",
          tone === "dark" ? "text-onDark-sub" : "text-[#b9c4c0]",
        )}
      >
        —
      </span>
      <span className="sr-only">{reason}</span>
    </span>
  );
}

export function UnavailablePanel({
  title,
  endpoint,
  children,
  className,
}: {
  title?: string;
  endpoint?: string;
  children?: ReactNode;
  className?: string;
}) {
  const { language } = useLanguage();
  return (
    <div
      data-testid="endpoint-unavailable-panel"
      data-endpoint={endpoint}
      className={cx(
        "flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#d3dbd8] bg-[#fafbfb] px-4 py-5 text-center",
        className,
      )}
    >
      <b className="text-xs">{title ?? t("backendEndpointNotAvailable", language)}</b>
      {children && <p className="m-0 max-w-lg text-xs text-muted">{children}</p>}
    </div>
  );
}
