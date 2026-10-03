import { Clock } from "lucide-react";

import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { STRINGS } from "../../data/translations";

/** "Last updated: 1 Oct 2026, 09:30" for a weather card header's right corner; nothing until there's a time. */
export function LastUpdated({ at }: { at: Date | string | number | null | undefined }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  if (at === null || at === undefined || at === 0) return null;
  const date = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(date.getTime())) return null;
  const label = new Intl.DateTimeFormat(language === "ar" ? "ar-AE-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted" data-testid="weather-last-updated">
      <Clock size={14} strokeWidth={1.8} aria-hidden className="flex-none" />
      {t("weatherLastUpdated").replace("{time}", label)}
    </span>
  );
}
