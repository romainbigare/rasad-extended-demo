import { useFarmWaterDemand } from "@/lib/analytics/hooks";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";

import { STRINGS } from "../data/translations";
import { buildFindings } from "../lib/findings";
import { useFarmIer, useTreeHealthScore } from "./useMonitoringApi";

/** The farm's findings (see lib/findings.ts) from the three readings the page already loads. */
export function useFarmFindings(farmId: number | null, farmUid: string | null) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const water = useFarmWaterDemand(farmUid);
  const ier = useFarmIer(farmId);
  const health = useTreeHealthScore(farmId);

  const findings = buildFindings(
    {
      water: water.data,
      ier: ier.data?.ier_pct,
      palms: health.data
        ? { scored: health.data.trees_scored, atRiskPct: health.data.health_pct !== null && health.data.shares ? health.data.shares.at_risk : null }
        : undefined,
    },
    t,
    language,
  );
  const queries = [water, ier, health];
  return {
    findings,
    isLoading: farmId !== null && queries.some((q) => q.isLoading),
    // A reading that failed is not "nothing to check": the list says it may be incomplete.
    hasError: queries.some((q) => q.isError),
  };
}
