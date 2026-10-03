
function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return toYmd(new Date());
}

/** `YYYY-MM-DD` for `n` days before today, UTC. */
export function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return toYmd(d);
}

export function daysFromToday(dateStr: string): number {
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime();
  const target = new Date(`${dateStr}T00:00:00Z`).getTime();
  return Math.round((target - today) / 86_400_000);
}

/** "in 3 days" / "today" / "overdue" for a next-pass chip. Never a negative
 * number -- a stale estimate reads as "overdue", not "-2 days". */
export function daysFromTodayLabel(dateStr: string): string {
  const days = daysFromToday(dateStr);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

export function formatPassDate(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return { date: date.replace(/ /g, "-"), time };
}
