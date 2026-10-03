import type { Dict } from "@/lib/i18n/createDict";

export const STRINGS = {
  pageTitle: { en: "Account and Settings", ar: "الحساب والإعدادات" },

  // SettingsHeader
  headerTitle: { en: "Account and settings", ar: "الحساب والإعدادات" },
  loggedInAs: { en: "Logged in as {name} ({role})", ar: "تم تسجيل الدخول باسم {name} ({role})" },

  // Profile
  profileCardTitle: { en: "Profile", ar: "الملف الشخصي" },
  profileCardSubtitle: {
    en: "From your account",
    ar: "من حسابك",
  },
  nameLabel: { en: "Name", ar: "الاسم" },
  notSet: { en: "Not set", ar: "غير محدد" },
  editButton: { en: "Edit", ar: "تعديل" },
  savingButton: { en: "Saving…", ar: "جارٍ الحفظ…" },
  saveButton: { en: "Save", ar: "حفظ" },
  cancelButton: { en: "Cancel", ar: "إلغاء" },
  emailLabel: { en: "Email", ar: "البريد الإلكتروني" },
  changeButton: { en: "Change", ar: "تغيير" },
  phoneLabel: { en: "Phone", ar: "الهاتف" },
  timezoneLabel: { en: "Timezone", ar: "المنطقة الزمنية" },
  measurementSystemLabel: { en: "Measurement system", ar: "نظام القياس" },
  metricLabel: { en: "Metric (ha)", ar: "متري (هكتار)" },
  imperialLabel: { en: "Imperial (ac)", ar: "إمبراطوري (فدان)" },
  notificationsLabel: { en: "Notifications", ar: "الإشعارات" },
  notificationsDescription: {
    en: "Email and in-app notifications for this account",
    ar: "إشعارات البريد الإلكتروني والتطبيق لهذا الحساب",
  },
  profileFieldCountry: { en: "Country", ar: "الدولة" },
  profileFieldState: { en: "State", ar: "الولاية" },
  profileFieldCity: { en: "City", ar: "المدينة" },
  profileFieldPostcode: { en: "Postcode", ar: "الرمز البريدي" },

  // PreferencesCard
  preferencesTitle: { en: "Preferences", ar: "التفضيلات" },
  preferencesSubtitle: {
    en: "Saved to your account - except cloud layer cache below",
    ar: "محفوظة في حسابك - باستثناء ذاكرة التخزين المؤقت للطبقة السحابية أدناه",
  },
  areaUnitLabel: { en: "Measurement Unit for Agricultural Land", ar: "وحدة القياس لمساحة الأراضي الزراعية" },
  dunumsOption: { en: "Dunums (1 du = 1,000 m²)", ar: "دونم (1 دونم = 1,000 م²)" },
  hectaresOption: { en: "Hectares (1 ha = 10,000 m²)", ar: "هكتار (1 هكتار = 10,000 م²)" },
  coordFormatLabel: { en: "Coordinate format", ar: "تنسيق الإحداثيات" },
  dmsOption: { en: "Degrees Minutes Seconds (DMS)", ar: "درجات دقائق ثواني (DMS)" },
  decimalDegreesOption: { en: "Decimal Degrees (DD)", ar: "درجات عشرية (DD)" },
  languageLabel: { en: "Language (saved to your account)", ar: "اللغة (محفوظة في حسابك)" },
  languageHelperText: {
    en: "Saved to your account. The EN | AR switch in the top bar still changes the language for this browser only.",
    ar: "تُحفظ في حسابك. مبدّل EN | AR في الشريط العلوي لا يزال يغيّر اللغة لهذا المتصفح فقط.",
  },
  // Language endonyms shown natively regardless of interface language, same
  // convention as the "EN" / "AR" toggle in the top bar (TopBar.tsx).
  englishOption: { en: "English", ar: "English" },
  arabicOption: { en: "العربية", ar: "العربية" },
  cloudCacheLabel: {
    en: "High-Resolution Cloud Layer Cache",
    ar: "ذاكرة التخزين المؤقت لطبقة السحب عالية الدقة",
  },
  cloudCacheDescription: {
    en: "Store satellite imagery tiles in local browser cache",
    ar: "تخزين بلاطات صور الأقمار الصناعية في ذاكرة التخزين المؤقت للمتصفح المحلي",
  },

  // Account
  accountTitle: { en: "Account", ar: "الحساب" },
  changePasswordButton: { en: "Change Password", ar: "تغيير كلمة المرور" },
  logOutButton: { en: "Log out", ar: "تسجيل الخروج" },
} as const satisfies Dict;
