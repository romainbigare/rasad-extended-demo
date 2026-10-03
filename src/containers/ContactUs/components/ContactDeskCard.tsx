import { Ltr } from "@/components/ui/Ltr";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import type { ContactDesk } from "../data/desks";

export function ContactDeskCard({ desk }: { desk: ContactDesk }) {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-panel p-5 shadow-xs">
      <div className="text-xs font-bold text-ink">{desk.name[language]}</div>
      <div className="text-xs text-muted">{desk.address[language]}</div>
      <a
        href={`tel:${desk.phone.replace(/\s+/g, "")}`}
        className="pt-2 text-xs font-semibold text-green-d hover:underline touch:py-2"
      >
        <Ltr>{desk.phone}</Ltr>
      </a>
      <a href={`mailto:${desk.email}`} className="min-w-0 break-all text-[11px] text-muted hover:underline touch:py-1">
        {desk.email}
      </a>
    </div>
  );
}
