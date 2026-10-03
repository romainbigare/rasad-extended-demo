export const IRRIGATION_STRINGS = {
  figScored: { en: "Farms scored", ar: "المزارع المُقيَّمة" },
  figScoredSub: { en: "all farms with a score", ar: "جميع المزارع ذات الدرجة" },
  figAverage: { en: "Average efficiency ratio", ar: "متوسط نسبة الكفاءة" },
  figAverageSub: { en: "irrigation efficiency, 0 to 100", ar: "كفاءة الري، من 0 إلى 100" },
  figAbove: { en: "Ranked farms at or above {line}", ar: "المزارع المصنّفة عند {line} أو أعلى" },
  figBelow: { en: "Ranked farms below {line}", ar: "المزارع المصنّفة دون {line}" },
  figRankedOf: { en: "of {n} ranked farms", ar: "من أصل {n} مزرعة مصنّفة" },

  scaleTitle: { en: "How the score reads", ar: "كيف تُقرأ الدرجة" },
  scaleCaption: { en: "Irrigation efficiency, 0 to 100", ar: "كفاءة الري من 0 إلى 100" },
  belowTitle: { en: "Farms below the subsidy line of {line}", ar: "مزارع دون خط الدعم البالغ {line}" },
  belowCaption: { en: "Lowest scores first.", ar: "الأدنى درجة أولًا." },
  aboveTitle: { en: "Farms at or above the subsidy line of {line}", ar: "مزارع عند خط الدعم البالغ {line} أو أعلى" },
  aboveCaption: { en: "Highest scores first.", ar: "الأعلى درجة أولًا." },
  cappedNote: {
    en: "The first {n} farms are listed; the full list is in the holding records.",
    ar: "تُعرض أول {n} مزرعة؛ القائمة الكاملة في سجلات الحيازات.",
  },
  colCrops: { en: "Crops", ar: "المحاصيل" },
  colMethod: { en: "Irrigation method", ar: "طريقة الري" },
  colScore: { en: "Efficiency ratio", ar: "نسبة الكفاءة" },
  colBand: { en: "Band", ar: "الفئة" },
} as const;
