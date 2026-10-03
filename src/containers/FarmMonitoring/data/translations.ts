export const STRINGS = {
  // Page
  pageTitle: { en: "Farm Detail", ar: "تفاصيل المزرعة" },

  // MonitoringHeader
  headerSingleFarmModeBadge: { en: "Single farm mode", ar: "وضع المزرعة الواحدة" },
  headerSingleFarmCaption: {
    en: "One farm",
    ar: "مزرعة واحدة",
  },
  headerFarmLoadError: {
    en: "This farm isn’t available right now. Please check back later.",
    ar: "هذه المزرعة غير متاحة حاليًا. يرجى المحاولة لاحقًا.",
  },
  headerTelemetryDescription: {
    en: "Satellite imagery of one farm with the NDVI index, field boundaries and the timeline of satellite passes.",
    ar: "صور الأقمار الصناعية لمزرعة واحدة مع مؤشر NDVI وحدود الحقول والجدول الزمني لمرور الأقمار الصناعية.",
  },
  headerZoneNotAssigned: { en: "Zone not assigned", ar: "لم يتم تعيين منطقة" },
  headerCentroidTitle: {
    en: "Centre of the farm's boundary extent, not a surveyed point",
    ar: "مركز نطاق حدود المزرعة، وليس نقطة مساحية معتمدة",
  },
  headerNoBoundary: { en: "no boundary on file", ar: "لا توجد حدود مسجّلة" },
  headerLatestPassLabel: { en: "Latest pass", ar: "آخر مرور" },
  headerNextOverpassLabel: { en: "Next overpass", ar: "المرور القادم" },
  headerActiveFarmSelection: { en: "Farm", ar: "المزرعة" },
  headerHoldingsSuffix: { en: "holdings", ar: "حيازة" },
  fieldModelLabel: { en: "Field model", ar: "نموذج الحقول" },
  fieldModelDefault: { en: "(default)", ar: "(افتراضي)" },
  fieldModelLoading: { en: "Loading…", ar: "جارٍ التحميل…" },
  headerExportDossier: { en: "Export farm dossier", ar: "تصدير ملف المزرعة" },


  // The three views of the page, the inspector's findings and the profile.
  viewProfile: { en: "Profile", ar: "الملف" },
  viewCheck: { en: "What to check", ar: "ما يجب فحصه" },
  viewSatellite: { en: "Satellite detail", ar: "التفاصيل الفضائية" },
  checkTitle: { en: "What to check", ar: "ما يجب فحصه" },
  checkCaption: {
    en: "Statements of fact from the current readings, the most important first.",
    ar: "عبارات واقعية مستمدة من القراءات الحالية، الأهم أولًا.",
  },
  checkPrint: { en: "Print", ar: "طباعة" },
  checkNothing: { en: "Nothing to check on this farm from the current readings.", ar: "لا يوجد ما يجب فحصه في هذه المزرعة وفق القراءات الحالية." },
  checkPartial: {
    en: "Some readings could not be loaded, so this list may be incomplete.",
    ar: "تعذّر تحميل بعض القراءات، لذا قد تكون هذه القائمة غير مكتملة.",
  },
  checkLoading: { en: "Loading readings…", ar: "جارٍ تحميل القراءات…" },
  levelAct: { en: "Act", ar: "إجراء" },
  levelWatch: { en: "Watch", ar: "مراقبة" },
  findingWaterOver: { en: "Water demand {pct}% above allocation this month", ar: "الطلب على المياه أعلى من الحصة بنسبة {pct}% هذا الشهر" },
  findingWaterNear: { en: "Water demand at {pct}% of allocation this month", ar: "الطلب على المياه يبلغ {pct}% من الحصة هذا الشهر" },
  findingIerBelow: {
    en: "Irrigation efficiency {score} ({band}), below the subsidy line of {line}",
    ar: "كفاءة الري {score} ({band})، دون حد الدعم البالغ {line}",
  },
  findingIerBand: { en: "Irrigation efficiency {score}, in the {band} band", ar: "كفاءة الري {score}، ضمن فئة {band}" },
  findingPalms: {
    en: "{n} palms show stress ({pct}% of {scored} scored)",
    ar: "{n} نخلة تظهر عليها علامات إجهاد ({pct}% من {scored} نخلة مُقيَّمة)",
  },

  profileGrowsTitle: { en: "What the farm grows", ar: "ما تزرعه المزرعة" },
  profileGrowsCaption: { en: "Crops on the farm's fields and the area they cover.", ar: "المحاصيل في حقول المزرعة والمساحة التي تغطيها." },
  profileNoCrops: { en: "No crops are recorded on this farm's fields.", ar: "لا توجد محاصيل مسجلة في حقول هذه المزرعة." },
  profileColCrop: { en: "Crop", ar: "المحصول" },
  profileColArea: { en: "Planted area ({unit})", ar: "المساحة المزروعة ({unit})" },
  profileColShare: { en: "Share", ar: "الحصة" },
  profileColFields: { en: "Fields", ar: "الحقول" },
  profileTreesTitle: { en: "Trees", ar: "الأشجار" },
  profileTreesCaption: { en: "Date palms on the farm and their canopy health.", ar: "نخيل التمر في المزرعة وصحة مظلته الشجرية." },
  profileTreesTotal: { en: "Trees on the farm", ar: "الأشجار في المزرعة" },
  profileTreesScored: { en: "Palms scored", ar: "النخيل المُقيَّم" },
  profileTreesChi: { en: "Canopy Health Index", ar: "مؤشر صحة المظلة الشجرية" },
  profileTreesNone: { en: "No trees are recorded on this farm.", ar: "لا توجد أشجار مسجلة في هذه المزرعة." },
  profileTreesDate: { en: "Satellite date", ar: "تاريخ الصورة الفضائية" },
  scoreNoteCaption: { en: "Irrigation efficiency, 0 to 100, with this farm marked", ar: "كفاءة الري من 0 إلى 100، مع تمييز هذه المزرعة" },
  scoreNoteTitle: { en: "How the score reads", ar: "كيف تُقرأ الدرجة" },

  // MonitoringKpiGrid
  kpiHealthNoTrees: { en: "No trees for CHI", ar: "لا توجد أشجار لحساب CHI" },
  kpiHealthNoScore: { en: "No CHI score yet", ar: "لا توجد نتيجة CHI بعد" },
  // Short unit tags: the Current Health card names each index beside its number,
  // because a farm can show CHI (its palms), NDVI (its crops) or both.
  kpiChiTag: { en: "Canopy Health Index", ar: "مؤشر صحة المظلة الشجرية" },
  kpiNdviTag: { en: "Mean NDVI", ar: "متوسط NDVI" },
  // Share of the scored palms in each band, as numbers under the CHI bar. Prefixed "Palms:" so
  // it reads as a per-palm count, never as another word for the farm's own rating above it.
  kpiStatusSplit: {
    en: "Palms: {healthy}% Healthy · {monitor}% Monitor · {at_risk}% At risk",
    ar: "النخيل: {healthy}% صحية · {monitor}% قيد المراقبة · {at_risk}% معرّضة للخطر",
  },
  chiStatusHealthy: { en: "Healthy", ar: "صحية" },
  chiStatusMonitor: { en: "Monitor", ar: "قيد المراقبة" },
  chiStatusAtRisk: { en: "At Risk", ar: "معرّضة للخطر" },
  kpiTotalTonnes: { en: "Total Tonnes", ar: "إجمالي الأطنان" },
  kpiYieldCrop: { en: "Crop", ar: "المحاصيل" },
  kpiYieldDates: { en: "Dates", ar: "التمور" },
  kpiYieldFruits: { en: "Fruits", ar: "الفواكه" },
  kpiIrrigationDelivery: { en: "Irrigation Delivery:", ar: "طريقة الري:" },
  kpiMeanNdvi: { en: "Mean NDVI:", ar: "متوسط NDVI:" },
  kpiVigor: { en: "Vigor:", ar: "الحيوية:" },
  kpiWaterDaily: { en: "Daily", ar: "يومي" },
  kpiWaterWeekly: { en: "Weekly", ar: "أسبوعي" },
  kpiWaterMonthly: { en: "Monthly", ar: "شهري" },
  kpiWaterUnitLabel: { en: "Water unit", ar: "وحدة المياه" },
  waterStatusNormal: { en: "Normal", ar: "طبيعي" },
  waterStatusNearQuota: { en: "Near quota", ar: "قريب من الحصة" },
  waterStatusOverQuota: { en: "Over quota", ar: "تجاوز الحصة" },
  waterStatusNoQuota: { en: "No quota", ar: "لا توجد حصة" },
  kpiHealthLabel: { en: "1. Current Health", ar: "1. الحالة الصحية الحالية" },
  kpiYieldLabel: { en: "2. Current Yield", ar: "2. الإنتاجية الحالية" },
  kpiIerLabel: { en: "3. Current IER", ar: "3. كفاءة الري الحالية (IER)" },
  // "{line}" is the IER subsidy line (lib/scores.ts), marked by a tick on the bar.
  kpiSubsidyLine: { en: "Subsidy line {line}", ar: "حد الدعم {line}" },
  kpiWaterLabel: { en: "4. Water Demand", ar: "4. الاحتياج المائي" },

  // WaterYieldDetails (after the KPI cards)
  detailsTitle: { en: "Water and yield", ar: "المياه والإنتاجية" },
  detailsSubtitle: {
    en: "This month's water demand against the farm's allocation, and yield per unit of area",
    ar: "الطلب الشهري على المياه مقارنةً بحصة المزرعة، والإنتاجية لكل وحدة مساحة",
  },
  detailsWaterLabel: { en: "Monthly demand against allocation", ar: "الطلب الشهري مقارنةً بالحصة" },
  detailsOfAllocation: { en: "of the allocation", ar: "من الحصة" },
  detailsAllocation: { en: "Monthly allocation", ar: "الحصة الشهرية" },
  detailsStatus: { en: "Status", ar: "الحالة" },
  detailsYieldLabel: { en: "Productivity", ar: "الإنتاجية" },
  // "{unit}" is the short unit of the global area toggle ("du" / "ha").
  detailsPerArea: { en: "t / {unit}", ar: "طن / {unit}" },

  // IndexMapSection
  indexMapTitle: {
    en: "Index Map & Satellite Pass Timeline",
    ar: "خريطة المؤشرات وجدول المرور الساتلي",
  },
  indexLoadingImagery: { en: "Loading imagery…", ar: "جارٍ تحميل الصور…" },
  indexImageryRateLimited: {
    en: "Too many imagery requests - try again shortly.",
    ar: "عدد كبير جدًا من طلبات الصور - يرجى المحاولة مرة أخرى بعد قليل.",
  },
  indexImageryError: {
    en: "Vegetation index imagery isn’t available right now. Please check back later.",
    ar: "صور مؤشر الغطاء النباتي غير متاحة حاليًا. يرجى المحاولة لاحقًا.",
  },
  indexImageryEmpty: { en: "No imagery available for this pass.", ar: "لا تتوفر صور لهذا المرور." },
  indexImageryShowing: { en: "Showing {index} · {date}", ar: "عرض {index} · {date}" },
  indexNoIndexForSatellite: { en: "No imagery for this satellite", ar: "لا تتوفر صور لهذا القمر الصناعي" },
  indexSelectScene: { en: "Select a scene", ar: "اختر مشهدًا" },

  // SatellitePassRibbon
  ribbonLoadingPasses: { en: "Loading satellite passes…", ar: "جارٍ تحميل مرورات الأقمار الصناعية…" },
  ribbonLoadError: {
    en: "Satellite pass schedule isn’t available right now. Please check back later.",
    ar: "جدول مرور الأقمار الصناعية غير متاح حاليًا. يرجى المحاولة لاحقًا.",
  },
  ribbonNoPasses: {
    en: "No passes match these filters in this date range.",
    ar: "لا توجد مرورات مطابقة لهذه المرشحات ضمن هذا النطاق الزمني.",
  },
  ribbonNextPassLabel: { en: "Next pass", ar: "المرور القادم" },
  ribbonNoRepeatCycle: {
    en: "No fixed repeat cycle for this satellite yet",
    ar: "لا توجد دورة تكرار ثابتة لهذا القمر الصناعي بعد",
  },
  ribbonScanSummary: {
    en: "{count} farm scans from {satellites} satellites in last {days} days",
    ar: "{count} مسحًا للمزرعة من {satellites} قمرًا صناعيًا خلال آخر {days} يومًا",
  },
  ribbonLoadingScanSummary: { en: "Loading scan summary…", ar: "جارٍ تحميل ملخص المسح…" },
  ribbonAllSatellites: { en: "All satellites", ar: "جميع الأقمار الصناعية" },
  ribbonSelectStart: { en: "Start", ar: "البداية" },
  ribbonSelectEnd: { en: "End", ar: "النهاية" },
  ribbonSelectDateRange: { en: "Select date range", ar: "اختر النطاق الزمني" },
  ribbonScrollEarlier: { en: "Scroll earlier", ar: "التمرير إلى الأقدم" },
  ribbonScrollLater: { en: "Scroll later", ar: "التمرير إلى الأحدث" },

  // IndexMapSection layer toggles
  hriToggleLabel: { en: "HRI Imagery", ar: "صور عالية الدقة (HRI)" },
  indexOverlayToggleTemplate: { en: "{index} Overlay", ar: "طبقة {index}" },

  // FieldParcelsTable
  columnFieldName: { en: "Field Name", ar: "اسم الحقل" },
  columnCropStand: { en: "Crop Stand", ar: "الغطاء المحصولي" },
  columnArea: { en: "Area", ar: "المساحة" },
  columnHealthIndex: { en: "Health Index", ar: "مؤشر الصحة" },
  columnProjectedYield: { en: "Projected Yield", ar: "الإنتاجية المتوقعة" },
  columnCoordinates: { en: "Coordinates", ar: "الإحداثيات" },
  irrigationIerLabel: { en: "Irrigation (IER)", ar: "الري (IER)" },
  fieldParcelsTitlePrefix: {
    en: "Field Parcels & Managed Plots in",
    ar: "قطع الحقول والمساحات المُدارة في",
  },
  fieldParcelsTitle: { en: "Field Parcels & Managed Plots", ar: "قطع الحقول والمساحات المُدارة" },
  fieldParcelsSubtitleDefault: {
    en: "Individual crop health and irrigation performance, once a farm is selected",
    ar: "أداء صحة المحاصيل والري لكل حقل على حدة، بعد اختيار مزرعة",
  },
  fieldTableLoading: { en: "Loading fields…", ar: "جارٍ تحميل الحقول…" },
  fieldTableError: {
    en: "This farm’s fields aren’t available right now. Please check back later.",
    ar: "حقول هذه المزرعة غير متاحة حاليًا. يرجى المحاولة لاحقًا.",
  },
  fieldTableEmpty: { en: "This farm has no fields on file.", ar: "لا توجد حقول مسجّلة لهذه المزرعة." },
  activePolygonsTemplate: {
    en: "{count} active polygons · Individual crop health and irrigation performance",
    ar: "{count} مضلعات نشطة · صحة المحاصيل والري لكل حقل",
  },
  cropStandTreesTemplate: { en: "{crop} ({trees} trees)", ar: "{crop} ({trees} شجرة)" },
  chiCellLabel: { en: "CHI", ar: "CHI" },
  ndviCellLabel: { en: "NDVI", ar: "NDVI" },
  healthPillTemplate: { en: "{pct}", ar: "{pct}" },
  ndviCellTemplate: { en: "{value}", ar: "{value}" },
  ierCellTemplate: { en: "{pct}% IER", ar: "IER {pct}%" },
  // The table's last row: the farm's trees outside any field, scored together by IER as one more field.
  treeFieldName: { en: "Tree field", ar: "حقل الأشجار" },
  treeFieldCropStand: { en: "Trees outside any field", ar: "أشجار خارج الحقول" },
  yieldCellTemplate: { en: "{tonnes} Tonnes", ar: "{tonnes} طن" },

  // FieldDetailPanel
  fieldDetailTitle: { en: "Field drill-down", ar: "تفاصيل الحقل" },
  fieldDetailFieldLabel: { en: "Field", ar: "الحقل" },
  fieldDetailClose: { en: "Close", ar: "إغلاق" },
  fieldDetailCloseAria: { en: "Close field detail", ar: "إغلاق تفاصيل الحقل" },
  fieldDetailAreaLabel: { en: "Area", ar: "المساحة" },
  fieldDetailTreeCountLabel: { en: "Tree count", ar: "عدد الأشجار" },
  fieldDetailCropTypesLabel: { en: "Crop types", ar: "أنواع المحاصيل" },
  fieldDetailHealthIndexLabel: {
    en: "Avg. canopy health index",
    ar: "متوسط مؤشر صحة المظلة الشجرية",
  },
  fieldDetailCentroidLabel: { en: "Centroid", ar: "مركز الثقل" },
  fieldDetailYieldLabel: { en: "Projected yield", ar: "الإنتاجية المتوقعة" },
  fieldDetailNoHealthData: {
    en: "No data on file for this field yet",
    ar: "لا توجد بيانات مسجّلة لهذا الحقل بعد",
  },

  // FarmBoundaryMap
  mapLoadingBoundary: { en: "Loading boundary…", ar: "جارٍ تحميل الحدود…" },
  mapClickFieldHint: { en: "Click a field to open its drill-down", ar: "انقر على حقل لعرض تفاصيله" },
  mapToolRecenter: { en: "Re-centre on farm", ar: "التمركز على المزرعة" },
  mapToolFullscreen: { en: "Toggle full screen", ar: "تبديل ملء الشاشة" },
  mapToolZoomIn: { en: "Zoom in", ar: "تكبير" },
  mapToolZoomOut: { en: "Zoom out", ar: "تصغير" },
  mapToolBoundary: { en: "Show / hide farm and field boundaries", ar: "إظهار / إخفاء حدود المزرعة والحقول" },
  // "{pct}" is the current overlay opacity, e.g. "95".
  mapToolOpacity: { en: "Index layer opacity ({pct}%) - click to change", ar: "شفافية طبقة المؤشر ({pct}%) - انقر للتغيير" },
  mapToolExport: { en: "Export farm data (CSV)", ar: "تصدير بيانات المزرعة (CSV)" },
  mapToolLegend: { en: "Show / hide the index legend", ar: "إظهار / إخفاء مفتاح المؤشر" },

  // WeatherSection
  weatherTitle: { en: "Farm Weather", ar: "طقس المزرعة" },
  weatherSubtitle: { en: "Current conditions", ar: "الأحوال الحالية" },
  weatherSelectFarm: { en: "Select a farm to see its weather.", ar: "اختر مزرعة لعرض طقسها." },
  weatherCurrentHeading: { en: "Current conditions", ar: "الأحوال الحالية" },
  weatherCurrentError: {
    en: "Current weather isn’t available right now. Please check back later.",
    ar: "الطقس الحالي غير متاح حاليًا. يرجى المحاولة لاحقًا.",
  },
  weatherUpdatedLabel: { en: "Updated", ar: "آخر تحديث" },
  // Weather card headers, right corner. "{time}" e.g. "1 Oct 2026, 09:30".
  weatherLastUpdated: { en: "Last updated: {time}", ar: "آخر تحديث: {time}" },
  weatherRain: { en: "Rain", ar: "الأمطار" },
  weatherRainBeta: { en: "Current rain (beta)", ar: "الأمطار الحالية (تجريبي)" },
  weatherHumidity: { en: "Humidity", ar: "الرطوبة" },
  weatherVpd: { en: "Vapor deficit", ar: "عجز ضغط البخار" },
  weatherUv: { en: "UV index", ar: "مؤشر الأشعة فوق البنفسجية" },
  weatherClouds: { en: "Clouds", ar: "الغيوم" },
  weatherWind: { en: "Wind", ar: "الرياح" },
  weatherPressure: { en: "Pressure", ar: "الضغط الجوي" },
  weatherDewPoint: { en: "Dew point", ar: "نقطة الندى" },

  weatherNow: { en: "Now", ar: "الآن" },
  weatherMinutesSuffix: { en: "min", ar: "دقيقة" },
  weatherPrecipNone: { en: "No precipitation", ar: "لا أمطار" },
  weatherPrecipRain: { en: "Rain", ar: "أمطار" },
  weatherPrecipSnow: { en: "Snow", ar: "ثلوج" },
  weatherPrecipIce: { en: "Ice", ar: "جليد" },
  weatherPrecipMixed: { en: "Mixed", ar: "مختلط" },

  // SoilProfileCard
  soilTitle: { en: "Soil Water & Temperature", ar: "رطوبة التربة ودرجة حرارتها" },
  soilSubtitle: {
    en: "Volumetric soil water and soil temperature by depth",
    ar: "المحتوى المائي الحجمي للتربة ودرجة حرارتها حسب العمق",
  },
  soilError: {
    en: "Soil data isn’t available right now. Please check back later.",
    ar: "بيانات التربة غير متاحة حاليًا. يرجى المحاولة لاحقًا.",
  },
  soilDeficitLabel: { en: "Moisture deficit", ar: "عجز الرطوبة" },
  soilDepthLabel: { en: "Depth", ar: "العمق" },
  soilWaterLabel: { en: "Soil water content", ar: "المحتوى المائي للتربة" },
  soilTempLabel: { en: "Soil temperature", ar: "درجة حرارة التربة" },
  soilReadingDepth: { en: "Reading at {depth} depth", ar: "قراءة عند عمق {depth}" },

  // WeatherForecastCard
  weatherForecastTitle: { en: "5-Day Forecast", ar: "توقعات 5 أيام" },
  weatherForecastSubtitle: {
    en: "3-hourly · temperature, humidity, rain, wind and pressure",
    ar: "كل 3 ساعات · درجة الحرارة والرطوبة والأمطار والرياح والضغط",
  },
  weatherForecastParamLabel: { en: "Forecast parameter", ar: "معيار التوقعات" },
  weatherForecastError: {
    en: "Forecast isn’t available right now. Please check back later.",
    ar: "التوقعات غير متاحة حاليًا. يرجى المحاولة لاحقًا.",
  },
  weatherForecastEmpty: { en: "No upcoming forecast points.", ar: "لا توجد نقاط توقعات قادمة." },
  weatherForecastShowTable: { en: "Show table", ar: "عرض الجدول" },
  weatherForecastHideTable: { en: "Hide table", ar: "إخفاء الجدول" },
  weatherForecastTime: { en: "Time", ar: "الوقت" },
  weatherParamTemp: { en: "Temperature", ar: "درجة الحرارة" },
  weatherParamHumidity: { en: "Humidity", ar: "الرطوبة" },
  weatherParamRain: { en: "Rain", ar: "الأمطار" },
  weatherParamWind: { en: "Wind speed", ar: "سرعة الرياح" },
  weatherParamPressure: { en: "Pressure", ar: "الضغط الجوي" },

  // Header pass line + dossier
  headerNextPassTemplate: { en: "{relative} ({date})", ar: "{relative} ({date})" },
  headerFarmOptionTemplate: { en: "{farm} ({region} region)", ar: "{farm} (منطقة {region})" },
  passOverdue: { en: "overdue", ar: "متأخر" },
  passToday: { en: "today", ar: "اليوم" },
  passInOneDay: { en: "in 1 day", ar: "خلال يوم واحد" },
  passInDays: { en: "in {n} days", ar: "خلال {n} أيام" },
  headerNoPasses: { en: "No passes yet", ar: "لا توجد عمليات مرور بعد" },
  dossierDownloading: { en: "Preparing dossier…", ar: "جارٍ تجهيز الملف…" },
  dossierError: { en: "Couldn't download the dossier. Try again.", ar: "تعذّر تنزيل الملف. حاول مرة أخرى." },

  // Health / IER classes
  ierExcellent: { en: "Excellent", ar: "ممتاز" },
  ierGood: { en: "Good", ar: "جيد" },
  ierFair: { en: "Fair", ar: "مقبول" },
  ierPoor: { en: "Poor", ar: "ضعيف" },
} as const;

export const RATING_LABEL_KEY = {
  excellent: "ierExcellent",
  good: "ierGood",
  fair: "ierFair",
  poor: "ierPoor",
} as const satisfies Record<string, keyof typeof STRINGS>;

export const CHI_STATUS_LABEL_KEY: Record<string, keyof typeof STRINGS> = {
  Healthy: "chiStatusHealthy",
  Monitor: "chiStatusMonitor",
  "At Risk": "chiStatusAtRisk",
};

