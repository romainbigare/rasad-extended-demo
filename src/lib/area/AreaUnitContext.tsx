import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@shared/auth/AuthContext";

import { savePreferencesPatch, type RbacProfile } from "@/lib/auth/profile";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

export type AreaUnit = "dunum" | "hectare";

/** 1 hectare = 10 dunums (a dunum is 1,000 m2). */
export const DUNUMS_PER_HECTARE = 10;

/** One area as the API returns it: whichever of the two units it carries. */
export interface AreaPair {
  du?: number | null;
  ha?: number | null;
}

interface AreaUnitValue {
  unit: AreaUnit;
  setUnit: (unit: AreaUnit) => void;
  /** Short unit text for the selected unit ("du" / "ha"), in the UI language. */
  unitLabel: string;
  /** Short unit text for the other unit. */
  otherUnitLabel: string;
  /** Full lowercase unit word for the selected unit ("dunums" / "hectares"). */
  unitWord: string;
  /** A per-dunum quantity (e.g. tonnes per dunum) expressed per selected unit. */
  perArea: (perDunum: number) => number;
  /** The area in the selected unit; converts from the other unit if only that one is present. */
  area: (pair: AreaPair) => number | null;
  /** The same area in the other unit. */
  otherArea: (pair: AreaPair) => number | null;
  /** An API row's area (du and ha as decimal strings) as text in the selected unit, "—" when absent. */
  areaText: (du: string | number | null | undefined, ha?: string | number | null) => string;
}

/** A decimal field as the API sends it (string or number) -> number, null for empty/invalid. */
export function parseArea(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** A dunum figure in the given unit (for places outside React, e.g. file export). */
export function duToUnit(du: number | null | undefined, unit: AreaUnit): number | null {
  return toUnit({ du }, unit);
}

const toUnit = (pair: AreaPair, unit: AreaUnit): number | null => {
  const { du, ha } = pair;
  if (unit === "dunum") return du ?? (ha == null ? null : ha * DUNUMS_PER_HECTARE);
  return ha ?? (du == null ? null : du / DUNUMS_PER_HECTARE);
};

const AreaUnitContext = createContext<AreaUnitValue | null>(null);

export function AreaUnitProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { language } = useLanguage();
  const saved = (auth?.user as unknown as RbacProfile | null)?.preferences?.area_unit;
  const [unit, setUnitState] = useState<AreaUnit>(saved === "hectare" ? "hectare" : "dunum");

  // Follow the profile: it arrives after mount, and Settings can change it too.
  useEffect(() => {
    if (saved === "dunum" || saved === "hectare") setUnitState(saved);
  }, [saved]);

  const updatePreferences = auth?.updatePreferences;
  const canSave = Boolean(auth?.user);
  const setUnit = useCallback(
    (next: AreaUnit) => {
      setUnitState(next);
      if (canSave) void Promise.resolve(savePreferencesPatch(updatePreferences, { area_unit: next })).catch(() => null);
    },
    [canSave, updatePreferences],
  );

  const value = useMemo<AreaUnitValue>(() => {
    const other: AreaUnit = unit === "dunum" ? "hectare" : "dunum";
    const label = (u: AreaUnit) => (u === "dunum" ? t("areaUnitDu", language) : t("areaUnitHa", language));
    const word = unit === "dunum" ? t("areaUnitDunumsWord", language) : t("areaUnitHectaresWord", language);
    return {
      unit,
      setUnit,
      unitLabel: label(unit),
      otherUnitLabel: label(other),
      unitWord: word,
      perArea: (perDunum) => (unit === "hectare" ? perDunum * DUNUMS_PER_HECTARE : perDunum),
      area: (pair) => toUnit(pair, unit),
      otherArea: (pair) => toUnit(pair, other),
      areaText: (du, ha) => {
        const n = toUnit({ du: parseArea(du), ha: parseArea(ha) }, unit);
        return n === null ? "—" : `${n.toLocaleString("en-US", { maximumFractionDigits: 0 })} ${label(unit)}`;
      },
    };
  }, [unit, setUnit, language]);

  return <AreaUnitContext.Provider value={value}>{children}</AreaUnitContext.Provider>;
}

export function useAreaUnit(): AreaUnitValue {
  const value = useContext(AreaUnitContext);
  if (!value) throw new Error("useAreaUnit must be used inside <AreaUnitProvider>");
  return value;
}
