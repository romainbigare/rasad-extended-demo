import type { Language } from "@/lib/i18n/LanguageContext";

/**
 * The one definition of the irrigation efficiency ratio (IER) scale, 0-100: five bands, a subsidy line
 * at 65, and the colours every screen draws them in. Anything that names an IER band, colours an IER
 * figure or tests it against the subsidy line reads from here, never from its own thresholds.
 * (The API's older four-class `ier_class` / `average_class` values are not used for display.)
 */
export type IerBand = "excellent" | "good" | "acceptable" | "poor" | "critical";

/** A farm at or above this score is above the subsidy line (the start of the Acceptable band). */
export const IER_SUBSIDY_LINE = 65;

/** Best to worst. Dark green, light green, amber, orange, red. */
export const STATUS_RAMP = ["#1e7b4a", "#7fb069", "#d9a520", "#e07b39", "#c0392b"] as const satisfies readonly [string, string, string, string, string];

export interface IerBandInfo {
  band: IerBand;
  /** A score belongs to the band with the highest `min` that it reaches (so 89.5 is Good, 64.9 is Poor). */
  min: number;
  /** The highest whole score of the band, as the ranges are written: 90-100, 80-89, 65-79, 50-64, 0-49. */
  max: number;
  en: string;
  ar: string;
  /** Bars, dots and chart fills. */
  color: string;
  /** Light background of a badge. */
  tint: string;
  /** Text on `tint`, and coloured text on white. */
  text: string;
}

export const IER_BANDS: ReadonlyArray<IerBandInfo> = [
  { band: "excellent", min: 90, max: 100, en: "Excellent", ar: "ممتاز", color: STATUS_RAMP[0], tint: "#e0f2e9", text: "#14573a" },
  { band: "good", min: 80, max: 89, en: "Good", ar: "جيد", color: STATUS_RAMP[1], tint: "#ecf5e6", text: "#3d6a2a" },
  { band: "acceptable", min: IER_SUBSIDY_LINE, max: 79, en: "Acceptable", ar: "مقبول", color: STATUS_RAMP[2], tint: "#fbf1d3", text: "#7a5a06" },
  { band: "poor", min: 50, max: 64, en: "Poor", ar: "ضعيف", color: STATUS_RAMP[3], tint: "#fce9dc", text: "#9a4a14" },
  { band: "critical", min: 0, max: 49, en: "Critical", ar: "حرج", color: STATUS_RAMP[4], tint: "#f9e0dc", text: "#962d22" },
];

/** The band of a 0-100 score; null when there is no score. Out-of-range scores count as the nearest band. */
export function ierBand(score: number | null | undefined): IerBand | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  return (IER_BANDS.find((b) => score >= b.min) ?? IER_BANDS[IER_BANDS.length - 1]).band;
}

export function ierBandInfo(band: IerBand): IerBandInfo {
  return IER_BANDS.find((b) => b.band === band) ?? IER_BANDS[IER_BANDS.length - 1];
}

/** The band record of a score, or null without one. */
export function ierInfo(score: number | null | undefined): IerBandInfo | null {
  const band = ierBand(score);
  return band === null ? null : ierBandInfo(band);
}

/** The band's name in the UI language. */
export function ierBandLabel(band: IerBand, language: Language): string {
  return ierBandInfo(band)[language];
}

/** An IER score as a screen shows it: rounded once, with the band and the subsidy-line test read from that same number. */
export interface DisplayIer {
  /** The score rounded to the precision the screen prints. Print this, never the raw score. */
  value: number;
  /** `value` with exactly `decimals` decimals ("65", "65.0"). */
  text: string;
  band: IerBand;
  info: IerBandInfo;
  /** At or above the subsidy line, decided on `value`: a printed 65 is never "below 65". */
  aboveLine: boolean;
}

/**
 * The one place an IER score is rounded for display. `decimals` is how many the screen prints (0 or 1);
 * the band, its colours and the subsidy-line test are decided on the rounded value, so 64.96 reads
 * "65 Acceptable, above the line" in a whole-number cell and "65.0 Acceptable" in a one-decimal cell, and
 * 64.6 reads "65 Poor" nowhere. Null without a score.
 */
export function displayIer(score: number | null | undefined, decimals: 0 | 1 = 0): DisplayIer | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  const value = Number(score.toFixed(decimals));
  const info = ierBandInfo(ierBand(value) as IerBand);
  return { value, text: value.toFixed(decimals), band: info.band, info, aboveLine: value >= IER_SUBSIDY_LINE };
}

/** true at or above the subsidy line, false below it, null without a score. */
export function isAboveSubsidyLine(score: number | null | undefined): boolean | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null;
  return score >= IER_SUBSIDY_LINE;
}
