/** Strings of the common page frame (PageFrame, DataTable, ScoreScale). */
export const FRAME_STRINGS = {
  tabsLabel: { en: "Pages of this module", ar: "صفحات هذه الوحدة" },
  figuresLabel: { en: "Key figures", ar: "الأرقام الرئيسية" },

  // DataTable
  tableSortedAscending: { en: "sorted ascending", ar: "مرتب تصاعديًا" },
  tableSortedDescending: { en: "sorted descending", ar: "مرتب تنازليًا" },
  tableEmpty: { en: "Nothing to show for this selection.", ar: "لا شيء لعرضه لهذا الاختيار." },
  tableLoading: { en: "Loading…", ar: "جارٍ التحميل…" },
  tableError: {
    en: "Something went wrong on our end. Please check back later.",
    ar: "حدث خطأ ما من جانبنا. يرجى المحاولة لاحقًا.",
  },
  tableOpenFarm: { en: "Open {farm} in Farm Monitoring", ar: "فتح {farm} في مراقبة المزرعة" },

  // ScoreScale
  scaleSubsidyLine: { en: "Subsidy line {line}", ar: "خط الدعم {line}" },
  scaleThisFarm: { en: "This farm: {score}", ar: "هذه المزرعة: {score}" },
  scaleLabel: { en: "Irrigation efficiency scale", ar: "مقياس كفاءة الري" },
} as const;
