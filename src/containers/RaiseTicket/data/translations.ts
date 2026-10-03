import type { Dict } from "@/lib/i18n/createDict";

/** Static UI copy for Raise Ticket. Option labels are looked up by the keys in data/options.ts. */
export const STRINGS = {
  pageTitle: { en: "Raise Ticket", ar: "رفع تذكرة" },
  eyebrow: { en: "Support / Ticket Dispatch", ar: "الدعم / إرسال التذاكر" },
  slaResponse: { en: "SLA response {hours}h", ar: "زمن الاستجابة {hours} ساعة" },
  title: { en: "Raise Support & Technical Ticket", ar: "رفع تذكرة دعم وصيانة فنية" },
  subtitle: {
    en: "Abu Dhabi Agriculture and Food Safety Authority · Central Support Desk",
    ar: "هيئة أبوظبي للزراعة والسلامة الغذائية · مكتب الدعم المركزي",
  },
  deskOperational: { en: "Desk operational", ar: "المكتب يعمل" },
  myArchive: { en: "My Archive", ar: "أرشيفي" },
  myArchiveCount: { en: "My Archive ({n})", ar: "أرشيفي ({n})" },
  hotline: { en: "Biosecurity Hotline: 800-ADAFSA", ar: "الخط الساخن للأمن الحيوي: 800-ADAFSA" },

  categoryLabel: { en: "Ticket Category", ar: "فئة التذكرة" },
  categoryTelemetry: { en: "Telemetry Anomaly / Sensor Failure", ar: "خلل في القياس عن بعد / عطل مستشعر" },
  categoryCadastral: { en: "Cadastral Boundary Dispute", ar: "نزاع على حدود الحيازة" },
  categoryTreeHealth: { en: "Tree Health / Pest Infestation", ar: "صحة الأشجار / إصابة بالآفات" },
  categoryIrrigation: { en: "Irrigation Allocation Appeal", ar: "اعتراض على حصة الري" },
  categoryImagery: { en: "Satellite Imagery Cloud Occlusion", ar: "حجب السحب لصور الأقمار الصناعية" },

  priorityLabel: { en: "Priority & SLA Response", ar: "الأولوية وزمن الاستجابة" },
  priorityCritical: { en: "Critical ({hours}h)", ar: "حرجة ({hours} ساعة)" },
  priorityHigh: { en: "High ({hours}h)", ar: "عالية ({hours} ساعات)" },
  priorityNormal: { en: "Normal ({hours}h)", ar: "عادية ({hours} ساعة)" },

  farmLabel: { en: "Affected Holding / Farm", ar: "الحيازة / المزرعة المتأثرة" },
  farmPlaceholder: { en: "Select a farm", ar: "اختر مزرعة" },
  farmsLoading: { en: "Loading farms…", ar: "جارٍ تحميل المزارع…" },
  fieldLabel: { en: "Field / Parcel ID", ar: "الحقل / رقم القسيمة" },
  fieldWholeFarm: { en: "Whole farm", ar: "المزرعة بالكامل" },
  contactLabel: { en: "Agronomist Contact Number", ar: "رقم التواصل مع المهندس الزراعي" },
  contactPlaceholder: { en: "+971 2 ...", ar: "+971 2 ..." },

  summaryLabel: { en: "Incident Summary / Subject", ar: "ملخص الحادثة / الموضوع" },
  summaryPlaceholder: {
    en: "e.g., TDR-4 sensor telemetry packet drop during pivot cycle...",
    ar: "مثال: انقطاع حزم بيانات المستشعر TDR-4 أثناء دورة المحور...",
  },
  descriptionLabel: { en: "Detailed Agronomic / Technical Description", ar: "الوصف الزراعي / الفني التفصيلي" },
  descriptionPlaceholder: {
    en: "Provide details regarding soil probe readings, satellite imagery anomalies, or biosecurity inspection findings...",
    ar: "قدّم تفاصيل عن قراءات مجسات التربة أو شذوذ صور الأقمار الصناعية أو نتائج فحوص الأمن الحيوي...",
  },

  attachmentsLabel: { en: "Attachments & Logs (Optional)", ar: "المرفقات والسجلات (اختياري)" },
  attachCta: { en: "Click to attach field photos or probe CSV logs", ar: "انقر لإرفاق صور ميدانية أو سجلات CSV للمجسات" },
  attachHint: { en: "GeoTIFF, CSV, JPEG, or PDF up to 25MB", ar: "GeoTIFF أو CSV أو JPEG أو PDF حتى 25 ميغابايت" },
  attachBadType: { en: "{name}: only GeoTIFF, CSV, JPEG or PDF files can be attached.", ar: "{name}: يمكن إرفاق ملفات GeoTIFF أو CSV أو JPEG أو PDF فقط." },
  attachTooBig: { en: "{name}: files can be up to 25MB.", ar: "{name}: الحد الأقصى لحجم الملف 25 ميغابايت." },
  removeFile: { en: "Remove {name}", ar: "إزالة {name}" },

  submit: { en: "Submit Technical Ticket", ar: "إرسال التذكرة الفنية" },
  validationAlert: {
    en: "Please fill out ticket subject and incident description.",
    ar: "يرجى تعبئة موضوع التذكرة ووصف الحادثة.",
  },
  fieldOption: { en: "Field {uid}", ar: "الحقل {uid}" },

  successTitle: { en: "Ticket #{id} Dispatched Successfully", ar: "تم إرسال التذكرة رقم {id} بنجاح" },
  successSub: {
    en: "Assigned to Central Agronomy Operations. Expected resolution within SLA window.",
    ar: "أُسندت إلى العمليات الزراعية المركزية. يُتوقع الحل ضمن زمن الاستجابة المحدد.",
  },
  closeBanner: { en: "Close", ar: "إغلاق" },

  archiveTitle: { en: "My Submitted Tickets Archive", ar: "أرشيف التذاكر المرسلة" },
  backToNew: { en: "← Back to New Ticket", ar: "→ العودة إلى تذكرة جديدة" },
  archiveEmpty: { en: "No tickets submitted yet.", ar: "لم تُرسل أي تذاكر بعد." },
  archiveFarm: { en: "Farm: {v}", ar: "المزرعة: {v}" },
  archiveCategory: { en: "Category: {v}", ar: "الفئة: {v}" },
  archiveLogged: { en: "Logged: {v}", ar: "التسجيل: {v}" },
  statusOpen: { en: "Open", ar: "مفتوحة" },
  statusInProgress: { en: "In Progress", ar: "قيد المعالجة" },
  statusResolved: { en: "Resolved", ar: "تم الحل" },
  slaCritical: { en: "2h SLA (Operational)", ar: "استجابة خلال ساعتين (تشغيلي)" },
  slaHigh: { en: "6h SLA", ar: "استجابة خلال 6 ساعات" },
  slaNormal: { en: "24h SLA", ar: "استجابة خلال 24 ساعة" },
  priorityShortCritical: { en: "Critical", ar: "حرجة" },
  priorityShortHigh: { en: "High", ar: "عالية" },
  priorityShortNormal: { en: "Normal", ar: "عادية" },
  submitSoon: {
    en: "Ticket submission from here opens soon.",
    ar: "سيتم تفعيل إرسال التذاكر من هنا قريبًا.",
  },
  portalLead: { en: "To open a ticket now, use the", ar: "لفتح تذكرة الآن، استخدم" },
  portalLink: { en: "support portal", ar: "بوابة الدعم" },
} as const satisfies Dict;
