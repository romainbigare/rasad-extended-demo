export const YIELD_STRINGS = {
  figTotal: { en: "Total forecast", ar: "إجمالي التوقعات" },
  figFarms: { en: "Farms", ar: "المزارع" },
  figFarmsSub: { en: "registered holdings", ar: "حيازات مسجلة" },
  figAverage: { en: "Average per farm", ar: "المتوسط لكل مزرعة" },
  figAverageSub: { en: "forecast yield", ar: "الإنتاج المتوقع" },

  farmsTitle: { en: "Forecast yield by farm", ar: "الإنتاج المتوقع حسب المزرعة" },
  farmsCaption: {
    en: "Tonnes forecast for each farm, split into crops, date palms and fruit trees.",
    ar: "الأطنان المتوقعة لكل مزرعة، مقسمة إلى محاصيل ونخيل تمر وأشجار فاكهة.",
  },
  farmsCappedCaption: {
    en: "The {n} highest and {n} lowest farms are listed.",
    ar: "تُعرض أعلى {n} وأدنى {n} مزرعة.",
  },
  colYield: { en: "Forecast (t)", ar: "المتوقع (طن)" },
  colPerArea: { en: "Yield per {unit} (t)", ar: "الإنتاجية لكل {unit} (طن)" },
  colCrop: { en: "Crops (t)", ar: "المحاصيل (طن)" },
  colDatePalm: { en: "Date palms (t)", ar: "نخيل التمر (طن)" },
  colFruit: { en: "Fruit trees (t)", ar: "أشجار الفاكهة (طن)" },
  colCrops: { en: "Crops", ar: "المحاصيل" },

  calendarTitle: { en: "Planting and harvest by crop", ar: "الزراعة والحصاد حسب المحصول" },
  calendarCaption: {
    en: "From the first planting to the last harvest of each crop, as recorded on the farms.",
    ar: "من أول زراعة إلى آخر حصاد لكل محصول، كما هو مسجل في المزارع.",
  },
  calendarLoading: { en: "Loading the crop calendar…", ar: "جارٍ تحميل التقويم الزراعي…" },
  calendarError: {
    en: "Something went wrong on our end. Please check back later.",
    ar: "حدث خطأ ما من جانبنا. يرجى المحاولة لاحقًا.",
  },
  calendarEmptyTitle: { en: "No crop calendar to show yet", ar: "لا يوجد تقويم زراعي لعرضه بعد" },
  calendarEmptyBody: {
    en: "A crop calendar needs a planting date and a harvest date for each crop. No farm in this selection has both on file yet.",
    ar: "يحتاج التقويم الزراعي إلى تاريخ زراعة وتاريخ حصاد لكل محصول. لا توجد مزرعة في هذا الاختيار لديها التاريخان بعد.",
  },
  calendarChartLabel: { en: "Planting to harvest window of each crop", ar: "فترة الزراعة حتى الحصاد لكل محصول" },
  colPlanting: { en: "Planting", ar: "الزراعة" },
  colHarvest: { en: "Harvest", ar: "الحصاد" },
  colSeason: { en: "Season", ar: "الموسم" },
  colFarms: { en: "Farms", ar: "المزارع" },
  rangeTo: { en: "{from} to {to}", ar: "{from} إلى {to}" },
} as const;
