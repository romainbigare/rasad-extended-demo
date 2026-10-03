import { AppShell } from "@/components/AppShell/AppShell";
import { useT } from "@/lib/i18n/createDict";

import { ContactDesksSection } from "./components/ContactDesksSection";
import { STRINGS } from "./data/translations";

export default function ContactUs() {
  const t = useT(STRINGS);

  return (
    <AppShell title={t("pageTitle")}>
      <div className="flex flex-col gap-6" data-testid="contact-page">
        <ContactDesksSection />
      </div>
    </AppShell>
  );
}
