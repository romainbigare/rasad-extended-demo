import type { Dict } from "@/lib/i18n/createDict";

/**
 * Static UI copy for Feedback (FeedbackSurveyCard, CadenceRatingGroup). The
 * cadence rating values themselves stay defined in data/options.ts as plain
 * English strings (stable identity used for state/comparison) - only their
 * displayed labels are looked up here via CadenceRatingGroup's own map, per
 * the "don't put t() inside the array literal" rule for config arrays that
 * double as logic keys.
 */
export const STRINGS = {
  pageTitle: { en: "Feedback", ar: "الملاحظات" },
  surveyTitle: { en: "Agronomist Experience Survey", ar: "استبيان تجربة خبير الزراعة" },
  surveySubtitle: {
    en: "Help us improve the ADAFSA Agricultural Intelligence Platform",
    ar: "ساهم في تحسين منصة أدافسا للذكاء الزراعي",
  },
  commentsLabel: { en: "Comments or Feature Suggestions", ar: "ملاحظات أو مقترحات لميزات جديدة" },
  commentsPlaceholder: { en: "Your suggestions...", ar: "مقترحاتك..." },
  submitButton: { en: "Submit Feedback", ar: "إرسال الملاحظات" },
  submittedAlert: { en: "Feedback submitted to ADAFSA Agronomic Systems Division.", ar: "تم إرسال الملاحظات إلى قسم الأنظمة الزراعية في الهيئة." },
  unavailableTitle: {
    en: "Feedback submissions aren't accepted yet",
    ar: "إرسال الملاحظات غير متاح حالياً",
  },
  unavailableBody: {
    en: "We’re getting this ready. Please check back soon.",
    ar: "نعمل على تجهيز هذه الخدمة. يرجى المراجعة قريبًا.",
  },
  cadenceQuestionLabel: {
    en: "Satellite Refresh Cadence Satisfaction",
    ar: "مدى الرضا عن وتيرة تحديث بيانات الأقمار الصناعية",
  },
  cadenceVeryHigh: { en: "Very High", ar: "مرتفع جداً" },
  cadenceHigh: { en: "High", ar: "مرتفع" },
  cadenceModerate: { en: "Moderate", ar: "متوسط" },
  cadenceNeedsImprovement: { en: "Needs Improvement", ar: "يحتاج إلى تحسين" },
} as const satisfies Dict;
