import { CircleCheck, MapPin, Search, Trees, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { ExternalLinkIcon } from "@/components/AppShell/icons";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { IerBandBadge } from "@/components/ui/IerBandBadge";
import { displayIer } from "@/lib/scores";
import { Ltr } from "@/components/ui/Ltr";
import { Select } from "@/components/ui/Select";
import { ErrorState } from "@/components/ui/States";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { useZones } from "@/lib/analytics/hooks";
import { useFarmList } from "@/lib/farm/useFarmList";
import { EM_DASH, formatInteger, formatPercent, formatYieldT } from "@/lib/format";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { useRegion } from "@/lib/region/RegionContext";
import { PILL } from "@/styles/global";

import { ADVISORY_LABEL_KEY } from "../data/translations";
import { LAND_USE_LABEL_KEY, STRINGS, WEEVIL_RISK_LABEL_KEY } from "../data/translations";
import type { AdvisoryStatus } from "../data/types";
import type { FieldHealth, PermitStatus, StructureReportRow, WeevilRisk } from "../data/types";
import { useCropReportRows, useFieldReportRows, useFarmReportRows, useStructureReportRows } from "../hooks/useReportRows";
import { downloadFarmDossier, useDateCultivarRows, useStructureListRows, useWaterQuotaRows } from "../hooks/useReportsApi";
import type { ReportType } from "./ReportTypeTabs";
import { DataTable, type DataTableColumn } from "./DataTable";

function matches(search: string, ...values: Array<string | null | undefined>): boolean {
  if (!search.trim()) return true;
  const needle = search.trim().toLowerCase();
  return values.some((v) => (v ?? "").toLowerCase().includes(needle));
}

const dash = <span className="text-muted">{EM_DASH}</span>;
const orDash = (value: ReactNode | null | undefined) => (value === null || value === undefined || value === "" ? dash : value);

// Badge colours come from src/styles/global.ts PILL tones (identical strings: good / info / warn / bad / neutral).
const ADVISORY_PILL: Record<AdvisoryStatus, string> = {
  none: PILL.good,
  active: PILL.warn,
  critical: PILL.bad,
};
const useAreaWord = () => {
  const t = useT(STRINGS);
  const { unit } = useAreaUnit();
  return t(unit === "hectare" ? "unitHectaresWord" : "unitDunumsWord");
};
/** A quantity as a whole number (1,120 t). */
const figure = (value: number) => formatInteger(value);
/** Thousands of m³, e.g. 680 (for "680 / 510 k-m³"). */
const kM3 = (value: number) => formatInteger(Math.round(value / 1000));
/** Health-index bar colour by the field's health class. */
const HEALTH_BAR: Record<FieldHealth, string> = { healthy: "bg-green", moderate: "bg-orange", stressed: "bg-red" };
const CROP_DOT_COLOR: Record<string, string> = {
  alfalfa: "#5AA02C",
  "rhodes grass": "#9ACD32",
  "date palm": "#7B4B2A",
};
const OTHER_CROP_DOT_COLOR = "#9E9E9E";
const cropDotColor = (crop: string | null) => (crop && CROP_DOT_COLOR[crop.trim().toLowerCase()]) || OTHER_CROP_DOT_COLOR;
/** "15 Oct 2025" from an ISO date; "—" when absent. */
const shortDate = (iso: string | null) =>
  iso === null ? EM_DASH : new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

const IerPct = ({ value }: { value: number | null }) => (value === null ? dash : <b>{formatInteger(Math.round(value))}%</b>);

/** A thin 0-100 bar, e.g. NDVI health or vigour. */
function Meter({ pct, className }: { pct: number; className: string }) {
  return (
    <span aria-hidden className="block h-1.5 w-16 flex-none overflow-hidden rounded-full bg-[#DDE5E2]">
      <span className={cx("block h-full rounded-full", className)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

/** Green open-link icon: the farm on Farm Monitoring. */
function OpenFarmLink({ farmId }: { farmId: number }) {
  const t = useT(STRINGS);
  return (
    <Link
      href={`/farm-monitoring?farm=${farmId}`}
      aria-label={t("openInFarmMonitoring")}
      className="inline-grid h-8 w-8 place-items-center rounded-md text-[#4FB840] hover:bg-green-l"
    >
      <ExternalLinkIcon width={18} height={18} />
    </Link>
  );
}
const WEEVIL_TONE: Record<WeevilRisk, string> = {
  low: PILL.good,
  medium: PILL.warn,
  high: PILL.bad,
};
/** Crop status pill colours; an unrecognised status gets the neutral pill. */
const CROP_STATUS_TONE: Record<string, string> = {
  harvesting: PILL.good,
  fruiting: PILL.warn,
  vegetative: PILL.neutral,
  flowering: PILL.neutral,
};
const cropStatusTone = (status: string) => CROP_STATUS_TONE[status.toLowerCase()] ?? PILL.neutral;

/** Farm names by id and by code, and each farm's zone name, from the farm list and zones the page
 * already loads (react-query dedupes them). */
function useFarmNames() {
  const farms = useFarmList();
  const zones = useZones();
  return useMemo(() => {
    const byId = new Map<number, string>();
    const byUid = new Map<string, string>();
    const zoneById = new Map<number, string>();
    const zoneName = new Map((zones.data ?? []).map((z) => [z.id, z.name]));
    for (const f of farms.data ?? []) {
      const zone = f.zone_id === null ? undefined : zoneName.get(f.zone_id);
      if (zone) zoneById.set(f.id, zone);
      if (!f.name) continue;
      byId.set(f.id, f.name);
      byUid.set(f.uid, f.name);
    }
    return { byId, byUid, zoneById };
  }, [farms.data, zones.data]);
}

/** Code in bold with the farm name under it (and its zone in green where given) - the same on every tab. */
function FarmCell({ code, name, zone }: { code: string; name?: string | null; zone?: string | null }) {
  return (
    <>
      <b className="block whitespace-nowrap text-xs">{code}</b>
      {name && <span className="block text-[11px] text-muted">{name}</span>}
      {zone && <span className="block text-[10px] font-medium text-[#4FB840]">{zone}</span>}
    </>
  );
}

/** The in-table region filter - the same selection as the top-bar region picker. */
function RegionSelect() {
  const t = useT(STRINGS);
  const { zoneId, setZoneId } = useRegion();
  const zones = useZones();
  return (
    <Select
      ariaLabel={t("regionFilterLabel")}
      value={zoneId === null ? "" : String(zoneId)}
      onChange={(value) => setZoneId(value === "" ? null : Number(value))}
      options={[{ value: "", label: t("regionAll") }, ...(zones.data ?? []).map((z) => ({ value: String(z.id), label: z.name }))]}
      className="w-full sm:w-44"
    />
  );
}

const SEARCH_KEY: Record<ReportType, keyof typeof STRINGS> = {
  farms: "searchFarmsPlaceholder",
  fields: "searchFieldsPlaceholder",
  structures: "searchStructuresPlaceholder",
  "date-cultivars": "searchCultivarsPlaceholder",
  crops: "searchCropsPlaceholder",
  "water-quota": "searchFarmsPlaceholder",
};

/** Shared chrome: a search + region card, then the table card (title, loading/error,
 * whatever table the tab renders). The region filter is the top-bar region. */
function TableShell({
  type,
  search,
  onSearch,
  isLoading,
  isError,
  extrasError,
  filters,
  children,
}: {
  type: ReportType;
  search: string;
  onSearch: (value: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  extrasError?: boolean;
  /** Extra dropdowns after the region one (e.g. All Cultivars). */
  filters?: ReactNode;
  children: ReactNode;
}) {
  const t = useT(STRINGS);
  return (
    <>
      <Card className="p-4" testId="reports-filters">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={16} strokeWidth={1.8} aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t(SEARCH_KEY[type])}
              aria-label={t(SEARCH_KEY[type])}
              className={cx(FIELD_CLASS, "w-full ps-10")}
            />
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} strokeWidth={1.8} aria-hidden className="flex-none text-[#4FB840]" />
            <RegionSelect />
          </div>
          {filters}
        </div>
      </Card>
      <Card className="p-4" testId="reports-table">
        {isLoading && <div className="py-5 text-center text-xs text-muted">{t("loadingEllipsis")}</div>}
        {isError && <ErrorState message={t("errorLoadReport")} />}
        {!isLoading && !isError && children}
      </Card>
    </>
  );
}

function FarmReportTable({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const t = useT(STRINGS);
  const areaWord = useAreaWord();
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading, isError, extrasError } = useFarmReportRows();
  const [downloading, setDownloading] = useState<number | null>(null);
  const [dossierError, setDossierError] = useState(false);
  const filtered = useMemo(
    () => (rows ?? []).filter((r) => matches(search, r.uid, r.name, r.zoneName, r.subZone, r.cropMix)),
    [rows, search],
  );

  const dossier = async (farmId: number, uid: string) => {
    setDossierError(false);
    setDownloading(farmId);
    try {
      await downloadFarmDossier(farmId, uid);
    } catch {
      setDossierError(true);
    } finally {
      setDownloading(null);
    }
  };

  const columns: DataTableColumn<NonNullable<typeof rows>[number]>[] = [
    {
      key: "farm",
      label: t("colFarmIdName"),
      render: (r) => <FarmCell code={r.label} name={r.name} />,
    },
    {
      key: "region",
      label: t("colRegionZone"),
      render: (r) =>
        r.zoneName ? (
          <>
            <span className="block font-semibold">{t("regionNameTemplate").replace("{region}", r.zoneName)}</span>
            {r.subZone && <span className="block text-[10px] text-muted">{r.subZone}</span>}
          </>
        ) : (
          dash
        ),
    },
    {
      key: "crop",
      label: t("colCropMix"),
      render: (r) =>
        r.cropMix ? (
          <>
            <span className="block font-medium">{r.cropMix}</span>
            {r.cultivars.length > 0 && <span className="block text-[10px] font-medium text-[#4FB840]">{r.cultivars.join(", ")}</span>}
          </>
        ) : (
          dash
        ),
    },
    { key: "area", label: t("colAreaDu").replace("{unit}", areaWord), render: (r) => <b className="whitespace-nowrap">{formatInteger(area({ du: r.areaDunums }))} {unitLabel}</b> },
    { key: "parcels", label: t("colParcels"), render: (r) => <span className="font-semibold tabular-nums">{formatInteger(r.parcelCount)}</span> },
    {
      key: "yield",
      label: t("colForecastYield"),
      render: (r) => (r.forecastYieldT === null ? dash : <b className="whitespace-nowrap">{formatYieldT(r.forecastYieldT)} t</b>),
    },
    {
      key: "ier",
      label: t("colIerEfficiency"),
      render: (r) =>
        r.ierScore === null ? (
          dash
        ) : (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            {/* Rounded once to the whole number shown; the band comes from that number on the shared IER scale (lib/scores.ts), not from the API's ier_class. */}
            <b>{formatInteger(displayIer(r.ierScore, 0)?.value ?? 0)}</b>
            <IerBandBadge score={displayIer(r.ierScore, 0)?.value} />
          </span>
        ),
    },
    {
      key: "water",
      label: t("colWaterBalance"),
      render: (r) =>
        r.waterUsedM3 === null || r.waterAllocatedM3 === null || r.waterBalanceM3 === null ? (
          dash
        ) : (
          <>
            <span className="block whitespace-nowrap text-[11px] font-semibold">
              <Ltr>
                {kM3(r.waterUsedM3)} / {kM3(r.waterAllocatedM3)} k-m³
              </Ltr>
            </span>
            <span className={cx("block text-[10px] font-medium", r.waterBalanceM3 < 0 ? "text-[#DC2626]" : "text-[#006E01]")}>
              {t(r.waterBalanceM3 < 0 ? "waterOverdraftTemplate" : "waterReserveTemplate").replace(
                "{value}",
                `${r.waterBalanceM3 < 0 ? "-" : "+"}${kM3(Math.abs(r.waterBalanceM3))}`,
              )}
            </span>
          </>
        ),
    },
    {
      key: "actions",
      label: t("colActions"),
      align: "end",
      render: (r) => (
        <span className="inline-flex items-center gap-3">
          <button
            type="button"
            disabled={downloading === r.id}
            onClick={() => dossier(r.id, r.uid)}
            className="whitespace-nowrap rounded border border-line bg-[#F4F7F6] px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-[#E4F8F5] disabled:opacity-60"
          >
            {downloading === r.id ? t("dossierDownloading") : t("dossierButton")}
          </button>
          <OpenFarmLink farmId={r.id} />
        </span>
      ),
    },
  ];
  return (
    <TableShell type="farms" search={search} onSearch={onSearch} isLoading={isLoading} isError={isError} extrasError={extrasError}>
      {dossierError && (
        <div role="alert" className="mb-3 text-xs font-semibold text-red">
          {t("dossierError")}
        </div>
      )}
      <DataTable columns={columns} rows={filtered} rowKey={(r) => String(r.id)} emptyMessage={t("noFarmsMatch")} />
    </TableShell>
  );
}

function FieldReportTable({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const t = useT(STRINGS);
  const areaWord = useAreaWord();
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading, isError, extrasError } = useFieldReportRows();
  const names = useFarmNames();
  const filtered = useMemo(
    () => (rows ?? []).filter((r) => matches(search, r.uid, r.farmUid, names.byUid.get(r.farmUid), r.landUse, r.crop, r.wateringMethod)),
    [rows, search, names],
  );
  const landUseLabel = (value: string | null) =>
    value && value in LAND_USE_LABEL_KEY ? t(LAND_USE_LABEL_KEY[value as keyof typeof LAND_USE_LABEL_KEY]) : value;
  const columns: DataTableColumn<NonNullable<typeof rows>[number]>[] = [
    {
      key: "id",
      label: t("colFieldId"),
      render: (r) => (
        <>
          <b className="block whitespace-nowrap">{r.uid}</b>
          {r.landUse && <span className="block text-[10px] text-muted">{landUseLabel(r.landUse)}</span>}
        </>
      ),
    },
    {
      key: "farm",
      label: t("colFarmDetails"),
      render: (r) => {
        const farmName = names.byUid.get(r.farmUid);
        // The uid is the main line when the farm has no name, so it isn't repeated underneath.
        const detail = [farmName ? r.farmUid : null, names.zoneById.get(r.farmId)].filter(Boolean).join(" · ");
        return (
          <>
            <span className="block font-semibold">{farmName ?? r.farmUid}</span>
            {detail && <span className="block text-[10px] text-muted">{detail}</span>}
          </>
        );
      },
    },
    {
      key: "crop",
      label: t("colCropType"),
      render: (r) =>
        r.crop ? (
          <>
            <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium">
              <span aria-hidden className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: cropDotColor(r.crop) }} />
              {r.crop}
            </span>
            {r.treeCount !== null && (
              <span className="block ps-4 text-[10px] font-semibold text-[#15803d]">
                {t("treesCountTemplate").replace("{count}", formatInteger(r.treeCount))}
              </span>
            )}
          </>
        ) : (
          dash
        ),
    },
    {
      key: "health",
      label: t("colHealthIndex"),
      render: (r) =>
        r.ndvi === null ? (
          dash
        ) : (
          <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
            <Meter pct={r.ndvi * 100} className="bg-[#4FB840]" />
            <b>{formatInteger(r.ndvi * 100)}%</b>
          </span>
        ),
    },
    {
      key: "area",
      label: t("colAreaDu").replace("{unit}", areaWord),
      render: (r) => <b className="whitespace-nowrap">{r.areaDunums === null ? EM_DASH : `${formatInteger(area({ du: r.areaDunums }))} ${unitLabel}`}</b>,
    },
    {
      key: "share",
      label: t("colFarmShare"),
      render: (r) => <span className="font-medium tabular-nums text-muted">{r.farmSharePct === null ? EM_DASH : formatPercent(r.farmSharePct)}</span>,
    },
    {
      key: "watering",
      label: t("colWateringMethod"),
      render: (r) =>
        r.wateringMethod ? (
          <>
            <span className="block whitespace-nowrap text-[11px] font-semibold">{r.wateringMethod}</span>
            {r.tillage && <span className="block text-[10px] text-muted">{r.tillage}</span>}
          </>
        ) : (
          dash
        ),
    },
    { key: "ier", label: t("colIerPct"), render: (r) => <IerPct value={r.ier} /> },
    {
      key: "growth",
      label: t("colGrowthStatus"),
      render: (r) =>
        r.growthStatus ? (
          <span className="inline-block whitespace-nowrap rounded bg-[#E4F8F5] px-2 py-0.5 text-[10px] font-semibold text-[#006E01]">
            {r.growthStatus}
          </span>
        ) : (
          dash
        ),
    },
    { key: "actions", label: t("colActions"), align: "end", render: (r) => <OpenFarmLink farmId={r.farmId} /> },
  ];
  return (
    <TableShell type="fields" search={search} onSearch={onSearch} isLoading={isLoading} isError={isError} extrasError={extrasError}>
      <DataTable columns={columns} rows={filtered} rowKey={(r) => String(r.id)} emptyMessage={t("noParcelsMatch")} />
    </TableShell>
  );
}

const CATEGORY_TONE: Record<string, string> = {
  "protected agriculture": PILL.good,
  "irrigation & utilities": PILL.info,
  "storage & logistics": PILL.neutral,
  livestock: PILL.warn,
  habitation: PILL.neutral,
};
const CONDITION_TONE: Record<string, string> = {
  optimal: PILL.good,
  compliant: PILL.neutral,
};
const CONDITION_PROBLEM_WORDS = ["maintenance", "required", "fail", "damaged", "critical"];
const conditionTone = (condition: string) =>
  CONDITION_TONE[condition.toLowerCase()] ??
  (CONDITION_PROBLEM_WORDS.some((w) => condition.toLowerCase().includes(w)) ? PILL.bad : PILL.neutral);
const PERMIT_TONE: Record<PermitStatus, string> = { permitted: "text-[#006E01]", pending: "text-orange-d", unpermitted: "text-red" };
const PERMIT_KEY = { permitted: "permitPermitted", pending: "permitPending", unpermitted: "permitUnpermitted" } as const;

type StructureTableRow = StructureReportRow & { count?: number };

function StructureReportTable({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const list = useStructureListRows();
  const totals = useStructureReportRows();
  const live = list.data && list.data.rows.length > 0;
  const rows = useMemo<StructureTableRow[] | undefined>(
    () =>
      live
        ? list.data?.rows
        : totals.rows?.map((r, i) => ({
            structure_id: -1 - i,
            farm_id: -1,
            farm_uid: "",
            name: null,
            code: null,
            category: null,
            structure_type: r.type,
            area_du: r.area_du,
            condition: null,
            permit_status: null,
            built_year: null,
            cadastre_code: null,
            count: r.count,
          })),
    [live, list.data, totals.rows],
  );
  return (
    <StructureListTable
      rows={rows ?? []}
      search={search}
      onSearch={onSearch}
      isLoading={!live && totals.isLoading}
      isError={!live && totals.isError}
    />
  );
}

function StructureListTable({
  rows,
  search,
  onSearch,
  isLoading,
  isError,
}: {
  rows: StructureTableRow[];
  search: string;
  onSearch: (value: string) => void;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const t = useT(STRINGS);
  const areaWord = useAreaWord();
  const { area, unitLabel } = useAreaUnit();
  const names = useFarmNames();
  const [category, setCategory] = useState("");
  const categoryOptions = useMemo(() => [...new Set(rows.flatMap((r) => (r.category ? [r.category] : [])))].sort(), [rows]);
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (category === "" || r.category === category) &&
          matches(search, r.farm_uid, names.byId.get(r.farm_id), r.name, r.code, r.category, r.structure_type),
      ),
    [rows, search, names, category],
  );
  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      key: "farm",
      label: t("colFarmIdHolding"),
      render: (r) => (r.farm_uid ? <FarmCell code={r.farm_uid} name={names.byId.get(r.farm_id)} zone={names.zoneById.get(r.farm_id)} /> : dash),
    },
    {
      key: "name",
      label: t("colStructureName"),
      render: (r) => (
        <>
          <span className={cx("block font-semibold", !r.name && "text-muted")}>{r.name ?? EM_DASH}</span>
          {r.code && <span className="block text-[10px] text-muted">{r.code}</span>}
        </>
      ),
    },
    {
      key: "category",
      label: t("colCategory"),
      render: (r) =>
        r.category ? (
          <span className={cx("whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold", CATEGORY_TONE[r.category.toLowerCase()] ?? "bg-[#F4F7F6] text-[#04303B]")}>
            {r.category}
          </span>
        ) : (
          dash
        ),
    },
    {
      key: "type",
      label: t("colStructureType"),
      render: (r) => (
        <>
          <span className="block font-medium text-[#41484B]">{r.structure_type ?? EM_DASH}</span>
          {r.count !== undefined && (
            <span className="block text-[11px] text-muted">{t("structuresCountTemplate").replace("{count}", formatInteger(r.count))}</span>
          )}
        </>
      ),
    },
    {
      key: "area",
      label: t("colAreaDu").replace("{unit}", areaWord),
      render: (r) => <b className="whitespace-nowrap">{r.area_du === null ? EM_DASH : `${formatInteger(area({ du: r.area_du }))} ${unitLabel}`}</b>,
    },
    {
      key: "condition",
      label: t("colCondition"),
      render: (r) =>
        r.condition ? (
          <span className={cx("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold", conditionTone(r.condition))}>
            {r.condition}
          </span>
        ) : (
          dash
        ),
    },
    {
      key: "permit",
      label: t("colPermitStatus"),
      render: (r) =>
        r.permit_status ? (
          <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap font-semibold", PERMIT_TONE[r.permit_status])}>
            {r.permit_status === "permitted" ? (
              <CircleCheck size={12} strokeWidth={2} aria-hidden className="flex-none text-[#4FB840]" />
            ) : (
              <TriangleAlert size={12} strokeWidth={2} aria-hidden className="flex-none" />
            )}
            {t(PERMIT_KEY[r.permit_status])}
          </span>
        ) : (
          dash
        ),
    },
    { key: "year", label: t("colBuiltYear"), render: (r) => <span className="text-muted">{r.built_year ?? EM_DASH}</span> },
    {
      key: "cadastre",
      label: t("colCadastreCode"),
      align: "end",
      render: (r) => <span className="whitespace-nowrap font-mono text-[10px] text-muted">{r.cadastre_code ?? EM_DASH}</span>,
    },
  ];
  return (
    <TableShell
      type="structures"
      search={search}
      onSearch={onSearch}
      isLoading={isLoading}
      isError={isError}
      filters={
        <Select
          ariaLabel={t("structureCategoryFilterLabel")}
          value={category}
          onChange={setCategory}
          options={[{ value: "", label: t("structureCategoryAll") }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
          className="w-full sm:w-44"
        />
      }
    >
      <DataTable columns={columns} rows={filtered} rowKey={(r) => String(r.structure_id)} emptyMessage={t("noStructuresMatch")} />
    </TableShell>
  );
}

function CropReportTable({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const t = useT(STRINGS);
  const areaWord = useAreaWord();
  const { area, unitLabel } = useAreaUnit();
  const { rows, isLoading, isError, extrasError } = useCropReportRows();
  const names = useFarmNames();
  const [category, setCategory] = useState("");
  const categoryOptions = useMemo(
    () => [...new Set((rows ?? []).flatMap((r) => (r.category ? [r.category] : [])))].sort(),
    [rows],
  );
  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => (category === "" || r.category === category) && matches(search, r.farmName, names.byId.get(r.farmId), r.crop, r.category),
      ),
    [rows, search, names, category],
  );
  const columns: DataTableColumn<NonNullable<typeof rows>[number]>[] = [
    {
      key: "farm",
      label: t("colFarmHolding"),
      render: (r) => <FarmCell code={r.farmName} name={names.byId.get(r.farmId)} zone={names.zoneById.get(r.farmId)} />,
    },
    {
      key: "crop",
      label: t("colCropNameCategory"),
      render: (r) => (
        <>
          <b className="block font-bold">{r.crop}</b>
          {r.category && <span className="block text-[10px] font-medium text-muted">{r.category}</span>}
        </>
      ),
    },
    {
      key: "area",
      label: t(areaWord === t("unitHectaresWord") ? "colPlantedHectares" : "colPlantedDunums"),
      render: (r) => <b className="whitespace-nowrap">{r.areaDunums === null ? EM_DASH : `${formatInteger(area({ du: r.areaDunums }))} ${unitLabel}`}</b>,
    },
    { key: "season", label: t("colGrowingSeason"), render: (r) => (r.season ? <span className="font-medium text-[#41484B]">{r.season}</span> : dash) },
    {
      key: "dates",
      label: t("colPlantingHarvest"),
      render: (r) =>
        r.plantingDate === null && r.harvestDate === null ? (
          dash
        ) : (
          <>
            <span className="block whitespace-nowrap text-[11px] font-semibold">{shortDate(r.plantingDate)}</span>
            {r.harvestDate && (
              <span className="block whitespace-nowrap text-[10px] text-muted">{t("harvestEstTemplate").replace("{date}", shortDate(r.harvestDate))}</span>
            )}
          </>
        ),
    },
    {
      key: "yield",
      label: t("colForecastYield"),
      render: (r) => (r.forecastYieldT === null ? dash : <b className="whitespace-nowrap">{formatYieldT(r.forecastYieldT)} t</b>),
    },
    {
      key: "target",
      label: t("colTargetStandard"),
      render: (r) => (r.targetYieldT === null ? dash : <span className="whitespace-nowrap text-muted">{formatYieldT(r.targetYieldT)} t</span>),
    },
    { key: "ier", label: t("colIerPct"), render: (r) => <IerPct value={r.ier} /> },
    {
      key: "status",
      label: t("colStatus"),
      align: "end",
      render: (r) =>
        r.status ? (
          <span className={cx("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold", cropStatusTone(r.status))}>
            {r.status}
          </span>
        ) : (
          dash
        ),
    },
  ];
  return (
    <TableShell
      type="crops"
      search={search}
      onSearch={onSearch}
      isLoading={isLoading}
      isError={isError}
      extrasError={extrasError}
      filters={
        <Select
          ariaLabel={t("cropCategoryFilterLabel")}
          value={category}
          onChange={setCategory}
          options={[{ value: "", label: t("cropCategoryAll") }, ...categoryOptions.map((c) => ({ value: c, label: c }))]}
          className="w-full sm:w-48"
        />
      }
    >
      <DataTable columns={columns} rows={filtered} rowKey={(r) => `${r.farmId}-${r.crop}`} emptyMessage={t("noCropParcelsMatch")} />
    </TableShell>
  );
}

