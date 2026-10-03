import { Satellite } from "lucide-react";
import type OlMap from "ol/Map";
import type { ParsedUrlQuery } from "querystring";
import { useEffect, useMemo, useState } from "react";
import { useFarmDataCsv } from "../hooks/useFarmDataCsv";

import type { FarmServiceFarm } from "@shared/farm/endpoints";
import { currentView, type MapView, num, one, openMapTab, setViewParams, viewFromQuery } from "@/components/map/mapTab";
import { Card, CardHeader } from "@/components/ui/Card";
import { FarmPicker } from "@/components/ui/FarmPicker";
import { InlineError, Spinner } from "@/components/ui/States";
import { cx } from "@/components/ui/cx";
import { Select } from "@/components/ui/Select";
import { useT } from "@/lib/i18n/createDict";
import { useFieldModel } from "@/lib/farm/FieldModelContext";
import { useFarmFields } from "@/lib/farm/useFarmFields";
import { useFarmRecord } from "@/lib/farm/useFarmRecord";
import type { SatelliteDateItem } from "@/lib/network/satellite/endpoints";
import { useFieldImagery } from "@/lib/satellite/useFieldImagery";
import { useSatelliteIndicesForMany } from "@/lib/satellite/useSatelliteIndicesForMany";
import { formatPassDate } from "@/lib/satellite/passDates";
import { useRegion } from "@/lib/region/RegionContext";

import { STRINGS } from "../data/translations";
import { useFarmOptionLabel } from "../hooks/useFarmOptionLabel";
import { FarmBoundaryMap } from "../map/FarmBoundaryMap";
import { SatellitePassRibbon } from "./satellite/SatellitePassRibbon";

/** A labelled on/off switch for the map's layer panel. */
function LayerSwitch({ label, checked, onChange, testId }: { label: string; checked: boolean; onChange: (on: boolean) => void; testId?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className="flex w-full items-center justify-between gap-4 text-xs font-semibold"
    >
      {label}
      <span aria-hidden className={cx("relative h-[22px] w-[40px] flex-none rounded-full transition-colors", checked ? "bg-green" : "bg-[#d7dddb]")}>
        <span
          className={cx(
            "absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-all",
            checked ? "start-[21px]" : "start-[3px]",
          )}
        />
      </span>
    </button>
  );
}

/** The Farm Monitoring map on its own page - where its expand button opens it, in a new tab. */
export const MONITORING_MAP_TAB_PATH = "/farm-monitoring/map";

/** What the new tab carries over (the farm, region and field model travel in the URL too). */
export interface MonitoringMapTabState {
  hriOn: boolean;
  showOverlay: boolean;
  index: string | null;
  view: MapView | null;
}

export function monitoringMapTabFromQuery(query: ParsedUrlQuery): MonitoringMapTabState {
  return {
    hriOn: one(query.hri) === "1",
    showOverlay: one(query.ov) !== "0",
    index: one(query.idx) || null,
    view: viewFromQuery(query),
  };
}

/** Field-model id from the new tab's URL (null = the approved default). */
export const fieldModelFromQuery = (query: ParsedUrlQuery) => num(one(query.fm));

