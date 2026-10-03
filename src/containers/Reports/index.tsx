import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell/AppShell";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { ReportsHeader } from "./components/ReportsHeader";
import { ReportsKpiStrip } from "./components/ReportsKpiStrip";
import { ReportsTable } from "./components/ReportsTable";
import { REPORT_TYPES, ReportTypeTabs, type ReportType } from "./components/ReportTypeTabs";

export default function Reports() {
  const [type, setType] = useState<ReportType>("farms");
  const { language } = useLanguage();
  const router = useRouter();

  // /reports?type=structures etc. opens that tab - the Farm page's deep-dive cards link here.
  useEffect(() => {
    if (!router.isReady) return;
    const wanted = router.query.type;
    const match = REPORT_TYPES.find((rt) => rt.value === wanted);
    if (match) setType(match.value);
  }, [router.isReady, router.query.type]);

  return (
    <AppShell title={t("navReports", language)}>
      <div className="flex flex-col gap-6" data-testid="reports-page">
        <ReportsHeader type={type} />
        <ReportTypeTabs type={type} onChange={setType} />
        <ReportsKpiStrip type={type} />
        <ReportsTable type={type} />
      </div>
    </AppShell>
  );
}
