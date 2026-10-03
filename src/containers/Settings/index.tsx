import { AppShell } from "@/components/AppShell/AppShell";
import { useT } from "@/lib/i18n/createDict";

import { PreferencesCard } from "./components/PreferencesCard";
import { SettingsHeader } from "./components/SettingsHeader";
import { STRINGS } from "./data/translations";

export default function Settings() {
  const t = useT(STRINGS);

  return (
    <AppShell title={t("pageTitle")}>
      <div className="mx-auto flex w-full max-w-[752px] flex-col gap-6" data-testid="settings-page">
        <SettingsHeader />
        <PreferencesCard />
      </div>
    </AppShell>
  );
}
