const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const rate = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const EM_DASH = "—";

/**
 * A quantity as a whole number with thousands separators: areas, tonnes, m3, counts and 0-100 scores.
 * The one place the "no decimals on quantities" rule lives; null/undefined/NaN give an em-dash.
 */
export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EM_DASH;
  return integer.format(value);
}

/**
 * A per-area rate (t/du, m3/du) or a 0-1 index (NDVI): up to two decimals when it is below 10 (0.84, 7.8),
 * a whole number from 10 up. Use it only where the decimals carry meaning.
 */
export function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EM_DASH;
  return Math.abs(value) < 10 ? rate.format(value) : integer.format(value);
}

/**
 * Yield in tonnes, as a whole number (1,234). A positive amount that would round to 0 shows "<1", so a
 * forecast is never shown as zero when it is not. Per-area yields (t/du) go through formatRate instead.
 */
export function formatYieldT(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EM_DASH;
  if (value > 0 && value < 0.5) return "<1";
  return integer.format(value);
}

/** A count or area in full, with thousands separators (2,687,991): whole numbers everywhere, no "2.69M". */
export function formatCompact(value: number | null | undefined): string {
  return formatInteger(value);
}

/** A percentage share or score as a whole number, e.g. 70%. A positive share under 0.5 reads "<1%", not "0%". */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return EM_DASH;
  if (value > 0 && value < 0.5) return "<1%";
  return `${integer.format(value)}%`;
}

export function geoFarmLabel(uid: string | null | undefined): string {
  if (!uid || !uid.trim()) return EM_DASH;
  const digits = uid.trim().replace(/^[A-Za-z]+/, "");
  return `Farm ${digits || uid.trim()}`;
}

export function farmServiceLabel(uid: string | null | undefined): string {
  return uid && uid.trim() ? uid.trim() : EM_DASH;
}

/** "Q3 2026" for the current calendar quarter. */
export function currentQuarterLabel(now: Date = new Date()): string {
  return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
}

export function initials(name: string | undefined | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
