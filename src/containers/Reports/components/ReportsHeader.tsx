import { Download, FileText, Layers } from "lucide-react";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { useRegion } from "@/lib/region/RegionContext";

import { STRINGS } from "../data/translations";
import { useCropReportRows, useFieldReportRows, useFarmReportRows, useStructureReportRows } from "../hooks/useReportRows";
import { downloadReportGeoJson, useDateCultivarRows, useWaterQuotaRows } from "../hooks/useReportsApi";
import { exportReportCsv } from "../lib/exportReports";
import type { ReportType } from "./ReportTypeTabs";

export function ReportsHeader({ type }: { type: ReportType }) {
  const t = useT(STRINGS);
  const { unit } = useAreaUnit();
  const { zoneId } = useRegion();
  const [error, setError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const farms = useFarmReportRows();
  const fields = useFieldReportRows();
  const structures = useStructureReportRows();
  const crops = useCropReportRows();
  const cultivars = useDateCultivarRows();
  const water = useWaterQuotaRows();

  const runCsv = () => {
    setError(null);
    const done = exportReportCsv(
      type,
      {
        farms: farms.rows,
        fields: fields.rows,
        structures: structures.rows,
        crops: crops.rows,
        dateCultivars: cultivars.data?.rows,
        waterQuota: water.data?.rows,
      },
      unit,
    );
    if (!done) setError(t("exportErrorCsv"));
  };

  const runGeoJson = async () => {
    setError(null);
    setGeoBusy(true);
    try {
      await downloadReportGeoJson(type, zoneId);
    } catch {
      setError(t("exportErrorGeoJson"));
    } finally {
      setGeoBusy(false);
    }
  };

  return (
    <Card className="p-4" testId="reports-header">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <h2 className="m-0 flex items-center gap-2 text-lg font-extrabold leading-snug tracking-tight">
              <TitleIcon icon={FileText} />
              {t("headerTitle")}
            </h2>
            <p className="m-0 mt-0.5 text-xs text-muted">{t("headerSubtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runCsv}
            className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-xs font-bold text-white hover:bg-teal-2"
          >
            <Download size={16} strokeWidth={1.8} aria-hidden />
            {t("exportCsvButton")}
          </button>
          <button
            type="button"
            onClick={runGeoJson}
            disabled={geoBusy}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-ink hover:bg-[#F4F7F6] disabled:opacity-60"
          >
            <Layers size={14} strokeWidth={1.8} aria-hidden className="text-[#4FB840]" />
            {geoBusy ? t("exportPreparing") : t("exportGeoJsonButton")}
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="mt-2 text-xs font-semibold text-red">
          {error}
        </div>
      )}
    </Card>
  );
}
