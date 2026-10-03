import { Building2, ChevronRight, Droplets, Gauge, House, LandPlot, Layers, Milk, Sprout, Store, Trees, Truck, Users, Warehouse } from "lucide-react";
import { type ReactNode, useState } from "react";

import { LayersIcon } from "@/components/AppShell/icons";
import { Card, CardHeader } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import type { Figure } from "@/components/ui/Figure";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { UnavailablePanel } from "@/components/ui/EmptyStateBadge";
import { QueryValue } from "@/components/ui/QueryValue";
import { useDomainSummary, useLandUseSummary } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import type { DomainBreakdownRow, DomainCountUnit, LandUseClass, LandUseSummary, OperationsDomain } from "@/lib/analytics/types";
import { formatInteger, formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import { useRegionScope } from "../data/useRegionScope";

type StringKey = keyof typeof STRINGS;

const DOMAINS: ReadonlyArray<{
  value: OperationsDomain;
  labelKey: StringKey;
  descriptionKey: StringKey;
}> = [
  {
    value: "open_agriculture",
    labelKey: "catOpenAgricultureLabel",
    descriptionKey: "opsDomainOpenAgricultureDescription",
  },
  {
    value: "protected_agriculture",
    labelKey: "catProtectedAgricultureLabel",
    descriptionKey: "opsDomainProtectedAgricultureDescription",
  },
  {
    value: "structures",
    labelKey: "catStructuresLabel",
    descriptionKey: "opsDomainStructuresDescription",
  },
];

const UNIT_KEY: Record<DomainCountUnit, StringKey> = {
  plots: "opsUnitPlots",
  palms: "opsUnitPalms",
  trees: "opsUnitTrees",
  parcels: "opsUnitParcels",
  houses: "opsUnitHouses",
  units: "opsUnitUnits",
};

/** How one category is drawn: a small muted icon, and (for the known categories) the descriptive
 * status line under its figures. No colour: the cards carry no status, only figures. */
interface Look {
  icon: ReactNode;
  statusKey?: StringKey;
  /** Typical contents of the category, where the data has no names to show (see examplesFor). */
  namesKey?: StringKey;
}

const lucide = (Icon: typeof Sprout) => <Icon size={18} strokeWidth={1.8} />;

const LOOKS: Record<string, Look> = {
  cultivated_fields: { icon: lucide(Sprout), statusKey: "opsStatusCultivatedFields", namesKey: "opsNamesCultivatedFields" },
  palm_trees: { icon: lucide(Trees), statusKey: "opsStatusPalmTrees", namesKey: "opsNamesPalmTrees" },
  fruit_trees: { icon: lucide(Trees), statusKey: "opsStatusFruitTrees", namesKey: "opsNamesFruitTrees" },
  forest_trees: { icon: lucide(Trees), statusKey: "opsStatusForestTrees", namesKey: "opsNamesForestTrees" },
  fallow_land: { icon: lucide(Layers), statusKey: "opsStatusFallowLand", namesKey: "opsNamesFallowLand" },
  greenhouse: { icon: lucide(Warehouse), statusKey: "opsStatusGreenhouse", namesKey: "opsNamesGreenhouse" },
  shade_house: { icon: lucide(Warehouse), statusKey: "opsStatusShadeHouse", namesKey: "opsNamesShadeHouse" },
  poly_glass_house: { icon: lucide(Building2), statusKey: "opsStatusPolyGlass", namesKey: "opsNamesPolyGlass" },
  hydroponics: { icon: lucide(Droplets), statusKey: "opsStatusHydroponics", namesKey: "opsNamesHydroponics" },
  open_shed: { icon: lucide(Warehouse), statusKey: "opsStatusOpenShed", namesKey: "opsNamesOpenShed" },
  residential: { icon: lucide(House), statusKey: "opsStatusResidential", namesKey: "opsNamesResidential" },
  labour_housing: { icon: lucide(Users), statusKey: "opsStatusLabourHousing", namesKey: "opsNamesLabourHousing" },
  machine_storage: { icon: lucide(Truck), statusKey: "opsStatusMachineStorage", namesKey: "opsNamesMachineStorage" },
  water_storage: { icon: lucide(Droplets), statusKey: "opsStatusWaterStorage", namesKey: "opsNamesWaterStorage" },
  vehicle_road: { icon: lucide(ChevronRight), statusKey: "opsStatusVehicleRoad", namesKey: "opsNamesVehicleRoad" },
  warehouse: { icon: lucide(Warehouse), statusKey: "opsStatusWarehouse", namesKey: "opsNamesWarehouse" },
  commercial: { icon: lucide(Store), statusKey: "opsStatusCommercial", namesKey: "opsNamesCommercial" },
  animal_pens: { icon: lucide(Milk), statusKey: "opsStatusAnimalPens", namesKey: "opsNamesAnimalPens" },
  irrigation_utilities: { icon: lucide(Gauge), statusKey: "opsStatusIrrigationUtilities", namesKey: "opsNamesIrrigationUtilities" },
};

type DesignCard = { key: string; labelKey: StringKey; unit: DomainCountUnit };

const DESIGN_CARDS: Partial<Record<OperationsDomain, readonly DesignCard[]>> = {
  open_agriculture: [
    { key: "cultivated_fields", labelKey: "opsCardCultivatedFields", unit: "plots" },
    { key: "palm_trees", labelKey: "opsCardPalmTrees", unit: "palms" },
    { key: "fruit_trees", labelKey: "opsCardFruitTrees", unit: "trees" },
    { key: "forest_trees", labelKey: "opsCardForestTrees", unit: "trees" },
    { key: "fallow_land", labelKey: "opsCardFallowLand", unit: "parcels" },
  ],
  protected_agriculture: [
    { key: "greenhouse", labelKey: "opsCardGreenhouses", unit: "units" },
    { key: "shade_house", labelKey: "opsCardShadeHouses", unit: "units" },
    { key: "hydroponics", labelKey: "opsCardHydroponics", unit: "units" },
    { key: "open_shed", labelKey: "opsCardOpenSheds", unit: "units" },
  ],
  structures: [
    { key: "residential", labelKey: "opsCardResidential", unit: "units" },
    { key: "labour_housing", labelKey: "opsCardLabourHousing", unit: "units" },
    { key: "machine_storage", labelKey: "opsCardMachineStorage", unit: "units" },
    { key: "water_storage", labelKey: "opsCardWaterStorage", unit: "units" },
    { key: "vehicle_road", labelKey: "opsCardRoads", unit: "units" },
    { key: "warehouse", labelKey: "opsCardWarehouses", unit: "units" },
    { key: "commercial", labelKey: "opsCardCommercial", unit: "units" },
    { key: "animal_pens", labelKey: "opsCardAnimalEnclosures", unit: "units" },
    { key: "irrigation_utilities", labelKey: "opsCardIrrigationUtilities", unit: "units" },
  ],
};
const DESIGN_KEYS = new Set(Object.values(DESIGN_CARDS).flatMap((cards) => cards.map((c) => c.key)));

/** A card with no figures, for a category the API sent no row for. */
const placeholderRow = (c: DesignCard, label: string): DomainBreakdownRow =>
  ({ key: c.key, label, count: 0, count_unit: c.unit, share_pct: null, area_du: null, area_ha: null, status: null, examples: null, attention: false });

const designUnit = (key: string) => Object.values(DESIGN_CARDS).flatMap((cards) => cards).find((c) => c.key === key)?.unit;

function lookFor(row: DomainBreakdownRow): Look {
  const known = LOOKS[row.key];
  if (known) return known;
  return { icon: <LayersIcon width={18} height={18} /> };
}

/** One category of the active domain: icon, name, share and headline count; its area in both
 * units; and a footer with its status line and representative names. */
function DomainCategoryCard({
  row,
  examples,
  missing,
}: {
  row: DomainBreakdownRow;
  examples: string | null;
  missing?: boolean;
}) {
  const t = useT(STRINGS);
  const look = lookFor(row);
  // No API row for this category: the card still shows, with "—" for every figure.
  const share =
    row.share_pct === null
      ? missing && row.key !== "fallow_land"
        ? t("opsDomainShareLabel").replace("{pct}", "—")
        : t("opsDomainShareRotational")
      : t("opsDomainShareLabel").replace("{pct}", formatPercent(row.share_pct));
  // Both units are always shown here; convert whichever one the API left out (1 ha = 10 du).
  const du = row.area_du ?? (row.area_ha === null ? null : row.area_ha * 10);
  const ha = row.area_ha ?? (row.area_du === null ? null : row.area_du / 10);
  const designCopy = DESIGN_KEYS.has(row.key);
  const status = (designCopy ? null : row.status) ?? (look.statusKey ? t(look.statusKey) : null);

  return (
    <div className="rounded-xl border border-line bg-panel p-5" data-testid="domain-category-card">
      <div className="flex items-start gap-3 border-b border-line pb-4">
        <span aria-hidden className="mt-0.5 flex-none text-muted">
          {look.icon}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-sm leading-snug">{row.label}</b>
          <span className="mt-1 block text-xs text-muted">{share}</span>
        </div>
        <span className="flex-none whitespace-nowrap text-xs text-muted">
          <b className="text-sm font-bold text-ink">{missing ? "—" : formatInteger(row.count)}</b>{" "}
          {t(UNIT_KEY[designCopy ? designUnit(row.key) ?? row.count_unit : row.count_unit])}
        </span>
      </div>

      <dl className="m-0 py-3 text-xs">
        <div className="flex items-center justify-between gap-3 py-1">
          <dt className="text-muted">{t("opsDomainTotalHectares")}:</dt>
          <dd className="m-0 font-bold">{ha === null ? "—" : `${formatInteger(ha)} ${t("commonHectaresUnit")}`}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-1">
          <dt className="text-muted">{t("opsDomainTotalDunums")}:</dt>
          <dd className="m-0 font-bold">{du === null ? "—" : `${formatInteger(du)} ${t("commonDunumsUnit")}`}</dd>
        </div>
      </dl>

      {(status || examples) && (
        <div className="border-t border-dashed border-line pt-3 text-xs leading-relaxed">
          {status && <div className="font-semibold">{status}</div>}
          {examples && <div className="mt-1 text-muted">{examples}</div>}
        </div>
      )}
    </div>
  );
}

const entry = (data: LandUseSummary, cls: LandUseClass) => data.classes.find((c) => c.class === cls);

const CARD_GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3";

/** `compact`: just the domain tabs and cards - for a page that already has its own title and figures (the Land Use & Structures module). */
export function OperationsDomainSection({ compact = false }: { compact?: boolean }) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const [domain, setDomain] = useState<OperationsDomain>("open_agriculture");
  const summary = useDomainSummary(domain);
  const landUse = useLandUseSummary();
  const { label: scope } = useRegionScope();
  const active = DOMAINS.find((d) => d.value === domain) ?? DOMAINS[0];
  const designCards = DESIGN_CARDS[domain];

  const examplesFor = (row: DomainBreakdownRow): string | null => {
    const namesKey = LOOKS[row.key]?.namesKey;
    if (DESIGN_KEYS.has(row.key)) return namesKey ? t(namesKey) : null;
    // The API's own examples, unless it only echoes the category's name back; then the category's
    // typical contents.
    if (row.examples && row.examples.trim().toLowerCase() !== row.label.trim().toLowerCase()) return row.examples;
    return namesKey ? t(namesKey) : null;
  };

  const portfolioFigures: Figure[] = [
    {
      testId: "kpi-cultivated-area",
      label: t("heroCultivatedAreaLabel"),
      value: <QueryValue query={landUse} render={(d) => formatInteger(area({ du: entry(d, "open_agriculture")?.area_du, ha: entry(d, "open_agriculture")?.area_ha }) ?? 0)} />,
      unit: unitLabel,
    },
    {
      testId: "kpi-fallow-land",
      label: t("heroFallowLandLabel"),
      value: <QueryValue query={landUse} render={(d) => formatInteger(area({ du: entry(d, "fallow_land")?.area_du, ha: entry(d, "fallow_land")?.area_ha }) ?? 0)} />,
      unit: unitLabel,
    },
    {
      testId: "kpi-barren-land",
      label: t("catBarrenLandLabel"),
      value: <QueryValue query={landUse} render={(d) => formatInteger(area({ du: entry(d, "barren_land")?.area_du, ha: entry(d, "barren_land")?.area_ha }) ?? 0)} />,
      unit: unitLabel,
    },
    {
      testId: "kpi-total-structures",
      label: t("heroTotalStructuresLabel"),
      value: <QueryValue query={landUse} render={(d) => formatInteger(entry(d, "structures")?.parcels ?? 0)} />,
      unit: t("commonUnitsUnit"),
    },
  ];

  return (
    <Card className="overflow-hidden !p-0" testId="exec-domains">
      {!compact && (
        <div className="p-5">
          <CardHeader
            className="!mb-0"
            title={t("opsDomainTitle")}
            icon={LandPlot}
            subtitle={t("opsDomainSubtitle").replace("{scope}", scope)}
            metrics={portfolioFigures}
          />
        </div>
      )}

      <div className={cx("flex flex-col gap-3 px-5 pt-4", !compact && "border-t border-line")}>
        <SegmentedControl<OperationsDomain>
          label={t("opsDomainSegmentedLabel")}
          options={DOMAINS.map((d) => ({ value: d.value, label: t(d.labelKey) }))}
          value={domain}
          onChange={setDomain}
        />
        <p className="m-0 text-xs text-muted" data-testid="domain-description">
          {t(active.descriptionKey)}
        </p>
      </div>

      <div className="p-5" data-testid="domain-breakdown">
        {/* The tabs sit above this body, so a shorter tab only shortens the page below them. */}
        <div>
          {designCards ? (
            <div className={CARD_GRID}>
              {designCards.map((c) => {
                const found = summary.data?.breakdown.find((r) => r.key === c.key);
                // Our own card titles (e.g. "Other Trees"), whatever label the API sends.
                const row = found ? { ...found, label: t(c.labelKey) } : placeholderRow(c, t(c.labelKey));
                return <DomainCategoryCard key={c.key} row={row} examples={examplesFor(row)} missing={!found} />;
              })}
            </div>
          ) : (
            <QueryValue
              query={summary}
              render={(d) =>
                d.breakdown.length === 0 ? (
                  <UnavailablePanel title={t("opsDomainEmptyTitle")}>{t("opsDomainEmptyBody")}</UnavailablePanel>
                ) : (
                  <div className={CARD_GRID}>
                    {d.breakdown.map((row) => (
                      <DomainCategoryCard key={row.key} row={row} examples={examplesFor(row)} />
                    ))}
                  </div>
                )
              }
            />
          )}
        </div>
      </div>
    </Card>
  );
}
