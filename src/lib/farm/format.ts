import { EM_DASH } from "@/lib/format";

export function describeCropTypes(value: unknown[] | null | undefined): string {
  if (!value || value.length === 0) return EM_DASH;
  const names = value.map((entry) => {
    if (typeof entry === "string") return entry;
    if (entry && typeof entry === "object" && "crop_type" in entry) {
      return String((entry as { crop_type: unknown }).crop_type);
    }
    return String(entry);
  });
  return names.filter(Boolean).join(", ") || EM_DASH;
}

/** A decimal string from the API (an area) as a whole number, with the unit after it. */
export function formatDecimalString(value: string | null | undefined, unit?: string): string {
  if (value === null || value === undefined || value.trim() === "") return EM_DASH;
  const n = Number(value);
  if (Number.isNaN(n)) return EM_DASH;
  const text = n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return unit ? `${text} ${unit}` : text;
}
