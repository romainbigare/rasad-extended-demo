import { csvFileName, downloadCsv } from "@shared/export/csvExport";
import type { StructureTypeRow } from "@/lib/analytics/types";
import { duToUnit, type AreaUnit } from "@/lib/area/AreaUnitContext";
import { displayIer } from "@/lib/scores";

import type { ReportType } from "../components/ReportTypeTabs";
import type { DateCultivarRow, WaterQuotaRow } from "../data/types";
import type { CropReportRow, FarmReportRow, FieldReportRow } from "../hooks/useReportRows";

export interface ReportExportRows {
  farms?: FarmReportRow[];
  fields?: FieldReportRow[];
  structures?: StructureTypeRow[];
  crops?: CropReportRow[];
  dateCultivars?: DateCultivarRow[];
  waterQuota?: WaterQuotaRow[];
}

/** CSV of exactly the rows the table shows. Returns false when that tab's rows aren't loaded. */
export function exportReportCsv(type: ReportType, data: ReportExportRows, unit: AreaUnit = "dunum"): boolean {
  const u = unit === "hectare" ? "ha" : "du";
  const a = (du: number | null | undefined) => duToUnit(du, unit);
  if (type === "farms" && data.farms) {
    downloadCsv(
      [
        "Farm uid",
        "Farm name",
        "Region / Zone",
        "Sub-zone",
        "Crop mix",
        "Species",
        `Area (${u})`,
        "Parcels",
        "Forecast yield (t)",
        "IER",
        "IER class",
        "IER band",
        "Water used (m3)",
        "Water allocated (m3)",
        "Water balance (m3)",
      ],
      data.farms.map((r) => [
        r.uid,
        r.name,
        r.zoneName,
        r.subZone,
        r.cropMix,
        r.cultivars.join("; "),
        a(r.areaDunums),
        r.parcelCount,
        r.forecastYieldT,
        r.ierScore,
        // ier_class is the API's own value (export contract); the band is the shared IER scale's (lib/scores.ts).
        r.ierClass,
        // The band of the whole number the Reports table prints, so the file and the screen agree.
        displayIer(r.ierScore, 0)?.info.en ?? null,
        r.waterUsedM3,
        r.waterAllocatedM3,
        r.waterBalanceM3,
      ]),
      csvFileName("report-farms"),
    );
    return true;
  }
  if (type === "fields" && data.fields) {
    downloadCsv(
      ["Field uid", "Farm uid", `Area (${u})`, "Land use", "NDVI", "Health", "Watering method", "Growth status"],
      data.fields.map((r) => [r.uid, r.farmUid, a(r.areaDunums), r.landUse, r.ndvi, r.health, r.wateringMethod, r.growthStatus]),
      csvFileName("report-fields"),
    );
    return true;
  }
  if (type === "structures" && data.structures) {
    downloadCsv(
      ["Structure type", "Count", `Area (${u})`],
      data.structures.map((r) => [r.type, r.count, a(r.area_du)]),
      csvFileName("report-structures"),
    );
    return true;
  }
  if (type === "crops" && data.crops) {
    downloadCsv(
      ["Farm", "Crop", `Planted (${u})`, "Share of farm (%)", "Fields", "Season", "Status"],
      data.crops.map((r) => [r.farmName, r.crop, a(r.areaDunums), r.sharePct, r.fieldCount, r.season, r.status]),
      csvFileName("report-crops"),
    );
    return true;
  }
  if (type === "date-cultivars" && data.dateCultivars) {
    downloadCsv(
      ["Farm uid", "Species", "Palm count", `Planted (${u})`, "Avg age (yrs)", "Maturity stage", "Est. yield (t)", "Vigor score", "Weevil risk", "Irrigation"],
      data.dateCultivars.map((r) => [
        r.farm_uid,
        r.cultivar,
        r.palm_count,
        a(r.planted_area_du),
        r.avg_age_years,
        r.maturity_stage,
        r.est_yield_t,
        r.vigor_score,
        r.weevil_risk,
        r.irrigation,
      ]),
      csvFileName("report-date-species"),
    );
    return true;
  }
  if (type === "water-quota" && data.waterQuota) {
    downloadCsv(
      ["Farm uid", "Region / Zone", `Holding area (${u})`, "Allocated (m3)", "Consumed (m3)", "Net balance (m3)", "IER"],
      data.waterQuota.map((r) => [r.farm_uid, r.zone_name, a(r.holding_area_du), r.allocated_m3, r.consumed_m3, r.net_balance_m3, r.ier]),
      csvFileName("report-water-quota"),
    );
    return true;
  }
  return false;
}
