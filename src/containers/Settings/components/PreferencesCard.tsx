import { useAuth } from "@shared/auth/AuthContext";
import { useEffect, useState } from "react";

import { cx } from "@/components/ui/cx";
import type { RbacProfile } from "@/lib/auth/profile";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import { useSavePreferences } from "../hooks/useSavePreferences";
import { OptionButton } from "./OptionButton";

const LABEL = "mb-2 block text-xs font-bold uppercase tracking-wider text-muted";

/** The cache switch's on/off choice, remembered in this browser only (there is no account field for it). */
const CLOUD_CACHE_KEY = "rasad.cloudLayerCache";

function readCloudCache(): boolean {
  try {
    const stored = window.localStorage.getItem(CLOUD_CACHE_KEY);
    return stored === null ? true : stored === "1";
  } catch {
    return true;
  }
}

export function PreferencesCard() {
  const t = useT(STRINGS);
  const [cloudCache, setCloudCache] = useState(true);
  useEffect(() => setCloudCache(readCloudCache()), []);
  const toggleCloudCache = () => {
    const next = !cloudCache;
    setCloudCache(next);
    try {
      window.localStorage.setItem(CLOUD_CACHE_KEY, next ? "1" : "0");
    } catch {
      // Storage blocked (private window etc.) - the switch still works for this visit.
    }
  };
  const auth = useAuth();
  const { save, pendingField, error } = useSavePreferences();
  const profile = auth?.user as unknown as RbacProfile | null;
  const prefs = profile?.preferences ?? { area_unit: "dunum", coord_format: "DMS", locale: "en" };

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-line bg-panel p-6 shadow-xs" data-testid="settings-preferences">
      <div>
        <div className={LABEL}>{t("areaUnitLabel")}</div>
        <div className="grid grid-cols-2 gap-3">
          {(["dunum", "hectare"] as const).map((value) => (
            <OptionButton
              key={value}
              selected={prefs.area_unit === value}
              disabled={pendingField === "area_unit"}
              onClick={() => save("area_unit", { area_unit: value })}
            >
              {value === "dunum" ? t("dunumsOption") : t("hectaresOption")}
            </OptionButton>
          ))}
        </div>
      </div>

      <div>
        <div className={LABEL}>{t("coordFormatLabel")}</div>
        <div className="grid grid-cols-2 gap-3">
          {(["DMS", "DD"] as const).map((value) => (
            <OptionButton
              key={value}
              selected={prefs.coord_format === value}
              disabled={pendingField === "coord_format"}
              onClick={() => save("coord_format", { coord_format: value })}
            >
              {value === "DMS" ? t("dmsOption") : t("decimalDegreesOption")}
            </OptionButton>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="text-[11px] font-semibold text-red">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <div className="text-xs font-bold text-ink">{t("cloudCacheLabel")}</div>
          <div className="text-[11px] text-muted">{t("cloudCacheDescription")}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={cloudCache}
          aria-label={t("cloudCacheLabel")}
          onClick={toggleCloudCache}
          data-testid="toggle-cloud-cache"
          className={cx(
            "flex h-5 w-10 flex-none items-center rounded-full p-0.5 transition-colors",
            cloudCache ? "bg-[#4FB840]" : "bg-[#c1c7cb]",
          )}
        >
          <span
            aria-hidden
            className={cx(
              "h-4 w-4 rounded-full bg-white shadow-md transition-transform",
              cloudCache ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>
    </div>
  );
}
