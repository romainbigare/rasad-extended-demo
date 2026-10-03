import { AppShell } from "@/components/AppShell/AppShell";
import { useT } from "@/lib/i18n/createDict";

import { FeedbackSurveyCard } from "./components/FeedbackSurveyCard";
import { STRINGS } from "./data/translations";

export default function Feedback() {
  const t = useT(STRINGS);

  return (
    <AppShell title={t("pageTitle")}>
      <div data-testid="feedback-page">
        <FeedbackSurveyCard />
      </div>
    </AppShell>
  );
}