export function IndexMapSection({
  farms,
  farmId,
  onSelectFarm,
  onSelectField,
  fullPage = false,
  initial = null,
}: {
  farms: FarmServiceFarm[] | undefined;
  farmId: number | null;
  onSelectFarm: (id: number) => void;
  onSelectField: (id: number) => void;
  /** The map in its own tab: fills the screen; the expand button is real full screen there. */
  fullPage?: boolean;
  /** Where the new tab starts (overlay / HRI / index / view). */
  initial?: MonitoringMapTabState | null;
}) {
  const t = useT(STRINGS);
  const optionLabel = useFarmOptionLabel();
  // The scene the ribbon has highlighted (drives WHICH pass gets imaged) and
  // the index alias picked for it. Both reset whenever the farm changes (the
  // ribbon itself emits the scene callback with null on that transition).
  const [selectedScene, setSelectedScene] = useState<SatelliteDateItem | null>(null);
  const [selectedSatellites, setSelectedSatellites] = useState<string[]>([]);
  const [index, setIndex] = useState<string | null>(initial?.index ?? null);
  const [showOverlay, setShowOverlay] = useState(initial?.showOverlay ?? true);
  // Off by default, like the Farm and Executive View maps.
  const [hriOn, setHriOn] = useState(initial?.hriOn ?? false);
  const [olMap, setOlMap] = useState<OlMap | null>(null);
  const { zoneId } = useRegion();
  const { fieldModelVersionId } = useFieldModel();

  /** Expand button on Farm Monitoring: this map in a new tab, at the current farm and view. */
  const openInNewTab = () => {
    const q = new URLSearchParams();
    if (farmId !== null) q.set("farm", String(farmId));
    if (zoneId !== null) q.set("zone", String(zoneId));
    if (fieldModelVersionId !== null) q.set("fm", String(fieldModelVersionId));
    q.set("hri", hriOn ? "1" : "0");
    q.set("ov", showOverlay ? "1" : "0");
    if (index) q.set("idx", index);
    setViewParams(q, currentView(olMap));
    openMapTab(MONITORING_MAP_TAB_PATH, q);
  };
  const record = useFarmRecord(farmId);
  const fields = useFarmFields(farmId);
  const farmCsv = useFarmDataCsv(farmId);

  // Only the highlighted scene's OWN satellite's parameters -- not a union
  // across every satellite the ribbon's filter happens to have checked.
  // Picking a scene from S3 should never offer an S1-only alias.
  const scopedSatellite = selectedScene ? [selectedScene.satellite] : [];
  const { bySatellite } = useSatelliteIndicesForMany(farmId, scopedSatellite);
  const availableIndices = useMemo(
    () => (selectedScene ? (bySatellite.get(selectedScene.satellite) ?? []) : []),
    [bySatellite, selectedScene],
  );

  useEffect(() => {
    if (availableIndices.length === 0) {
      setIndex(null);
    } else if (!index || !availableIndices.includes(index)) {
      setIndex(availableIndices[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when the available list itself changes
  }, [availableIndices]);

  // availableIndices is already scoped to selectedScene's satellite, so a
  // picked index is valid for the scene whenever it's simply non-null.
  const indexValidForScene = !!selectedScene && !!index;

  const imageryParams =
    selectedScene && index && indexValidForScene
      ? {
          satellite: selectedScene.satellite,
          index,
          satelliteDate: selectedScene.datetime.slice(0, 10),
          datetime: selectedScene.datetime,
        }
      : null;
  const imagery = useFieldImagery(farmId, imageryParams);

  return (
    <Card className={cx("p-4", fullPage && "flex h-screen flex-col overflow-y-auto rounded-none supports-[height:100dvh]:h-dvh max-lg:!h-auto max-lg:min-h-screen max-lg:overflow-visible")} testId="mon-map">
      <CardHeader size="lg" title={t("indexMapTitle")} icon={Satellite} />
      <div className="mb-4 mt-6 flex flex-wrap items-center gap-4">
        <FarmPicker
          options={farms ?? []}
          farmId={farmId}
          onChange={onSelectFarm}
          isLoading={!farms}
          optionLabel={optionLabel}
          className="w-[280px] max-w-full"
        />
        <Select
          value={index ?? ""}
          onChange={setIndex}
          options={availableIndices.map((alias) => ({ value: alias, label: alias }))}
          placeholder={selectedScene ? t("indexNoIndexForSatellite") : t("indexSelectScene")}
          title={selectedScene ? `${availableIndices.length} parameters for ${selectedScene.satellite}` : undefined}
          className="w-[170px] max-w-full"
        />
        {imagery.isFetching ? (
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Spinner className="scale-75" /> {t("indexLoadingImagery")}
          </span>
        ) : imagery.isError ? (
          <InlineError message={imagery.error?.status === 429 ? t("indexImageryRateLimited") : t("indexImageryError")} />
        ) : imagery.data && !imagery.data.image ? (
          <span className="text-xs text-muted">{t("indexImageryEmpty")}</span>
        ) : imagery.data?.image && selectedScene && index ? (
          <span className="text-xs text-muted">
            {t("indexImageryShowing")
              .replace("{index}", index)
              .replace("{date}", formatPassDate(selectedScene.datetime).date)}
          </span>
        ) : selectedScene && index && !indexValidForScene ? (
          <span className="text-xs text-muted">
            {index} isn’t available for the highlighted {selectedScene.satellite} scene - pick a different parameter
            or a scene from a satellite that has it.
          </span>
        ) : null}
      </div>

      <FarmBoundaryMap
        farmId={farmId}
        farmBoundary={record.data?.boundary}
        farmLabel={record.data ? record.data.name ?? record.data.uid : null}
        fields={fields.data}
        fieldsLoading={record.isLoading || fields.isLoading}
        onSelectField={onSelectField}
        imageryBase64={showOverlay ? imagery.data?.image || null : null}
        legends={showOverlay ? imagery.data?.legends : undefined}
        legendUnit={imagery.data?.unit}
        hriOn={hriOn}
        topLeft={
          <div className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-white/95 px-3 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.15)] sm:min-w-[170px] sm:px-4">
            <LayerSwitch
              label={t("indexOverlayToggleTemplate").replace("{index}", index ?? "")}
              checked={showOverlay}
              onChange={setShowOverlay}
              testId="mon-toggle-index"
            />
            <LayerSwitch label={t("hriToggleLabel")} checked={hriOn} onChange={setHriOn} testId="mon-toggle-hri" />
          </div>
        }
        // New tab: the map takes the room the rest of the page had.
        className={fullPage ? "min-h-[420px] flex-1 max-lg:min-h-[min(420px,70svh)]" : "h-[360px] sm:h-[460px] max-lg:max-h-[70svh] max-lg:min-h-[240px]"}
        initialView={initial?.view}
        onExpand={fullPage ? undefined : openInNewTab}
        onMapReady={setOlMap}
        onExport={farmCsv.ready ? farmCsv.exportCsv : undefined}
      />

      <div className="mt-4">
        <SatellitePassRibbon farmId={farmId} selectedScene={selectedScene} onSelectScene={setSelectedScene} />
      </div>
    </Card>
  );
}
