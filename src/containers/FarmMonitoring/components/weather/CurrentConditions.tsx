import type { RbacRequestError } from "@shared/network/rbacRequest";
import type { CurrentWeatherData } from "@shared/weather/endpoints";
import { Navigation } from "lucide-react";
import { KpiTile, ValueWithUnit } from "@/components/ui/KpiTile";
import { InlineError, SkeletonValue } from "@/components/ui/States";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EM_DASH } from "@/lib/format";
import type { UnitSystem } from "@/lib/weather/format";

import { STRINGS } from "../../data/translations";

const twoDecimals = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function num(value: number | null | undefined, format = oneDecimal): string {
  return value === null || value === undefined || Number.isNaN(value) ? EM_DASH : format.format(value);
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

function compass(deg: number | null | undefined): string {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return "";
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

interface QueryState {
  data?: CurrentWeatherData;
  isLoading: boolean;
  isError: boolean;
  error: RbacRequestError | null;
  refetch: () => unknown;
}

export function CurrentConditions({ query, system }: { query: QueryState; system: UnitSystem }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const metric = system === "metric";

  if (query.isLoading) {
    return (
      <div className="grid gap-3.5 lg:grid-cols-[220px_1fr]">
        <div className="h-[168px] animate-pulse rounded-xl bg-teal-3/20" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="rounded-xl border border-line p-3.5">
              <SkeletonValue className="h-3 w-16" />
              <SkeletonValue className="mt-3 h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = query.data;
  if (query.isError || !d) {
    return (
      <div className="rounded-xl border border-dashed border-[#d3dbd8] bg-[#fafbfb] px-3 py-4 text-center">
        <InlineError message={t("weatherCurrentError")} />
      </div>
    );
  }

  const updated = d.last_updated ? new Date(d.last_updated) : null;
  const updatedLabel =
    updated && !Number.isNaN(updated.getTime())
      ? new Intl.DateTimeFormat(language === "ar" ? "ar-AE" : "en-GB", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(updated)
      : null;

  const tiles = [
    {
      id: "rain",
      label: t("weatherRain"),
      value: num(metric ? d.rain_mm : d.rain_in, twoDecimals),
      unit: metric ? "mm" : "in",
    },
    {
      id: "rainBeta",
      label: t("weatherRainBeta"),
      value: num(metric ? d.current_rain_beta_mm : d.current_rain_beta_in, twoDecimals),
      unit: metric ? "mm" : "in",
    },
    { id: "humidity", label: t("weatherHumidity"), value: num(d.humidity), unit: "%" },
    {
      id: "vpd",
      label: t("weatherVpd"),
      value: num(metric ? d.vpd_kpa : d.vpd_inhg, twoDecimals),
      unit: metric ? "kPa" : "inHg",
    },
    { id: "uv", label: t("weatherUv"), value: num(d["uv index"]), unit: undefined },
    { id: "clouds", label: t("weatherClouds"), value: num(d.clouds), unit: "%" },
    {
      id: "wind",
      label: t("weatherWind"),
      value: num(metric ? d.wind_speed_mps : d.wind_speed_mph),
      unit: metric ? "m/s" : "mph",
      sub: d.wind_deg !== undefined && d.wind_deg !== null ? (
        <span className="inline-flex items-center gap-1">
          <Navigation
            aria-hidden
            width={12}
            height={12}
            fill="currentColor"
            strokeWidth={0}
            // Meteorological convention: wind_deg is where it blows FROM, so
            // the arrow points the other way, toward where it's heading.
            style={{ transform: `rotate(${d.wind_deg + 180}deg)` }}
          />
          {compass(d.wind_deg)} · {num(d.wind_deg, oneDecimal)}°
        </span>
      ) : undefined,
    },
    {
      id: "pressure",
      label: t("weatherPressure"),
      value: num(metric ? d.pressure_hpa : d.pressure_inhg, metric ? oneDecimal : twoDecimals),
      unit: metric ? "hPa" : "inHg",
    },
    {
      id: "dew",
      label: t("weatherDewPoint"),
      value: num(metric ? d.t_dew_c : d.t_dew_f),
      unit: metric ? "°C" : "°F",
    },
  ];

  return (
    <div className="grid gap-3.5 lg:grid-cols-[220px_1fr]">
      <div className="flex flex-col justify-between rounded-xl border border-line bg-[#F4F7F6] p-4 text-ink">
        <div className="text-xs font-semibold text-muted">{t("weatherCurrentHeading")}</div>
        <div className="my-3">
          <div className="text-2xl font-extrabold leading-none">
            {num(metric ? d.temperature_c : d.temperature_f)}
            <span className="ms-1 align-top text-xs font-semibold text-muted">
              {metric ? "°C" : "°F"}
            </span>
          </div>
          {d.type && <div className="mt-2 text-xs font-semibold">{d.type}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <KpiTile
            key={tile.id}
            testId={`weather-${tile.id}`}
            label={tile.label}
            value={<ValueWithUnit value={tile.value} unit={tile.value === EM_DASH ? undefined : tile.unit} />}
            sub={tile.sub}
          />
        ))}
      </div>
    </div>
  );
}
