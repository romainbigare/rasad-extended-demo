import { Gauge, Sprout, Trees } from "lucide-react";
import { useState } from "react";

import { DataTable } from "@/components/frame/DataTable";
import { Section } from "@/components/frame/PageFrame";
import { ScoreScale } from "@/components/frame/ScoreScale";
import { QueryValue } from "@/components/ui/QueryValue";
import { useFarmCrops } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useFarmMonitoring } from "@/lib/farm/useFarmMonitoring";
import { formatInteger, formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";
import { useDayDateFormat } from "@/lib/useDayDateFormat";

import { STRINGS } from "../data/translations";
import { useFarmIer, useTreeHealthScore } from "../hooks/useMonitoringApi";
import { MonitoringKpiGrid } from "./MonitoringKpiGrid";
import { WaterYieldDetails } from "./WaterYieldDetails";

/** A label and its value on one line. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="m-0 text-end font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * Profile: the farm's four figures, what it grows, its trees, and (when the platform keeps it) what
 * changed since last quarter.
 */
export function ProfileTab({ farmId, farmUid }: { farmId: number | null; farmUid: string | null }) {
  const t = useT(STRINGS);
  const day = useDayDateFormat();
  const { area, unitLabel } = useAreaUnit();
  const monitoring = useFarmMonitoring(farmId);
  // Not narrowed by the region menu: a farm opened from another region still shows its crops.
  const farmCrops = useFarmCrops(farmId);
  const health = useTreeHealthScore(farmId);
  const ier = useFarmIer(farmId);

  // The water cards' unit (litres instead of m3), shared by the KPI cards and the details card under them.
  const [liters, setLiters] = useState(false);
  const crops = farmCrops.data ?? [];
  const treeCount = monitoring.data?.farm.tree_count ?? null;

  return (
    <>
      <MonitoringKpiGrid farmId={farmId} farmUid={farmUid} liters={liters} onLitersChange={setLiters} />
      <WaterYieldDetails farmId={farmId} farmUid={farmUid} liters={liters} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Sprout} title={t("profileGrowsTitle")} caption={t("profileGrowsCaption")} testId="mon-grows">
          <DataTable
            rows={crops}
            rowKey={(c) => c.crop}
            isLoading={farmCrops.isLoading}
            isError={farmCrops.isError}
            emptyText={t("profileNoCrops")}
            defaultSort={{ key: "area", dir: "desc" }}
            columns={[
              { key: "crop", header: t("profileColCrop"), render: (c) => c.crop, sortValue: (c) => c.crop },
              { key: "area", header: t("profileColArea").replace("{unit}", unitLabel), align: "end", render: (c) => formatInteger(area({ du: c.area_du })), sortValue: (c) => c.area_du },
              { key: "share", header: t("profileColShare"), align: "end", render: (c) => formatPercent(c.share_pct), sortValue: (c) => c.share_pct },
              { key: "fields", header: t("profileColFields"), align: "end", render: (c) => formatInteger(c.field_count), sortValue: (c) => c.field_count },
            ]}
            testId="mon-grows-table"
          />
        </Section>
        <div className="flex min-w-0 flex-col gap-4">
          <Section icon={Trees} title={t("profileTreesTitle")} caption={t("profileTreesCaption")} testId="mon-trees">
            {treeCount === 0 ? (
              <p className="m-0 text-xs text-muted">{t("profileTreesNone")}</p>
            ) : (
              <dl className="m-0">
                <Fact label={t("profileTreesTotal")}>
                  <QueryValue query={monitoring} inline quiet fallback="—" render={(d) => formatInteger(d.farm.tree_count)} />
                </Fact>
                <Fact label={t("profileTreesScored")}>
                  <QueryValue query={health} inline quiet fallback="—" render={(d) => (d.trees_scored === null ? "—" : formatInteger(d.trees_scored))} />
                </Fact>
                <Fact label={t("profileTreesChi")}>
                  <QueryValue query={health} inline quiet fallback="—" render={(d) => (d.health_pct === null ? "—" : formatInteger(d.health_pct))} />
                </Fact>
                <Fact label={t("profileTreesDate")}>
                  <QueryValue query={health} inline quiet fallback="—" render={(d) => (d.as_of ? day(d.as_of) : "—")} />
                </Fact>
              </dl>
            )}
          </Section>
          <Section icon={Gauge} title={t("scoreNoteTitle")} caption={t("scoreNoteCaption")} testId="mon-score-note">
            <ScoreScale score={ier.data?.ier_pct} />
          </Section>
        </div>
      </div>
    </>
  );
}