/** One row per farm and date-palm cultivar. */
function DateCultivarTable({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const query = useDateCultivarRows();
  const rows = query.data?.rows;
  const names = useFarmNames();
  const [cultivar, setCultivar] = useState("");
  const cultivarOptions = useMemo(() => [...new Set((rows ?? []).map((r) => r.cultivar))].sort(), [rows]);
  const filtered = useMemo(
    () =>
      (rows ?? []).filter(
        (r) => (cultivar === "" || r.cultivar === cultivar) && matches(search, r.farm_uid, names.byId.get(r.farm_id), r.cultivar),
      ),
    [rows, search, names, cultivar],
  );
  const columns: DataTableColumn<NonNullable<typeof rows>[number]>[] = [
    {
      key: "farm",
      label: t("colFarmHolding"),
      render: (r) => <FarmCell code={r.farm_uid} name={names.byId.get(r.farm_id)} zone={names.zoneById.get(r.farm_id)} />,
    },
    {
      key: "cultivar",
      label: t("colCultivarVariety"),
      render: (r) => (
        <>
          <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-bold">
            <Trees size={16} strokeWidth={1.8} aria-hidden className="flex-none text-[#15803d]" />
            {r.cultivar}
          </span>
          <span className="block text-[10px] text-muted">{t("datePalmSpecies")}</span>
        </>
      ),
    },
    { key: "palms", label: t("colPalmTreesCount"), render: (r) => <b className="text-sm tabular-nums">{formatInteger(r.palm_count)}</b> },
    {
      key: "area",
      label: t("colPlantedArea"),
      render: (r) => (
        <span className="whitespace-nowrap font-semibold tabular-nums">{r.planted_area_du === null ? EM_DASH : `${formatInteger(area({ du: r.planted_area_du }))} ${unitLabel}`}</span>
      ),
    },
    {
      key: "age",
      label: t("colAvgAgeShort"),
      render: (r) => (
        <span className="whitespace-nowrap text-muted">{r.avg_age_years === null ? EM_DASH : `${formatInteger(r.avg_age_years)} ${t("yearsUnit")}`}</span>
      ),
    },
    { key: "maturity", label: t("colMaturityStage"), render: (r) => (r.maturity_stage ? <span className="inline-block whitespace-nowrap rounded bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#D97706]">{r.maturity_stage}</span> : dash) },
    {
      key: "yield",
      label: t("colEstimatedYield"),
      render: (r) =>
        r.est_yield_t === null ? (
          dash
        ) : (
          <b className="whitespace-nowrap">
            <Ltr>{`${formatInteger(r.est_yield_t)} t`}</Ltr>
          </b>
        ),
    },
    {
      key: "vigor",
      label: t("colVigorScore"),
      render: (r) =>
        r.vigor_score === null ? (
          dash
        ) : (
          <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
            <Meter pct={r.vigor_score} className="bg-green" />
            <b>{formatInteger(Math.round(r.vigor_score))}%</b>
          </span>
        ),
    },
    {
      key: "weevil",
      label: t("colWeevilRisk"),
      render: (r) =>
        r.weevil_risk ? (
          <span className={cx("inline-block whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold", WEEVIL_TONE[r.weevil_risk])}>
            {t("weevilRiskTemplate").replace("{level}", t(WEEVIL_RISK_LABEL_KEY[r.weevil_risk]))}
          </span>
        ) : (
          dash
        ),
    },
    {
      key: "irrigation",
      label: t("colIrrigation"),
      align: "end",
      render: (r) => <span className="whitespace-nowrap text-[11px] font-medium text-muted">{r.irrigation ?? EM_DASH}</span>,
    },
  ];
  return (
    <TableShell
      type="date-cultivars"
      search={search}
      onSearch={onSearch}
      isLoading={query.isLoading}
      isError={query.isError}
      filters={
        <Select
          ariaLabel={t("cultivarFilterLabel")}
          value={cultivar}
          onChange={setCultivar}
          options={[{ value: "", label: t("cultivarAll") }, ...cultivarOptions.map((c) => ({ value: c, label: c }))]}
          className="w-full sm:w-44"
        />
      }
    >
      <DataTable columns={columns} rows={filtered} rowKey={(r) => `${r.farm_id}-${r.cultivar}`} emptyMessage={t("noCultivarsMatch")} />
    </TableShell>
  );
}

/** One row per farm: allocated vs metered water this month. */
function WaterQuotaTable({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  const t = useT(STRINGS);
  const { area, unitLabel } = useAreaUnit();
  const query = useWaterQuotaRows();
  const rows = query.data?.rows;
  const names = useFarmNames();
  const filtered = useMemo(
    () => (rows ?? []).filter((r) => matches(search, r.farm_uid, names.byId.get(r.farm_id), r.zone_name)),
    [rows, search, names],
  );
  const km3 = (value: number | null, className?: string) =>
    value === null ? (
      dash
    ) : (
      <span className={cx("whitespace-nowrap", className)}>
        <Ltr>{`${kM3(value)} k-m³`}</Ltr>
      </span>
    );
  const columns: DataTableColumn<NonNullable<typeof rows>[number]>[] = [
    { key: "farm", label: t("colFarmIdHoldingWater"), render: (r) => <FarmCell code={r.farm_uid} name={names.byId.get(r.farm_id)} /> },
    {
      key: "region",
      label: t("colRegionOnly"),
      render: (r) => (r.zone_name ? <span className="font-semibold">{t("regionNameTemplate").replace("{region}", r.zone_name)}</span> : dash),
    },
    {
      key: "holding",
      label: t("colHoldingArea"),
      render: (r) =>
        r.holding_area_du === null ? (
          dash
        ) : (
          <span className="whitespace-nowrap font-medium tabular-nums">
            <Ltr>{`${formatInteger(area({ du: r.holding_area_du }))} ${unitLabel}`}</Ltr>
          </span>
        ),
    },
    { key: "allocated", label: t("colAllocatedQuota"), render: (r) => km3(r.allocated_m3, "font-bold tabular-nums text-[#0284C7]") },
    { key: "consumed", label: t("colMeteredConsumption"), render: (r) => km3(r.consumed_m3, "font-bold tabular-nums") },
    {
      key: "balance",
      label: t("colNetWaterBalance"),
      render: (r) =>
        r.net_balance_m3 === null ? (
          dash
        ) : (
          <span className={cx("whitespace-nowrap font-bold tabular-nums", r.net_balance_m3 < 0 ? "text-[#DC2626]" : "text-[#006E01]")}>
            <Ltr>
              {t(r.net_balance_m3 < 0 ? "waterOverdraftShortTemplate" : "waterSurplusTemplate").replace(
                "{value}",
                `${r.net_balance_m3 < 0 ? "-" : "+"}${kM3(Math.abs(r.net_balance_m3))}`,
              )}
            </Ltr>
          </span>
        ),
    },
    {
      key: "ier",
      label: t("colIerEfficiencyRating"),
      render: (r) =>
        r.ier === null ? (
          dash
        ) : (
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <b>{formatInteger(displayIer(r.ier, 0)?.value ?? 0)}</b>
            <IerBandBadge score={displayIer(r.ier, 0)?.value} />
          </span>
        ),
    },
    {
      key: "compliance",
      label: t("colComplianceStatus"),
      align: "end",
      render: (r) =>
        r.net_balance_m3 === null ? (
          dash
        ) : r.net_balance_m3 < 0 ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-[#FEE2E2] px-2.5 py-1 text-[10px] font-bold text-[#DC2626]">
            <TriangleAlert size={12} strokeWidth={2} aria-hidden />
            {t("complianceOverdraft")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 whitespace-nowrap rounded bg-[#E4F8F5] px-2.5 py-1 text-[10px] font-bold text-[#006E01]">
            <CircleCheck size={12} strokeWidth={2} aria-hidden />
            {t("complianceCompliant")}
          </span>
        ),
    },
  ];
  return (
    <TableShell type="water-quota" search={search} onSearch={onSearch} isLoading={query.isLoading} isError={query.isError}>
      <DataTable columns={columns} rows={filtered} rowKey={(r) => String(r.farm_id)} emptyMessage={t("noFarmsMatch")} />
    </TableShell>
  );
}

export function ReportsTable({ type }: { type: ReportType }) {
  const [search, setSearch] = useState("");

  // Each tab manages its own data hook; only `search` and the shell are
  // shared, so re-mounting on tab switch (via `key`) resets pagination.
  const props = { search, onSearch: setSearch };
  switch (type) {
    case "fields":
      return <FieldReportTable key="fields" {...props} />;
    case "structures":
      return <StructureReportTable key="structures" {...props} />;
    case "date-cultivars":
      return <DateCultivarTable key="date-cultivars" {...props} />;
    case "crops":
      return <CropReportTable key="crops" {...props} />;
    case "water-quota":
      return <WaterQuotaTable key="water-quota" {...props} />;
    case "farms":
    default:
      return <FarmReportTable key="farms" {...props} />;
  }
}
