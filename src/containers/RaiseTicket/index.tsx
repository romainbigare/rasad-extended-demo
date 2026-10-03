import { AppShell } from "@/components/AppShell/AppShell";
import { useT } from "@/lib/i18n/createDict";

import { RaiseTicketForm } from "./components/RaiseTicketForm";
import { STRINGS } from "./data/translations";

export default function RaiseTicket() {
  const t = useT(STRINGS);

  return (
    <AppShell title={t("pageTitle")}>
      <div data-testid="raise-ticket-page">
        <RaiseTicketForm />
      </div>
    </AppShell>
  );
}
