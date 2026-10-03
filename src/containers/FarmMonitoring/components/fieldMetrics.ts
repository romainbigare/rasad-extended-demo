import type { FarmYieldFields } from "@/lib/analytics/types";

import type { Rating } from "../data/types";

/** Health pill colours per rating band. */
export const RATING_PILL: Record<Rating, string> = {
  excellent: "border-[#bfe3b3] bg-green-l text-green-d",
  good: "border-[#bfe3b3] bg-green-l text-green-d",
  fair: "border-[#f5d2a8] bg-[#fdeedd] text-[#c46a12]",
  poor: "border-[#f3b9b1] bg-red-l text-red",
};

/** "86" / "78.3" - one decimal, dropped when it's .0. */
export const shortPct = (value: number) => String(Math.round(value));

/** A field's projected yield in tonnes - the sum of its yield-forecast rows - or null when it has none. */
export function fieldYieldT(data: FarmYieldFields | undefined, fieldId: number): number | null {
  const rows = data?.fields.filter((f) => f.field_id === fieldId) ?? [];
  return rows.length ? rows.reduce((sum, r) => sum + r.yield_t, 0) : null;
}
