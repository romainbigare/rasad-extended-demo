import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

export function Footer() {
  const { language } = useLanguage();
  return (
    <footer className="flex flex-col gap-1 border-t border-line bg-panel px-2.5 py-3 text-xs sm:px-3 text-muted sm:flex-row sm:justify-between">
      <span>
        © {new Date().getFullYear()} {t("footerRights", language)}
      </span>
      <span className="sm:text-end">
        <b className="block text-green-d">Wafra Greentech</b>
        <span className="block">
          {t("poweredBy", language)} <b>Map My Crop</b>
        </span>
      </span>
    </footer>
  );
}
