import { LayoutGrid } from "lucide-react";
import { useEffect } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { Pagination } from "@/components/ui/Pagination";
import { ErrorState } from "@/components/ui/States";
import { useFarmYieldFields } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useChiText, withChiAbbr } from "@/lib/chi/ChiInfo";
import { useT } from "@/lib/i18n/createDict";
import { describeCropTypes, formatDecimalString } from "@/lib/farm/format";
import { useFarmFields } from "@/lib/farm/useFarmFields";
import { useFarmMonitoring } from "@/lib/farm/useFarmMonitoring";
import { EM_DASH, formatInteger, formatYieldT } from "@/lib/format";
import { wktExtentCentroidLonLat } from "@/lib/geometry";
import { displayIer } from "@/lib/scores";
import { usePagination } from "@/lib/usePagination";

import { STRINGS } from "../data/translations";
import { useFarmIer, useTreeHealthMonitoring } from "../hooks/useMonitoringApi";
import { fieldYieldT, shortPct } from "./fieldMetrics";

const COLUMNS = [
  "columnFieldName",
  "columnCropStand",
  "columnArea",
  "columnHealthIndex",
  "irrigationIerLabel",
  "columnProjectedYield",
  "columnCoordinates",
] as const satisfies readonly (keyof typeof STRINGS)[];

/** Row swatch colours, by row order. */
/** The unit beside a health figure ("CHI", "NDVI") - small and muted, so the number reads first. */
function IndexLabel({ text }: { text: string }) {
  return <span className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted">{withChiAbbr(text)}</span>;
}

const SWATCHES = ["#2e7d32", "#6ab04c", "#8bc34a", "#e8913a", "#8d5a2b", "#3b82c4", "#8e5bd6", "#c0392b"];

const NO_FIELDS: never[] = [];

