import { Gauge, TrendingDown, TrendingUp } from "lucide-react";
import { BandPill } from "@/components/frame/BandPill";
import { DataTable, FarmLink } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { ScoreScale } from "@/components/frame/ScoreScale";
import { QueryValue } from "@/components/ui/QueryValue";
import { useEnterpriseKpi, useFarmRankings } from "@/lib/analytics/hooks";
import type { FarmRankingRow } from "@/lib/analytics/types";
import { formatInteger } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { IER_SUBSIDY_LINE, displayIer } from "@/lib/scores";

import { MODULE_STRINGS } from "../../data/translations";
import { HoldingRecords } from "../../shared/HoldingRecords";
import { ModuleTabFrame } from "../../shared/ModuleTabFrame";
import type { useModuleFrame } from "../../useModuleFrame";
import { IRRIGATION_STRINGS } from "../data/translations";

/** The most farms asked of the ranking per side of the line. */
const LIMIT = 500;

/** Irrigation Efficiency: who is below and who is above the subsidy line. */
export function IrrigationPage({ frame }: { frame: ReturnType<typeof useModuleFrame> }) {
  const t = useT(IRRIGATION_STRINGS);
  const m = useT(MODULE_STRINGS);
  const { language } = useLanguage();
  const kpi = useEnterpriseKpi("ier");
  const lowest = useFarmRankings("ier", "bottom", "", LIMIT);
  const highest = useFarmRankings("ier", "top", "", LIMIT);
  const line = String(IER_SUBSIDY_LINE);

  // Scores are shown as whole numbers, so the side of the line and the band are decided on that same number.
  const shown = (rows: FarmRankingRow[] | undefined) => (rows ?? []).map((r) => (r.ier === null ? r : { ...r, ier: displayIer(r.ier, 0)?.value ?? r.ier }));
  const below = shown(lowest.data?.rows).filter((r) => r.ier !== null && r.ier < IER_SUBSIDY_LINE);
  const above = shown(highest.data?.rows).filter((r) => r.ier !== null && r.ier >= IER_SUBSIDY_LINE);
  // A side that fills the whole request may have more farms behind it: say "500+" rather than a count.
  const count = (rows: FarmRankingRow[]) => (rows.length >= LIMIT ? `${formatInteger(LIMIT)}+` : formatInteger(rows.length));
  const capped = (rows: FarmRankingRow[]) => rows.length >= LIMIT;
  // The counts are over the farms the ranking returned (the lowest and the highest LIMIT), not over every scored farm.
  const ranked = new Set([...(lowest.data?.rows ?? []), ...(highest.data?.rows ?? [])].filter((r) => r.ier !== null).map((r) => r.farm_id)).size;
  const rankedOf = (lowest.data?.rows.length ?? 0) >= LIMIT || (highest.data?.rows.length ?? 0) >= LIMIT ? `${formatInteger(ranked)}+` : formatInteger(ranked);

  const average = displayIer(kpi.data?.average_score, 0);

  const table = (rows: FarmRankingRow[], dir: "asc" | "desc", query: typeof lowest, testId: string) => (
    <DataTable
      rows={rows}
      rowKey={(r) => String(r.farm_id)}
      isLoading={query.isLoading}
      isError={query.isError}
      defaultSort={{ key: "score", dir }}
      testId={testId}
      emptyText={m("noSelectionRows")}
      columns={[
        { key: "farm", header: m("farmColumn"), render: (r) => <FarmLink farmId={r.farm_id} name={r.farm_name ?? r.farm_uid} />, sortValue: (r) => r.farm_name ?? r.farm_uid },
        { key: "region", header: m("regionColumn"), render: (r) => r.zone_name ?? "—", sortValue: (r) => r.zone_name },
        { key: "crops", header: t("colCrops"), render: (r) => <span className="text-muted">{r.crops ?? "—"}</span>, sortValue: (r) => r.crops },
        { key: "method", header: t("colMethod"), render: (r) => <span className="text-muted">{r.irrigation_method ?? "—"}</span>, sortValue: (r) => r.irrigation_method },
        { key: "score", header: t("colScore"), align: "end", render: (r) => formatInteger(r.ier), sortValue: (r) => r.ier },
        { key: "band", header: t("colBand"), render: (r) => <BandPill score={r.ier} />, sortValue: (r) => r.ier },
      ]}
    />
  );

  return (
    <ModuleTabFrame
      frame={frame}
      testId="module-irrigation"
      figuresAside={
        <Section icon={Gauge} title={t("scaleTitle")} caption={t("scaleCaption")} testId="irrigation-scale">
          <ScoreScale />
        </Section>
      }
      figures={[
        { label: t("figScored"), testId: "fig-scored", sub: t("figScoredSub"), value: <QueryValue query={kpi} render={(d) => formatInteger(d.scored_farms)} /> },
        {
          label: t("figAverage"),
          testId: "fig-average",
          value: <QueryValue query={kpi} render={() => formatInteger(average?.value)} />,
          sub: average ? average.info[language] : t("figAverageSub"),
        },
        {
          label: t("figAbove").replace("{line}", line),
          testId: "fig-above",
          sub: t("figRankedOf").replace("{n}", rankedOf),
          value: <QueryValue query={highest} render={() => count(above)} />,
        },
        {
          label: t("figBelow").replace("{line}", line),
          testId: "fig-below",
          sub: t("figRankedOf").replace("{n}", rankedOf),
          value: <QueryValue query={lowest} render={() => count(below)} />,
        },
      ]}
    >
      <Section
        icon={TrendingDown}
        title={t("belowTitle").replace("{line}", line)}
        caption={capped(below) ? `${t("belowCaption")} ${t("cappedNote").replace("{n}", formatInteger(LIMIT))}` : t("belowCaption")}
        testId="irrigation-below"
      >
        {table(below, "asc", lowest, "irrigation-below-table")}
      </Section>
      <Section
        icon={TrendingUp}
        title={t("aboveTitle").replace("{line}", line)}
        caption={capped(above) ? `${t("aboveCaption")} ${t("cappedNote").replace("{n}", formatInteger(LIMIT))}` : t("aboveCaption")}
        testId="irrigation-above"
      >
        {table(above, "desc", highest, "irrigation-above-table")}
      </Section>
      <HoldingRecords kind="ier" />
    </ModuleTabFrame>
  );
}
