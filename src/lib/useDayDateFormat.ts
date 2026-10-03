import { useMemo } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export function useDayDateFormat(): (isoDate: string) => string {
  const { language } = useLanguage();
  return useMemo(() => {
    // UTC: a date-only value has no time zone, so a local zone must not move it to another day.
    const ar = new Intl.DateTimeFormat("ar-AE-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const en = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    return (isoDate: string) => {
      const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return isoDate;
      if (language === "ar") return ar.format(date);
      const part = (type: string) => en.formatToParts(date).find((p) => p.type === type)?.value ?? "";
      return `${part("day")} ${part("month")} ${part("year")}`;
    };
  }, [language]);
}
