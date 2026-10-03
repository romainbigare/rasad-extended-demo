import { Layers } from "lucide-react";
import { useAuth } from "@shared/auth/AuthContext";
import type { SoilWaterContentData } from "@shared/weather/endpoints";
import { Card, CardHeader } from "@/components/ui/Card";
import { InlineError, SkeletonValue } from "@/components/ui/States";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { EM_DASH } from "@/lib/format";
import { unitSystem } from "@/lib/weather/format";
import { useSoilWaterContent } from "@/lib/weather/useFarmWeather";

import { STRINGS } from "../../data/translations";
import { LastUpdated } from "./LastUpdated";

const LAYERS = [
  {
    metric: "0 - 7 cm",
    imperial: "0 - 2.75 in",
    readingCm: 5,
    water: "volumetric_soil_water_5cm_m3m3",
    temp: "soil_temp_5cm_c",
    height: 40,
    tone: "#b08a64",
  },
  {
    metric: "7 - 28 cm",
    imperial: "2.75 - 11.02 in",
    readingCm: 15,
    water: "volumetric_soil_water_15cm_m3m3",
    temp: "soil_temp_15cm_c",
    height: 50,
    tone: "#94704d",
  },
  {
    metric: "28 - 100 cm",
    imperial: "11.02 - 39.37 in",
    readingCm: 50,
    water: "volumetric_soil_water_50cm_m3m3",
    temp: "soil_temp_50cm_c",
    height: 62,
    tone: "#76583c",
  },
  {
    metric: "100 - 289 cm",
    imperial: "39.37 - 113.78 in",
    readingCm: 150,
    water: "volumetric_soil_water_150cm_m3m3",
    temp: "soil_temp_150cm_c",
    height: 78,
    tone: "#57402c",
  },
] as const satisfies ReadonlyArray<{
  metric: string;
  imperial: string;
  readingCm: number;
  water: keyof SoilWaterContentData;
  temp: keyof SoilWaterContentData;
  height: number;
  tone: string;
}>;

const oneDecimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function fmt(value: number | null | undefined): string {
  return value === null || value === undefined || Number.isNaN(value) ? EM_DASH : oneDecimal.format(value);
}

function Pill({ value, unit, tone }: { value: string; unit: string; tone: "water" | "temp" }) {
  return (
    <span
      className={`whitespace-nowrap rounded-md px-2 py-[3px] text-xs font-bold text-ink ${
        tone === "water" ? "bg-blue-l" : "bg-orange-l"
      }`}
    >
      {value}
      {value !== EM_DASH && <small className="ms-0.5 text-[11px] font-semibold text-muted">{unit}</small>}
    </span>
  );
}

export function SoilProfileCard({ farmId }: { farmId: number | null }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const auth = useAuth();
  const imperial = unitSystem(auth?.user?.unit) === "imperial";
  const soil = useSoilWaterContent(farmId);
  const d = soil.data;

  const temp = (c: number | null | undefined) =>
    imperial && c !== null && c !== undefined ? c * 1.8 + 32 : c;
  const moisture = (m3m3: number | null | undefined) =>
    m3m3 === null || m3m3 === undefined ? m3m3 : m3m3 * 100;

  const deficit = d?.soil_moisture_deficit_mm;
  const updated = d?.last_updated ? new Date(d.last_updated) : null;
  const updatedLabel =
    updated && !Number.isNaN(updated.getTime())
      ? new Intl.DateTimeFormat(language === "ar" ? "ar-AE" : "en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(updated)
      : null;

  let body;
  if (farmId === null) {
    body = <p className="m-0 text-xs text-muted">{t("weatherSelectFarm")}</p>;
  } else if (soil.isError) {
    body = (
      <div className="rounded-xl border border-dashed border-[#d3dbd8] bg-[#fafbfb] px-3 py-4 text-center">
        <InlineError message={t("soilError")} />
      </div>
    );
  } else {
    const loading = soil.isLoading || !d;
    body = (
      <div className="mx-auto w-full max-w-[640px]">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_minmax(84px,150px)_minmax(0,1fr)] gap-1.5 sm:grid-cols-[1fr_150px_1fr] sm:gap-3 text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
          <div className="text-end">{t("soilWaterLabel")}</div>
          <div className="text-center">{t("soilDepthLabel")}</div>
          <div>{t("soilTempLabel")}</div>
        </div>

        {/* Grass cap */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(84px,150px)_minmax(0,1fr)] gap-1.5 sm:grid-cols-[1fr_150px_1fr] sm:gap-3">
          <span />
          <div aria-hidden className="h-3 rounded-t-[10px] bg-green" />
          <span />
        </div>

        <ul className="m-0 list-none p-0">
          {LAYERS.map((layer, i) => (
            <li
              key={layer.water}
              className="grid grid-cols-[minmax(0,1fr)_minmax(84px,150px)_minmax(0,1fr)] items-center gap-1.5 sm:grid-cols-[1fr_150px_1fr] sm:gap-3"
            >
              <div className="flex items-center justify-end gap-2">
                {loading ? (
                  <SkeletonValue className="h-6 w-16" />
                ) : (
                  <Pill value={fmt(moisture(d[layer.water] as number | null))} unit="%" tone="water" />
                )}
                {/* Connector lines only from sm - on phones the pills need the room. */}
                <span aria-hidden className="hidden h-px w-6 bg-line sm:block sm:w-10" />
              </div>
              <div
                className={`flex items-center justify-center text-[11px] font-bold text-white ${
                  i === LAYERS.length - 1 ? "rounded-b-[10px]" : ""
                }`}
                style={{ height: layer.height, background: layer.tone, borderTop: "2px solid rgb(var(--panel))" }}
                title={t("soilReadingDepth").replace(
                  "{depth}",
                  imperial ? `${oneDecimal.format(layer.readingCm / 2.54)} in` : `${layer.readingCm} cm`,
                )}
              >
                {imperial ? layer.imperial : layer.metric}
              </div>
              <div className="flex items-center gap-2">
                <span aria-hidden className="hidden h-px w-6 bg-line sm:block sm:w-10" />
                {loading ? (
                  <SkeletonValue className="h-6 w-16" />
                ) : (
                  <Pill value={fmt(temp(d[layer.temp] as number | null))} unit={imperial ? "°F" : "°C"} tone="temp" />
                )}
              </div>
            </li>
          ))}
        </ul>

      </div>
    );
  }

  return (
    <Card className="p-4" testId="mon-soil">
      <CardHeader size="lg"
        icon={Layers}
        title={t("soilTitle")}
        subtitle={t("soilSubtitle")}
        actions={
          farmId !== null && (
            <>
              <LastUpdated at={d?.last_updated} />
              {deficit !== undefined && deficit !== null && (
                <span className="rounded-lg border border-line px-2.5 py-[5px] text-xs">
                  <span className="text-muted">{t("soilDeficitLabel")} </span>
                  <b>{imperial ? `${oneDecimal.format(deficit / 25.4)} in` : `${oneDecimal.format(deficit)} mm`}</b>
                </span>
              )}
            </>
          )
        }
      />
      {body}
    </Card>
  );
}
