import { LayoutGrid, Map as MapIcon, Sparkles, Warehouse } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChevronsIcon } from "@/components/AppShell/icons";

import { type LayerState, NO_LAYERS } from "@/components/map/mapStyles";
import { CultivarLayerToggles } from "@/components/map/CultivarLayerToggles";
import { type CultivarVersion, THEMATIC_OVERLAYS } from "@/components/map/wmsOverlays";
import { Button } from "@/components/ui/Button";
import { FarmPicker } from "@/components/ui/FarmPicker";
import { Card, CardHeader } from "@/components/ui/Card";
import type { Figure } from "@/components/ui/Figure";
import { cx } from "@/components/ui/cx";
import { Pagination } from "@/components/ui/Pagination";
import { ErrorState } from "@/components/ui/States";
import { ToggleRow } from "@/components/ui/Toggle";
import { ThematicOption } from "./ThematicOption";
import { parseArea, useAreaUnit } from "@/lib/area/AreaUnitContext";
import { describeCropTypes, formatDecimalString } from "@/lib/farm/format";
import { useFarmMonitoring } from "@/lib/farm/useFarmMonitoring";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EM_DASH } from "@/lib/format";
import { usePagination } from "@/lib/usePagination";
import { usePersistentCollapsed } from "@/lib/usePersistentCollapsed";
import { useRegion } from "@/lib/region/RegionContext";

import { LAND_USE_CLASS_LABEL_KEY, STRINGS, THEMATIC_BADGE_KEY, THEMATIC_DESC_KEY, THEMATIC_LABEL_KEY } from "../data/translations";
import { useRegionFarmSelection } from "@/lib/farm/useRegionFarmSelection";
import { type FarmMapHandle, FarmMapCanvas } from "../map/FarmMapCanvas";
import { FARM_MAP_TAB_PATH, type FarmMapTabState, toFarmMapTabQuery } from "../map/mapTabState";
import { useThematicShares } from "../map/useThematicShares";
import { leafKeys, type ThematicKey, type ThematicNode, thematicTree } from "../map/thematicLegend";

/** Layers the panel lists: HRI, Farm, Field, Date Palm Species (one version) + each thematic overlay. */
const PANEL_LAYER_COUNT = 3 + 1 + THEMATIC_OVERLAYS.length;

/** Stable empty list while the picked farm loads - keeps the pager on page 1. */
const NO_FIELDS: never[] = [];

/** Each layer's top-level legend rows (the tree is static - built once). */
const THEMATIC_ROWS = Object.fromEntries(
  (["landUse", "cropType", "treeType"] as const).map((key) => [key, thematicTree(key)]),
) as Record<ThematicKey, ThematicNode[]>;

/** Whether the right-hand Fields panel (farm picker + field list) is shown. */
const SHOW_FIELDS_PANEL = false;

interface FarmMapPanelProps {
  fullPage?: boolean;
  initial?: FarmMapTabState | null;
  /** Card title; the Farm map's own by default (the Executive View calls it Emirate map). */
  title?: string;
  /** Muted line under the title. */
  subtitle?: string;
  /** Header figures (e.g. the inventory), top right; they replace the "N layers" count. */
  metrics?: Figure[];
}