function decimalCoords([lon, lat]: [number, number]): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? "E" : "W"}`;
}

export function FieldParcelsTable({
  farmId,
  selectedFieldId,
  onSelectField,
}: {
  farmId: number | null;
  selectedFieldId: number | null;
  onSelectField: (id: number) => void;
}) {
  const t = useT(STRINGS);
  const chi = useChiText();
  const { areaText } = useAreaUnit();
  const monitoring = useFarmMonitoring(farmId);
  const fields = useFarmFields(farmId);
  const health = useTreeHealthMonitoring(farmId);
  const ier = useFarmIer(farmId);
  const yieldFields = useFarmYieldFields(farmId);
  const pager = usePagination(monitoring.data?.fields ?? NO_FIELDS);
  const { showIndex } = pager;
  const selectedIndex = (monitoring.data?.fields ?? NO_FIELDS).findIndex((f) => f.id === selectedFieldId);
  // A field picked on the map opens the page its row is on.
  useEffect(() => {
    showIndex(selectedIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the picked field (or its position) changes
  }, [selectedIndex]);
  const boundaryById = new Map((fields.data ?? []).map((f) => [f.id, f.boundary]));
  const healthById = new Map((health.data?.fields ?? []).map((f) => [f.field_id, f]));
  const ierFields = ier.data?.fields ?? [];
  const ierById = new Map(ierFields.filter((f) => !f.is_tree_field).map((f) => [f.field_id, f.ier_pct]));
  const treeFieldIer = ierFields.find((f) => f.is_tree_field);
  const showTreeField = treeFieldIer !== undefined && pager.page === pager.pageCount - 1;
  // "…" while loading, "—" when the field has no value (or the call failed).
  const pending = (loading: boolean) => <span className="text-muted">{loading ? "…" : EM_DASH}</span>;
  const farm = monitoring.data?.farm;

  return (
    <Card className="p-4" testId="mon-fields">
      <CardHeader
        size="lg"
        icon={LayoutGrid}
        title={farm ? `${t("fieldParcelsTitlePrefix")} ${farm.name ?? farm.uid}` : t("fieldParcelsTitle")}
        subtitle={
          farm ? t("activePolygonsTemplate").replace("{count}", formatInteger(farm.field_count)) : t("fieldParcelsSubtitleDefault")
        }
      />
      <div className="relative mt-4 overflow-x-auto">
        <table className="table-sticky-first w-full border-collapse text-xs">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="whitespace-nowrap border-b border-line bg-[#F4F7F6] px-3 py-3 text-start text-[11px] font-bold uppercase tracking-[0.04em] text-muted"
                >
                  {t(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monitoring.isLoading && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-4 text-center text-xs text-muted">
                  {t("fieldTableLoading")}
                </td>
              </tr>
            )}
            {monitoring.isError && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-0 py-3">
                  <ErrorState message={t("fieldTableError")} />
                </td>
              </tr>
            )}
            {farm?.field_count === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-4 text-center text-xs text-muted">
                  {t("fieldTableEmpty")}
                </td>
              </tr>
            )}
            {pager.pageRows.map((field, pageIndex) => {
              // Index in the full list, so each field keeps the same colour on every page.
              const i = pager.start + pageIndex;
              const centroid = wktExtentCentroidLonLat(boundaryById.get(field.id));
              const active = field.id === selectedFieldId;
              const fieldHealth = healthById.get(field.id);
              const healthDetail = fieldHealth
                ? [
                    fieldHealth.trees_scored !== null && fieldHealth.trees_total !== null
                      ? fieldHealth.headline_available
                        ? chi.coverage(fieldHealth.trees_scored, fieldHealth.trees_total)
                        : chi.noScoreReason(fieldHealth.trees_scored, fieldHealth.trees_total)
                      : null,
                    fieldHealth.as_of ? chi.satelliteDate(fieldHealth.as_of) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "";
              const hasTrees = field.tree_count > 0;
              const hasCrops = field.crop_types.length > 0 || !hasTrees;
              const fieldNdvi = field.ndvi ?? null;
              const fieldIer = ierById.get(field.id);
              const fieldYield = fieldYieldT(yieldFields.data, field.id);
              const crop = describeCropTypes(field.crop_types);
              return (
                <tr
                  key={field.id}
                  onClick={() => onSelectField(field.id)}
                  aria-current={active ? "true" : undefined}
                  className={cx("cursor-pointer border-b border-line", active ? "bg-green-l" : "hover:bg-[#F4F7F6]")}
                >
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="flex items-center gap-3">
                      <i aria-hidden className="inline-block h-3 w-3 flex-none rounded-[2px]" style={{ background: SWATCHES[i % SWATCHES.length] }} />
                      <b className="font-bold">{field.name ?? field.uid}</b>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {field.tree_count > 0
                      ? t("cropStandTreesTemplate").replace("{crop}", crop).replace("{trees}", formatInteger(field.tree_count))
                      : crop}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">{areaText(field.area_dunum, field.area_ha)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {/* CHI for the field's trees, NDVI for its crops; a mixed field shows both. */}
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {hasTrees &&
                        (!fieldHealth ? (
                          pending(health.isLoading)
                        ) : (
                          // CHI and NDVI look the same on purpose: plain text with a small unit label.
                          // The Healthy / Monitor / At-risk colour is CHI's own rating and NDVI has no
                          // such bands, so colouring one would rate it and not the other.
                          <span className="inline-flex items-baseline gap-1" title={healthDetail || undefined}>
                            <IndexLabel text={t("chiCellLabel")} />
                            <span className={cx("text-xs font-semibold", fieldHealth.health_pct === null ? "text-muted" : "text-ink")}>
                              {t("healthPillTemplate").replace(
                                "{pct}",
                                fieldHealth.health_pct !== null && fieldHealth.rating ? shortPct(fieldHealth.health_pct) : EM_DASH,
                              )}
                            </span>
                          </span>
                        ))}
                      {hasCrops && (
                        <span
                          className="inline-flex items-baseline gap-1"
                          title={field.ndvi_as_of ? chi.satelliteDate(field.ndvi_as_of) : undefined}
                        >
                          <IndexLabel text={t("ndviCellLabel")} />
                          <span className={cx("text-xs font-semibold", fieldNdvi === null ? "text-muted" : "text-ink")}>
                            {t("ndviCellTemplate").replace("{value}", fieldNdvi === null ? EM_DASH : fieldNdvi.toFixed(2))}
                          </span>
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {fieldIer === undefined ? (
                      pending(ier.isLoading)
                    ) : (
                      <span className="font-semibold" style={{ color: displayIer(fieldIer, 0)?.info.text }}>{t("ierCellTemplate").replace("{pct}", shortPct(fieldIer))}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {fieldYield === null ? (
                      pending(yieldFields.isLoading)
                    ) : (
                      <b>{t("yieldCellTemplate").replace("{tonnes}", formatYieldT(fieldYield))}</b>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-muted">
                    {fields.isLoading ? "…" : centroid ? decimalCoords(centroid) : EM_DASH}
                  </td>
                </tr>
              );
            })}
            {showTreeField && (
              <tr key="tree-field" data-testid="mon-tree-field-row" className="border-b border-line">
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <i aria-hidden className="inline-block h-3 w-3 flex-none rounded-[2px] bg-line" />
                    <b className="font-bold">{t("treeFieldName")}</b>
                  </span>
                </td>
                <td className="px-3 py-2.5">{t("treeFieldCropStand")}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{areaText(null, treeFieldIer.area_ha)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{pending(false)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="font-semibold" style={{ color: displayIer(treeFieldIer.ier_pct, 0)?.info.text }}>{t("ierCellTemplate").replace("{pct}", shortPct(treeFieldIer.ier_pct))}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">{pending(false)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-muted">{EM_DASH}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pager.page}
        pageCount={pager.pageCount}
        total={pager.total}
        from={pager.from}
        to={pager.to}
        onPage={pager.setPage}
      />
    </Card>
  );
}
