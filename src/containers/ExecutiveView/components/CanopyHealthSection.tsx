import { Activity } from "lucide-react";
import { Donut, donutSummary } from "@/components/ui/Donut";
import { Card, CardHeader } from "@/components/ui/Card";
import { InlineError } from "@/components/ui/States";
import { useCanopyHealthDistribution } from "@/lib/analytics/hooks";
import { useChiText } from "@/lib/chi/ChiInfo";
import type { CanopyHealthClass } from "@/lib/analytics/types";
import { formatCompact } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t as tChrome } from "@/lib/i18n/translations";

import { STRINGS } from "../data/translations";

const CANOPY_CLASSES: ReadonlyArray<{ id: CanopyHealthClass; labelKey: keyof typeof STRINGS; color: string }> = [
  { id: "very_healthy", labelKey: "canopyVeryHealthyLabel", color: "#1e7e3e" },
  { id: "healthy", labelKey: "canopyHealthyLabel", color: "#22c55e" },
  { id: "watch", labelKey: "canopyWatchLabel", color: "#eab308" },
  { id: "stressed", labelKey: "canopyStressedLabel", color: "#f97316" },
  { id: "critical", labelKey: "canopyCriticalLabel", color: "#ef4444" },
];

/** Canopy health classes as a donut card; the coverage line (palms scored, satellite date) is its subtitle. */
export function CanopyHealthSection() {
  const t = useT(STRINGS);
  const chi = useChiText();
  const distribution = useCanopyHealthDistribution();
  const { language } = useLanguage();
  const d = distribution.data;
  const pct = (id: CanopyHealthClass) => (d && d.scored_trees > 0 ? (d.classes[id] / d.scored_trees) * 100 : 0);
  const items = CANOPY_CLASSES.map((c) => ({
    key: c.id,
    label: t(c.labelKey),
    color: c.color,
    pct: d ? pct(c.id) : null,
    detail: d ? formatCompact(d.classes[c.id]) : distribution.isLoading ? "…" : undefined,
  }));
  const coverage = d
    ? [
        chi.palmsScored(d.scored_trees),
        d.latest_capture_date ? chi.satelliteDate(d.latest_capture_date) : null,
        d.farms_without_headline ? chi.farmsNotScored(d.farms_without_headline) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <Card className="flex min-w-0 flex-col gap-3 p-4" testId="exec-canopy">
      <CardHeader
        className="!mb-0"
        title={t("canopyTitle")}
        icon={Activity}
        subtitle={
          coverage ? (
            <span data-testid="canopy-coverage" title={chi.resolutionNote}>
              {coverage}
            </span>
          ) : undefined
        }
      />
      <Donut
        size={112}
        testId="canopy-donut"
        legendTestId="canopy-legend"
        items={items}
        ariaLabel={donutSummary(t("canopyTitle"), items)}
      />
      {distribution.isError && <InlineError message={tChrome("couldntLoad", language)} />}
    </Card>
  );
}
