export const LAND_STRINGS = {
  figTotalArea: { en: "Mapped area", ar: "المساحة المرسومة" },
  figTotalAreaSub: { en: "all land-use classes", ar: "جميع فئات استخدام الأراضي" },
  figOpen: { en: "Open agriculture", ar: "الزراعة المكشوفة" },
  figProtected: { en: "Protected agriculture", ar: "الزراعة المحمية" },
  figBarren: { en: "Barren land", ar: "الأراضي القاحلة" },

  figStructuresArea: { en: "Structures area", ar: "مساحة المنشآت" },
  figStructuresCount: { en: "Structures", ar: "المنشآت" },
  figFarmsWith: { en: "Farms with structures", ar: "المزارع ذات المنشآت" },
  // The API's single largest structure (its type and its area), not the largest type: the table below sums areas by type.
  figLargestStructure: { en: "Largest single structure", ar: "أكبر منشأة منفردة" },

  structuresTitle: { en: "Structures", ar: "المنشآت" },
  structuresCaption: { en: "Built structures on farms: the total, and the area by type.", ar: "المنشآت المبنية في المزارع: الإجمالي والمساحة حسب النوع." },
  colType: { en: "Type", ar: "النوع" },
  colCount: { en: "Count", ar: "العدد" },
  colArea: { en: "Area ({unit})", ar: "المساحة ({unit})" },
  colShare: { en: "Share of area", ar: "حصة المساحة" },
  largestHolding: {
    en: "Largest holding of structures: {farm}, {area} {unit}.",
    ar: "أكبر حيازة منشآت: {farm}، {area} {unit}.",
  },
} as const;
