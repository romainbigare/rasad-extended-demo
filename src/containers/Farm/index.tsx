import { AppShell } from "@/components/AppShell/AppShell";
import { useT } from "@/lib/i18n/createDict";

import { FarmRankingSection } from "./components/FarmRankingSection";
import { OperationalDeepDivesSection } from "./components/OperationalDeepDivesSection";
import { STRINGS } from "./data/translations";

/** Farm: how farms are performing - the modules and the farm ranking. */
export default function Farm() {
  const t = useT(STRINGS);
  return (
    <AppShell title={t("pageTitle")}>
      <div className="flex flex-col gap-6" data-testid="farm-page">
        <OperationalDeepDivesSection />
        <FarmRankingSection />
      </div>
    </AppShell>
  );
}
