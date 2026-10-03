import { MapPin, X } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyStateBadge } from "@/components/ui/EmptyStateBadge";
import { QueryValue } from "@/components/ui/QueryValue";
import { useFarmYieldFields } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useChiText } from "@/lib/chi/ChiInfo";
import { useT } from "@/lib/i18n/createDict";
import { describeCropTypes, formatDecimalString } from "@/lib/farm/format";
import { useFieldMonitoring } from "@/lib/farm/useFieldMonitoring";
import { EM_DASH, formatInteger, formatYieldT } from "@/lib/format";
import { formatDms } from "@/lib/geometry";

import { STRINGS } from "../data/translations";
import { useFarmIer } from "../hooks/useMonitoringApi";
import { fieldYieldT } from "./fieldMetrics";

export function FieldDetailPanel({
  farmId,
  fieldId,
  onClose,
}: {
  farmId: number | null;
  fieldId: number;
  onClose: () => void;
}) {
  const t = useT(STRINGS);
  const chi = useChiText();
  const { areaText } = useAreaUnit();
  const query = useFieldMonitoring(farmId, fieldId);
  const ier = useFarmIer(farmId);
  const yieldFields = useFarmYieldFields(farmId);
  const fieldIer = ier.data?.fields.find((f) => f.field_id === fieldId)?.ier_pct ?? null;
  const fieldYield = fieldYieldT(yieldFields.data, fieldId);

  return (
    <Card className="p-4" testId="mon-field-detail">
      <CardHeader size="lg"
        icon={MapPin}
        title={t("fieldDetailTitle")}
        subtitle={`${t("fieldDetailFieldLabel")} ${fieldId}`}
        actions={
          <Button onClick={onClose} aria-label={t("fieldDetailCloseAria")}>
            {t("fieldDetailClose")} <X width={14} height={14} strokeWidth={1.8} aria-hidden />
          </Button>
        }
      />
      <QueryValue
        query={query}
        render={(field) => (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailFieldLabel")}</dt>
              <dd className="m-0 mt-0.5 font-bold [overflow-wrap:anywhere]">{field.uid}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailAreaLabel")}</dt>
              <dd className="m-0 mt-0.5">{areaText(field.area_dunum, field.area_ha)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailTreeCountLabel")}</dt>
              <dd className="m-0 mt-0.5">{formatInteger(field.tree_count)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailCropTypesLabel")}</dt>
              <dd className="m-0 mt-0.5">{describeCropTypes(field.crop_types)}</dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailHealthIndexLabel")}</dt>
              <dd className="m-0 mt-0.5">
                {field.avg_canopy_health_index === null ? (
                  // With palm counts, the reason is spelled out below; the generic "no data" text would contradict it.
                  typeof field.chi_trees_total === "number" ? (
                    <span aria-hidden className="text-sm font-extrabold text-[#b9c4c0]">{EM_DASH}</span>
                  ) : (
                    <EmptyStateBadge size="inline" reason={t("fieldDetailNoHealthData")} />
                  )
                ) : (
                  formatInteger(field.avg_canopy_health_index)
                )}
                <span className="mt-0.5 block text-[11px] text-muted">
                  {typeof field.chi_trees_scored === "number" && typeof field.chi_trees_total === "number" && (
                    <span className="block">
                      {field.avg_canopy_health_index === null
                        ? chi.noScoreReason(field.chi_trees_scored, field.chi_trees_total)
                        : chi.coverage(field.chi_trees_scored, field.chi_trees_total)}
                    </span>
                  )}
                  {field.chi_latest_capture_date && (
                    <span className="block" title={chi.resolutionNote}>
                      {chi.satelliteDate(field.chi_latest_capture_date)}
                    </span>
                  )}
                </span>
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailCentroidLabel")}</dt>
              <dd className="m-0 mt-0.5 font-mono">
                {field.centroid_lat !== null && field.centroid_lon !== null
                  ? formatDms([field.centroid_lon, field.centroid_lat])
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("irrigationIerLabel")}</dt>
              <dd className="m-0 mt-0.5">
                {fieldIer === null ? (ier.isLoading ? "…" : EM_DASH) : `${formatInteger(fieldIer)}%`}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-muted">{t("fieldDetailYieldLabel")}</dt>
              <dd className="m-0 mt-0.5">
                {fieldYield === null ? (yieldFields.isLoading ? "…" : EM_DASH) : `${formatYieldT(fieldYield)} t`}
              </dd>
            </div>
          </dl>
        )}
      />
    </Card>
  );
}
