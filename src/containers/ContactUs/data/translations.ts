import type { Dict } from "@/lib/i18n/createDict";

export const STRINGS = {
  pageTitle: { en: "Contact Us", ar: "اتصل بنا" },
  sectionTitle: { en: "Contact ADAFSA", ar: "التواصل مع أدافسا" },
  sectionSubtitle: {
    en: "Abu Dhabi Agriculture and Food Safety Authority Regional Desks",
    ar: "المكاتب الإقليمية لهيئة أبوظبي للزراعة والسلامة الغذائية",
  },
} as const satisfies Dict;
