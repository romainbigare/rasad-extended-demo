import type { DayForecastPoint, MinuteCastData } from "@shared/weather/endpoints";

export type UnitSystem = "metric" | "imperial";

export function unitSystem(unit: unknown): UnitSystem {
  const value = unit && typeof unit === "object" ? (unit as { value?: unknown }).value : unit;
  return value === "imperial" ? "imperial" : "metric";
}

export type ForecastMetric = "temp" | "humidity" | "rain" | "wind_speed" | "pressure";

const UNIT_LABEL: Record<ForecastMetric, Record<UnitSystem, string>> = {
  temp: { metric: "°C", imperial: "°F" },
  humidity: { metric: "%", imperial: "%" },
  rain: { metric: "mm", imperial: "in" },
  wind_speed: { metric: "m/s", imperial: "mph" },
  pressure: { metric: "hPa", imperial: "inHg" },
};

export function forecastUnit(metric: ForecastMetric, system: UnitSystem): string {
  return UNIT_LABEL[metric][system];
}

/** day-forecast is always metric (see useDayForecast), so imperial users get
 * the same conversions current-weather's own _f/_in/_mph fields use. */
export function convertForecastValue(metric: ForecastMetric, value: number, system: UnitSystem): number {
  if (system === "metric") return value;
  switch (metric) {
    case "temp":
      return value * 1.8 + 32;
    case "rain":
      return value / 25.4;
    case "wind_speed":
      return value * 2.236936;
    case "pressure":
      return value * 0.02953;
    default:
      return value;
  }
}

export function parseForecastTime(datetime: string): Date {
  return new Date(`${datetime.replace(" ", "T")}Z`);
}

/** Forecast points from now onward - the table keeps the last few hours of
 * the day it was fetched, which aren't a forecast any more. */
export function upcomingPoints(points: DayForecastPoint[], now: Date = new Date()): DayForecastPoint[] {
  return points.filter((p) => parseForecastTime(p.datetime).getTime() >= now.getTime() - 3 * 3600 * 1000);
}

export interface MinuteCastSegment {
  startMinute: number;
  endMinute: number;
  /** 0 none, 1 rain, 2 snow, 3 ice, 4 mixed. */
  typeId: number;
  text: string;
}

export interface MinuteCastView {
  headline: string;
  totalMinutes: number;
  segments: MinuteCastSegment[];
}

export function toMinuteCastView(raw: MinuteCastData | undefined): MinuteCastView | null {
  if (!raw?.Summaries?.length) return null;
  const segments = raw.Summaries.map((s) => ({
    startMinute: s.StartMinute,
    endMinute: s.EndMinute,
    typeId: s.TypeId ?? 0,
    text: String(s.MinuteText ?? "").replace("%MINUTE_VALUE", String(s.CountMinute ?? "")),
  }));
  return {
    headline: raw.Summary?.Phrase ?? segments[0].text,
    totalMinutes: Math.max(...segments.map((s) => s.endMinute)) + 1,
    segments,
  };
}