export function FarmMapPanel({ fullPage = false, initial = null, title, subtitle, metrics }: FarmMapPanelProps) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  /** A farm/field area in the selected unit, from whichever of du/ha the row carries. */
  const formatAreaText = (x: { area_dunum: string | null; area_ha: string | null }) => {
    const value = area({ du: parseArea(x.area_dunum), ha: parseArea(x.area_ha) });
    return formatDecimalString(value === null ? null : String(value), unitLabel);
  };
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const fieldsPanel = usePersistentCollapsed("rasad.farmFieldsPanelCollapsed.v2", true);
  const [layerState, setLayerState] = useState<LayerState>({ ...NO_LAYERS, ...initial?.layers });
  // Every overlay (HRI, Farm, Field, thematic) starts off when the page opens, unless reopened in a new tab.
  // HRI imagery starts on for the Farm map (Clear All still switches it off).
  const [hriOn, setHriOn] = useState(initial?.hriOn ?? true);
  const [cultivar, setCultivar] = useState<CultivarVersion | null>(initial?.cultivar ?? null);
  // One thematic layer at a time (a list with at most one entry; the map and the new-tab
  // URL take a list). Each layer keeps its own legend ticks while you switch between them.
  // A link listing several (an old new-tab URL) opens on the last one.
  const initialThematics = (initial?.thematics ?? []).slice(-1);
  const [activeThematics, setActiveThematics] = useState<ThematicKey[]>(initialThematics);
  const allTicked = (key: ThematicKey) => new Set(thematicTree(key).flatMap(leafKeys));
  const [thematicChecked, setThematicChecked] = useState<Partial<Record<ThematicKey, Set<string>>>>(() =>
    Object.fromEntries(initialThematics.map((k) => [k, allTicked(k)])),
  );
  const [thematicExpanded, setThematicExpanded] = useState<Partial<Record<ThematicKey, Set<string>>>>({});

  /** Picking a layer turns the others off; the first time it's on, all its classes start ticked. */
  const selectThematic = (key: ThematicKey) => {
    setActiveThematics([key]);
    setThematicChecked((prev) => (prev[key] ? prev : { ...prev, [key]: allTicked(key) }));
  };
  const [selectedFarmUid, setSelectedFarmUid] = useState<string | null>(null);
  const [mapHandle, setMapHandle] = useState<FarmMapHandle | null>(null);

  const farmPick = useRegionFarmSelection();
  const { zoneId } = useRegion();
  // New tab: pick the farm that was picked on the Farm page, once the region's farms have loaded.
  const appliedInitialFarm = useRef(false);
  useEffect(() => {
    if (appliedInitialFarm.current || !initial?.farmId || !farmPick.options.length) return;
    appliedInitialFarm.current = true;
    if (farmPick.options.some((f) => f.id === initial.farmId)) farmPick.setFarmId(initial.farmId);
  }, [farmPick, initial?.farmId]);

  /** Expand button: the same card in a new tab (/farm/map), at the current view. */
  const openInNewTab = () => {
    const view = mapHandle?.getView() ?? null;
    const query = toFarmMapTabQuery({
      farmId: farmPick.farmId,
      zoneId,
      hriOn,
      layers: layerState,
      thematics: activeThematics,
      cultivar,
      center: view?.center ?? null,
      zoom: view?.zoom ?? null,
    });
    window.open(`${FARM_MAP_TAB_PATH}?${query}`, "_blank", "noopener");
  };
  const monitoring = useFarmMonitoring(farmPick.farmId);
  const fields = monitoring.data?.fields;
  // Class shares for the map legend (next to each class name) - one legend, not a second list here.
  const thematicShares = useThematicShares(activeThematics, fields);
  const fieldPager = usePagination(fields ?? NO_FIELDS);
  const pickedFarm = farmPick.options.find((f) => f.id === farmPick.farmId);
  // Like Executive View's Reset: Fit To Selection shows only while it has
  // something to do - hidden once the picked farm is fitted (or has no boundary
  // to fit), back when another farm is picked. Clear All then fills the row.
  const [fittedFarmId, setFittedFarmId] = useState<number | null>(null);
  const canFit = Boolean(mapHandle?.fitToSelection);
  void fittedFarmId;
  const [fitPending, setFitPending] = useState(false);
  useEffect(() => {
    if (!fitPending || !mapHandle?.fitToSelection) return;
    mapHandle.fitToSelection();
    setFittedFarmId(farmPick.farmId);
    setFitPending(false);
  }, [fitPending, mapHandle, farmPick.farmId]);

  /** The class count shown beside a "Colour by" choice - what the map legend lets you pick from
   * (tree types: the date palm cultivars, their only sub-classes). */
  const countText = (key: ThematicKey) => {
    const n = key === "treeType" ? THEMATIC_ROWS[key].flatMap(leafKeys).length : THEMATIC_ROWS[key].length;
    return t(THEMATIC_BADGE_KEY[key]).replace("{n}", String(n));
  };

  const clearAll = () => {
    setLayerState(NO_LAYERS);
    setHriOn(false);
    setCultivar(null);
    setActiveThematics([]);
    setThematicChecked({});
    setThematicExpanded({});
    setSelectedFarmUid(null);
  };

  return (
    <Card className={cx("p-4", fullPage && "flex h-screen flex-col rounded-none supports-[height:100dvh]:h-dvh max-lg:!h-auto max-lg:min-h-screen")} testId="farm-map">
      <CardHeader
        title={title ?? t("mapCardTitle")}
        icon={MapIcon}
        subtitle={subtitle}
        metrics={metrics}
        actions={
          metrics ? undefined : (
            // Counted from what this panel lists: HRI + Farm + Field, Date Palm Species (one version) and the thematic overlays.
            <span className="text-xs text-muted">{t("mapLayersCount").replace("{n}", String(PANEL_LAYER_COUNT))}</span>
          )
        }
      />
      <div
        className={cx(
          "grid gap-4 lg:transition-[grid-template-columns] lg:duration-300",
          // New tab: the three columns fill the rest of the screen; the side panels scroll on their own.
          fullPage && "min-h-0 flex-1 lg:grid-rows-[minmax(0,1fr)]",
          // New tab: no Fields panel - just the layers panel and the map.
          // lg (1024-1279): only two columns - three left the map ~160px wide - and the Fields panel sits
          // under them; the three-column layout starts at xl.
          fullPage || !SHOW_FIELDS_PANEL
            ? "lg:grid-cols-[minmax(0,260px)_1fr]"
            : fieldsPanel.collapsed
              ? "lg:grid-cols-[minmax(0,260px)_1fr] xl:grid-cols-[minmax(0,260px)_1fr_12px]"
              : "lg:grid-cols-[minmax(0,260px)_1fr] xl:grid-cols-[minmax(0,260px)_1fr_minmax(0,250px)]",
        )}
      >
        <div className={cx("max-lg:order-2", fullPage && "lg:min-h-0 lg:overflow-y-auto lg:pe-1")}>
          {/* Plain rows: the switch alone shows on/off. */}
          <div className="divide-y divide-line">
            <ToggleRow
              testId="toggle-hri"
              checked={hriOn}
              onChange={setHriOn}
              icon={<Sparkles size={16} strokeWidth={1.8} />}
              label={t("hriLabel")}
              description={t("hriDesc")}
            />
            <ToggleRow
              checked={layerState.farmBoundaries}
              onChange={(on) => setLayerState((s) => ({ ...s, farmBoundaries: on }))}
              icon={<Warehouse size={16} strokeWidth={1.8} />}
              label={t("farmLayerLabel")}
              description={t("farmLayerDesc")}
            />
            <ToggleRow
              checked={layerState.fieldBoundaries}
              onChange={(on) => setLayerState((s) => ({ ...s, fieldBoundaries: on }))}
              icon={<LayoutGrid size={16} strokeWidth={1.8} />}
              label={t("fieldLayerLabel")}
              description={t("fieldLayerDesc")}
            />
            <CultivarLayerToggles active={cultivar} onChange={setCultivar} />
          </div>

          <h3 id="thematic-colour-by" className="m-0 mb-1 mt-4 text-xs font-semibold text-muted">
            {t("thematicClassificationLabel")}
          </h3>
          {/* Native radios: one tab stop, arrow keys move between the choices. "None" switches the layer off.
           * Land use / Crop type / Tree type pick their classes in the map's legend. */}
          <div role="radiogroup" aria-labelledby="thematic-colour-by" className="divide-y divide-line">
            <ThematicOption
              testId="thematic-none"
              label={t("thematicNoneLabel")}
              checked={activeThematics.length === 0}
              onSelect={() => setActiveThematics([])}
            />
            {THEMATIC_OVERLAYS.map((layer) => {
              const key = layer.key as ThematicKey;
              return (
                <ThematicOption
                  key={layer.key}
                  testId={`thematic-${layer.key}`}
                  label={t(THEMATIC_LABEL_KEY[layer.key])}
                  hint={t(THEMATIC_DESC_KEY[layer.key])}
                  count={countText(key)}
                  checked={activeThematics.includes(key)}
                  onSelect={() => selectThematic(key)}
                />
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1" onClick={clearAll}>
              {t("clearAllButton")}
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                if (!canFit) {
                  setFitPending(true);
                  return;
                }
                mapHandle?.fitToSelection?.();
                setFittedFarmId(farmPick.farmId);
              }}
            >
              {t("fitToSelectionButton")}
            </Button>
          </div>
        </div>

        <FarmMapCanvas
          layerState={layerState}
          hriOn={hriOn}
          cultivar={cultivar}
          activeThematics={activeThematics}
          thematicChecked={thematicChecked}
          onThematicChange={(key, next) => setThematicChecked((prev) => ({ ...prev, [key]: next }))}
          thematicExpanded={thematicExpanded}
          onThematicExpandedChange={(key, next) => setThematicExpanded((prev) => ({ ...prev, [key]: next }))}
          selectedFarmUid={selectedFarmUid}
          selectedBoundary={pickedFarm?.boundary ?? null}
          selectedLabel={
            pickedFarm ? { title: pickedFarm.uid, subtitle: formatAreaText(pickedFarm) } : null
          }
          onSelectFarm={setSelectedFarmUid}
          onReady={setMapHandle}
          initialView={initial?.center && initial.zoom !== null ? { center: initial.center, zoom: initial.zoom } : null}
          onExpand={fullPage ? undefined : openInNewTab}
          thematicShares={thematicShares}
        />

        {/* Fields panel (farm picker + field list) switched off - see SHOW_FIELDS_PANEL. */}
        {SHOW_FIELDS_PANEL && !fullPage && (
          <div className="relative max-lg:order-3 lg:col-span-2 xl:col-span-1">
            {/* Collapse / expand the Fields panel (xl+, where it's a side column): round button half-way down its inner edge - clear
             * of the map's zoom buttons (top-right) and the farm picker, and easy to find when folded.
             * -start-*: the inner edge is the panel's left in English, its right in Arabic (the grid mirrors). */}
            <button
              type="button"
              onClick={fieldsPanel.toggle}
              aria-label={t(fieldsPanel.collapsed ? "expandFieldsPanel" : "collapseFieldsPanel")}
              aria-expanded={!fieldsPanel.collapsed}
              title={t(fieldsPanel.collapsed ? "expandFieldsPanel" : "collapseFieldsPanel")}
              className="absolute -start-[18px] top-1/2 z-20 hidden h-5 w-5 -translate-y-1/2 touch:before:absolute touch:before:-inset-3 touch:before:content-[''] items-center justify-center rounded-full border border-line bg-panel text-muted shadow-sm transition hover:bg-[#f4f7f6] hover:text-ink xl:flex"
            >
              {/* » while open (fold it away to the edge), « while folded (bring it back) - mirrored for Arabic. */}
              <ChevronsIcon
                width={11}
                height={11}
                className={cx("transition-transform duration-300", fieldsPanel.collapsed === isRtl && "rotate-180")}
              />
            </button>
            <div className={cx(fieldsPanel.collapsed && "xl:hidden")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="section-label min-w-0 truncate text-[11px]">
                  {t("fieldsPanelFarmLabel")}
                </span>
                <FarmPicker
                  options={farmPick.options}
                  farmId={farmPick.farmId}
                  onChange={farmPick.setFarmId}
                  isLoading={farmPick.isLoading}
                  className="w-[170px]"
                />
              </div>

              {monitoring.isLoading && <div className="py-4 text-center text-xs text-muted">{t("loadingParcelsText")}</div>}
              {monitoring.isError && <ErrorState message={t("parcelsErrorMessage")} />}
              {!farmPick.farmId && !farmPick.isLoading && (
                <div className="py-4 text-center text-xs text-muted">{t("farmSelectorEmptyOption")}</div>
              )}
              {fields && (
                // 10 per page (the shared pager below) instead of one long scroll box.
                <div data-testid="farm-fields-list">
                  <div className="flex flex-col gap-2">
                    {fields.length === 0 && <div className="text-xs text-muted">{t("noParcelsMapped")}</div>}
                    {fieldPager.pageRows.map((f, pageIndex) => {
                      // Numbered across the whole farm (F11, F12, ... on page 2).
                      const i = fieldPager.start + pageIndex;
                      const crop = describeCropTypes(f.crop_types);
                      return (
                        <div key={f.id} className="rounded-xl border border-line bg-panel px-3 py-1.5">
                          <div>
                            <b className="text-xs">F{i + 1}</b> <span className="font-mono text-[11px] text-muted">{f.uid}</span>
                          </div>
                          <div className="text-[11px] text-muted">
                            {[
                              ...(f.land_use ? [t(LAND_USE_CLASS_LABEL_KEY[f.land_use])] : []),
                              formatAreaText(f),
                              crop === EM_DASH ? t("noCropLabel") : crop,
                            ].join(" · ")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Pagination
                    page={fieldPager.page}
                    pageCount={fieldPager.pageCount}
                    total={fieldPager.total}
                    from={fieldPager.from}
                    to={fieldPager.to}
                    onPage={fieldPager.setPage}
                  />
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
