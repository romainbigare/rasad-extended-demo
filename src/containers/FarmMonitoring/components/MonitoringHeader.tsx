import { Download, MapPin } from "lucide-react";
import { useState } from "react";

import type { FarmServiceFarm } from "@shared/farm/endpoints";
import { cx } from "@/components/ui/cx";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FarmPicker } from "@/components/ui/FarmPicker";
import { QueryValue } from "@/components/ui/QueryValue";
import { InlineError, SkeletonValue } from "@/components/ui/States";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { useT } from "@/lib/i18n/createDict";
import { farmServiceLabel, formatInteger } from "@/lib/format";
import { useFarmMonitoring } from "@/lib/farm/useFarmMonitoring";
import { useFarmRecord } from "@/lib/farm/useFarmRecord";
import { wktExtentCentroidLonLat } from "@/lib/geometry";
import { downloadFarmDossier } from "@/lib/reports/dossier";
import { daysFromToday } from "@/lib/satellite/passDates";
import { useDayDateFormat } from "@/lib/useDayDateFormat";
import { Ltr } from "@/components/ui/Ltr";
import { useFarmPasses } from "@/lib/satellite/useFarmPasses";

import { STRINGS } from "../data/translations";
import { useFarmOptionLabel } from "../hooks/useFarmOptionLabel";

function compactDms([lon, lat]: [number, number]): string {
  const part = (value: number, pos: string, neg: string) => {
    const abs = Math.abs(value);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = Math.round(((abs - d) * 60 - m) * 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d}°${pad(m)}'${pad(s)}"${value >= 0 ? pos : neg}`;
  };
  return `${part(lat, "N", "S")} ${part(lon, "E", "W")}`;
}

export function MonitoringHeader({
  farms,
  holdings,
  farmId,
  onSelectFarm,
  onFieldModelChange,
}: {
  farms: FarmServiceFarm[] | undefined;
  /** Farms in the top-bar region. */
  holdings: number | undefined;
  farmId: number | null;
  onSelectFarm: (id: number) => void;
  /** Called after the field-model pick changes (field ids differ between versions). */
  onFieldModelChange?: () => void;
}) {
  const t = useT(STRINGS);
  const dayMonthYear = useDayDateFormat();
  /** "in 3 days" / "today" / "overdue" in the UI language. */
  const daysLabel = (iso: string) => {
    const days = daysFromToday(iso);
    if (days < 0) return t("passOverdue");
    if (days === 0) return t("passToday");
    return days === 1 ? t("passInOneDay") : t("passInDays").replace("{n}", String(days));
  };
  const monitoring = useFarmMonitoring(farmId);
  const record = useFarmRecord(farmId);
  const optionLabel = useFarmOptionLabel();
  // Header box only: "FRM-00101 — Farm 101 (Al Dhafra Region)" when the farm has a name (design).
  const headerOptionLabel = (farm: FarmServiceFarm) => (farm.name ? `${farmServiceLabel(farm.uid)} — ${optionLabel(farm)}` : optionLabel(farm));
  void onFieldModelChange;
  const [downloading, setDownloading] = useState(false);
  const [dossierError, setDossierError] = useState(false);

  const { latestPass, nextOverpass, latestLoading, nextLoading } = useFarmPasses(farmId);

  const exportDossier = async () => {
    if (!monitoring.data) return;
    setDossierError(false);
    setDownloading(true);
    try {
      await downloadFarmDossier(monitoring.data.farm.id, monitoring.data.farm.uid);
    } catch {
      setDossierError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="p-5" testId="mon-header">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted">{t("headerSingleFarmCaption")}</div>

          <h2 className="mb-1 mt-1.5 flex min-h-[32px] flex-wrap items-center gap-3 text-xl font-semibold leading-tight" data-testid="mon-farm-title">
            {monitoring.isLoading ? (
              <SkeletonValue className="h-7 w-60" />
            ) : monitoring.isError || !monitoring.data ? (
              <InlineError message={t("headerFarmLoadError")} />
            ) : (
              <>
                {monitoring.data.farm.name ?? monitoring.data.farm.uid}
                {/* The farm code - hidden when there's no name, so the uid isn't shown twice. */}
                {monitoring.data.farm.name && (
                  <span className="font-mono text-xs font-medium text-muted">
                    {monitoring.data.farm.uid}
                  </span>
                )}
              </>
            )}
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin width={14} height={14} strokeWidth={1.8} aria-hidden />
              <QueryValue query={monitoring} inline render={(d) => d.farm.zone_name ?? t("headerZoneNotAssigned")} />
            </span>
            <QueryValue
              query={record}
              inline
              render={(farm) => {
                const centroid = wktExtentCentroidLonLat(farm.boundary);
                return <span title={t("headerCentroidTitle")}>{centroid ? <Ltr>{compactDms(centroid)}</Ltr> : t("headerNoBoundary")}</span>;
              }}
            />
          </div>
        </div>

        <div className="w-full flex-none lg:w-[420px]">
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="truncate font-medium">{t("headerActiveFarmSelection")}</span>
            <span className="flex-none">{holdings === undefined ? "" : `${formatInteger(holdings)} ${t("headerHoldingsSuffix")}`}</span>
          </div>
          <div className="mt-1.5">
            <FarmPicker
              options={farms ?? []}
              farmId={farmId}
              onChange={onSelectFarm}
              isLoading={!farms}
              optionLabel={headerOptionLabel}
              buttonClassName={cx(FIELD_CLASS, "py-2.5 text-xs font-semibold")}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>{t("headerLatestPassLabel")}</span>
          {latestLoading ? (
            <SkeletonValue className="h-4 w-20" />
          ) : (
            <b className="font-semibold text-ink">{latestPass ? dayMonthYear(latestPass.datetime) : t("headerNoPasses")}</b>
          )}
          <span aria-hidden className="text-line">|</span>
          <span>{t("headerNextOverpassLabel")}</span>
          {nextLoading ? (
            <SkeletonValue className="h-4 w-20" />
          ) : (
            <b className="font-semibold text-ink">
              {nextOverpass ? `${daysLabel(nextOverpass.next_estimated_date)} (${dayMonthYear(nextOverpass.next_estimated_date)})` : t("headerNoPasses")}
            </b>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button className="gap-2" disabled={!monitoring.data || downloading} onClick={exportDossier}>
            <Download size={16} strokeWidth={1.8} aria-hidden className="text-green-d" />
            {downloading ? t("dossierDownloading") : t("headerExportDossier")}
          </Button>
          {dossierError && (
            <span role="alert" className="text-xs font-semibold text-red">
              {t("dossierError")}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
