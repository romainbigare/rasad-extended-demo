import type { FarmWaterDemand } from "@/lib/analytics/types";
import type { Language } from "@/lib/i18n/LanguageContext";
import { IER_SUBSIDY_LINE, displayIer, ierBandLabel } from "@/lib/scores";

import type { STRINGS } from "../data/translations";

/** ACT: the reading is outside what is expected. WATCH: close to it. Both are plain statements of fact. */
export type FindingLevel = "act" | "watch";

export interface Finding {
  id: "water" | "ier" | "palms";
  level: FindingLevel;
  text: string;
}

/** The readings a farm's findings are built from, as the page has already loaded them. Anything missing is left out. */
export interface FindingInput {
  water?: Pick<FarmWaterDemand, "monthly_demand_m3" | "allocation_m3">;
  /** Irrigation efficiency ratio, 0-100. */
  ier?: number | null;
  palms?: {
    scored: number | null;
    /** Share of the scored palms at risk (stressed or critical), 0-100; null when the farm has no score. */
    atRiskPct: number | null;
  };
}

/** Within this share below the allocation, the water demand is worth watching. */
const WATER_NEAR = 0.1;
/** At or above this share of the scored palms at risk, the palms are a finding to act on rather than watch. */
const PALMS_ACT_PCT = 25;

type T = (key: keyof typeof STRINGS) => string;

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);

/**
 * The inspector's list for one farm, built only from readings already loaded: monthly water demand
 * against the allocation, the irrigation efficiency band against the subsidy line, and palms under
 * stress. Most important first (ACT, then WATCH). Nothing here tells the farmer what to do.
 */
export function buildFindings(input: FindingInput, t: T, language: Language): Finding[] {
  const found: Finding[] = [];

  const water = input.water;
  if (water && water.allocation_m3 > 0) {
    const ratio = water.monthly_demand_m3 / water.allocation_m3;
    if (ratio > 1) {
      found.push({ id: "water", level: "act", text: fill(t("findingWaterOver"), { pct: Math.round((ratio - 1) * 100) }) });
    } else if (ratio >= 1 - WATER_NEAR) {
      found.push({ id: "water", level: "watch", text: fill(t("findingWaterNear"), { pct: Math.round(ratio * 100) }) });
    }
  }

  // The score is rounded once, to the whole number printed; the band and the decision read that number (lib/scores.ts).
  const shown = displayIer(input.ier, 0);
  if (shown !== null) {
    const { value: score, band } = shown;
    if (!shown.aboveLine) {
      found.push({
        id: "ier",
        level: "act",
        text: fill(t("findingIerBelow"), { score, band: ierBandLabel(band, language), line: IER_SUBSIDY_LINE }),
      });
    } else if (band === "acceptable") {
      found.push({ id: "ier", level: "watch", text: fill(t("findingIerBand"), { score, band: ierBandLabel(band, language) }) });
    }
  }

  const palms = input.palms;
  if (palms && palms.scored && palms.atRiskPct !== null) {
    const stressed = Math.round((palms.scored * palms.atRiskPct) / 100);
    if (stressed > 0) {
      found.push({
        id: "palms",
        level: palms.atRiskPct >= PALMS_ACT_PCT ? "act" : "watch",
        text: fill(t("findingPalms"), { n: stressed.toLocaleString("en-US"), pct: Math.round(palms.atRiskPct), scored: palms.scored.toLocaleString("en-US") }),
      });
    }
  }

  return found.sort((a, b) => Number(b.level === "act") - Number(a.level === "act"));
}
