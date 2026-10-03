import type { ReactNode } from "react";

import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useDayDateFormat } from "@/lib/useDayDateFormat";

const MIN_SCORED_PALMS = 3;

export const CHI_STRINGS = {
  chiCoverage: { en: "{scored} of {total} palms with a valid reading", ar: "{scored} من {total} نخلة بقراءة صالحة" },
  chiNoPalms: { en: "No date palms to score", ar: "لا توجد نخيل تمر لتقييمها" },
  chiTooFewPalms: {
    en: "No score: at least {min} palms need a clear-sky reading ({scored} of {total} read)",
    ar: "لا توجد نتيجة: يلزم وجود قراءة صافية لـ {min} نخلات على الأقل ({scored} من {total})",
  },
  chiLowCoverage: {
    en: "No score: only {scored} of {total} palms have a clear-sky reading (70% needed)",
    ar: "لا توجد نتيجة: {scored} فقط من {total} نخلة لديها قراءة صافية (المطلوب 70%)",
  },
  chiSatelliteDate: { en: "Satellite date: {date}", ar: "تاريخ الصورة الفضائية: {date}" },
  chiResolutionNote: {
    en: "Counts are approximate: 10 m satellite pixels do not resolve individual palms.",
    ar: "الأعداد تقريبية: دقة 10 م للصور الفضائية لا تميّز النخلة الواحدة.",
  },
  chiOneFarmNotScored: { en: "1 farm not scored (low clear-sky coverage)", ar: "مزرعة واحدة بدون نتيجة (تغطية صافية منخفضة)" },
  chiFarmsNotScored: {
    en: "{count} farms not scored (low clear-sky coverage)",
    ar: "{count} مزارع بدون نتيجة (تغطية صافية منخفضة)",
  },
  chiFullForm: { en: "Canopy Health Index", ar: "مؤشر صحة المظلة الشجرية" },
  chiMedian: { en: "Median {value}", ar: "الوسيط {value}" },
  chiPalmsScored: { en: "{count} palms scored", ar: "{count} نخلة مُقيَّمة" },
} as const;

/** "CHI" with its full form on hover. `abbr[title]` is underlined with dots by the global
 * reset, and the help cursor tells the reader it can be hovered. */
export function ChiAbbr() {
  const t = useT(CHI_STRINGS);
  return (
    <abbr title={t("chiFullForm")} className="cursor-help">
      CHI
    </abbr>
  );
}

export function withChiAbbr(text: string): ReactNode {
  const pieces = text.split(/\bCHI\b/);
  if (pieces.length === 1) return text;
  return pieces.flatMap((piece, index) => (index === 0 ? [piece] : [<ChiAbbr key={index} />, piece]));
}

/** The sentences around a CHI figure, in the UI language. */
export function useChiText() {
  const t = useT(CHI_STRINGS);
  const day = useDayDateFormat();
  const fill = (template: string, values: Record<string, string>) =>
    Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, value), template);

  return {
    coverage: (scored: number, total: number) =>
      fill(t("chiCoverage"), { scored: formatInteger(scored), total: formatInteger(total) }),
    /** Why a farm or field has no score, from its palm counts. */
    noScoreReason: (scored: number, total: number) => {
      if (total === 0) return t("chiNoPalms");
      const counts = { scored: formatInteger(scored), total: formatInteger(total), min: formatInteger(MIN_SCORED_PALMS) };
      return fill(t(scored < MIN_SCORED_PALMS ? "chiTooFewPalms" : "chiLowCoverage"), counts);
    },
    satelliteDate: (isoDate: string) => fill(t("chiSatelliteDate"), { date: day(isoDate) }),
    farmsNotScored: (count: number) =>
      count === 1 ? t("chiOneFarmNotScored") : fill(t("chiFarmsNotScored"), { count: formatInteger(count) }),
    median: (value: string) => fill(t("chiMedian"), { value }),
    palmsScored: (count: number) => fill(t("chiPalmsScored"), { count: formatInteger(count) }),
    resolutionNote: t("chiResolutionNote"),
  };
}
