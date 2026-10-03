import { Headset } from "lucide-react";

import { TitleIcon } from "@/components/ui/TitleIcon";
import { useT } from "@/lib/i18n/createDict";

import { CONTACT_DESKS } from "../data/desks";
import { STRINGS } from "../data/translations";
import { ContactDeskCard } from "./ContactDeskCard";

export function ContactDesksSection() {
  const t = useT(STRINGS);

  return (
    <div className="mx-auto flex w-full max-w-[952px] flex-col gap-6" data-testid="contact-desks">
      <div className="rounded-xl border border-line bg-panel p-6 shadow-xs">
        <h1 className="m-0 flex items-center gap-2 text-xl font-bold text-ink">
          <TitleIcon icon={Headset} />
          {t("sectionTitle")}
        </h1>
        <p className="mb-0 mt-1 text-xs text-muted">{t("sectionSubtitle")}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {CONTACT_DESKS.map((desk) => (
          <ContactDeskCard key={desk.id} desk={desk} />
        ))}
      </div>
    </div>
  );
}
