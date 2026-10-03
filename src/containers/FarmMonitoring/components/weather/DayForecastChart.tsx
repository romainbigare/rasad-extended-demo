import { useEffect, useMemo, useState } from "react";

import type { RbacRequestError } from "@shared/network/rbacRequest";
import type { DayForecastPoint } from "@shared/weather/endpoints";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { InlineError, SkeletonValue } from "@/components/ui/States";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  convertForecastValue,
  forecastUnit,
  parseForecastTime,
  upcomingPoints,
  type ForecastMetric,
  type UnitSystem,
} from "@/lib/weather/format";

import { STRINGS } from "../../data/translations";

const METRICS: ReadonlyArray<{ value: ForecastMetric; labelKey: keyof typeof STRINGS }> = [
  { value: "temp", labelKey: "weatherParamTemp" },
  { value: "humidity", labelKey: "weatherParamHumidity" },
  { value: "rain", labelKey: "weatherParamRain" },
  { value: "wind_speed", labelKey: "weatherParamWind" },
  { value: "pressure", labelKey: "weatherParamPressure" },
];

// Chart geometry. The series colour is the theme's --blue token; gridlines
// and axis text use the same line/muted tokens as every table on this page.
const HEIGHT = 220;
const M = { top: 14, right: 12, bottom: 30, left: 46 };
const SERIES = "rgb(var(--blue))";

interface QueryState {
  data?: DayForecastPoint[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  error: RbacRequestError | null;
  refetch: () => unknown;
}

function niceStep(raw: number): number {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp;
}

/** Clean y ticks covering [min, max]; bars always start at zero. */
function niceScale(min: number, max: number, fromZero: boolean, count = 4) {
  let lo = fromZero ? 0 : min;
  let hi = max;
  if (hi - lo < 1e-9) {
    hi = lo + (fromZero ? 1 : Math.max(1, Math.abs(lo) * 0.05));
    if (!fromZero) lo -= hi - lo;
  }
  const step = niceStep((hi - lo) / count);
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return { lo: start, hi: end, ticks };
}

/** Callback ref, not useRef: the measured element only mounts once data has
 * loaded, after the first effect pass. */
function useWidth<T extends HTMLElement>() {
  const [el, setEl] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

/** Top-rounded bar, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function DayForecastChart({ query, system }: { query: QueryState; system: UnitSystem }) {
  const t = useT(STRINGS);
  const { language } = useLanguage();
  const locale = language === "ar" ? "ar-AE" : "en-GB";
  const [metric, setMetric] = useState<ForecastMetric>("temp");
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [wrapRef, width] = useWidth<HTMLDivElement>();

  const points = useMemo(
    () =>
      upcomingPoints(query.data ?? []).map((p) => ({
        time: parseForecastTime(p.datetime),
        value: convertForecastValue(metric, Number(p[metric] ?? 0), system),
      })),
    [query.data, metric, system],
  );

  const unit = forecastUnit(metric, system);
  const decimals = metric === "rain" ? 2 : metric === "pressure" && system === "imperial" ? 2 : 1;
  const fmt = useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }), [decimals]);
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    [locale],
  );
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric" }), [locale]);

  const controls = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <SegmentedControl
        label={t("weatherForecastParamLabel")}
        options={METRICS.map((m) => ({ value: m.value, label: t(m.labelKey) }))}
        value={metric}
        onChange={(v) => {
          setMetric(v);
          setActive(null);
        }}
      />
      {points.length > 0 && (
        <button
          type="button"
          onClick={() => setShowTable((s) => !s)}
          className="text-[11px] font-semibold text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          {showTable ? t("weatherForecastHideTable") : t("weatherForecastShowTable")}
        </button>
      )}
    </div>
  );

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {controls}
        <SkeletonValue className="h-[220px] w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-col gap-3">
        {controls}
        <InlineError message={t("weatherForecastError")} />
      </div>
    );
  }
  if (points.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {controls}
        <p className="m-0 text-xs text-muted">{t("weatherForecastEmpty")}</p>
      </div>
    );
  }

  const isBar = metric === "rain";
  const values = points.map((p) => p.value);
  const { lo, hi, ticks } = niceScale(Math.min(...values), Math.max(...values), isBar);
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const band = points.length ? innerW / points.length : 0;
  const cx = (i: number) => M.left + band * (i + 0.5);
  const cy = (v: number) => M.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const baseline = M.top + innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${cx(i)},${cy(p.value)}`).join("");
  const area = `${line}L${cx(points.length - 1)},${baseline}L${cx(0)},${baseline}Z`;

  // Local-midnight boundaries between consecutive points.
  const dayStarts = points
    .map((p, i) => ({ i, key: p.time.toDateString() }))
    .filter((d, idx, arr) => idx === 0 || d.key !== arr[idx - 1].key)
    .map((d) => d.i);

  const barW = Math.max(2, Math.min(24, band - 2));

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.floor((clientX - rect.left - M.left) / (band || 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  const activePoint = active !== null ? points[active] : null;
  const tipLeft = active !== null ? cx(active) : 0;

  return (
    <div className="flex flex-col gap-3">
      {controls}

      <div
        ref={wrapRef}
        dir="ltr"
        className={`relative transition-opacity ${query.isFetching ? "opacity-60" : ""}`}
      >
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${t(METRICS.find((m) => m.value === metric)!.labelKey)} (${unit})`}
            tabIndex={0}
            className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-green-d"
            onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const delta = e.key === "ArrowRight" ? 1 : -1;
                setActive((a) => Math.max(0, Math.min(points.length - 1, (a ?? (delta > 0 ? -1 : points.length)) + delta)));
              }
            }}
          >
            {/* Gridlines + y ticks */}
            {ticks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={width - M.right} y1={cy(v)} y2={cy(v)} stroke="rgb(var(--line))" strokeWidth={1} />
                <text
                  x={M.left - 8}
                  y={cy(v)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted text-[11px] tabular-nums"
                >
                  {fmt.format(v)}
                </text>
              </g>
            ))}
            <text x={M.left - 8} y={M.top - 4} textAnchor="end" className="fill-muted text-[11px]">
              {unit}
            </text>

            {/* Day separators + day labels */}
            {dayStarts.map((i, idx) => {
              const x = idx === 0 ? M.left : M.left + band * i;
              // Narrow charts (phones): a "Mon 29" label needs ~56px - show every other day rather than overlap.
              const daySpacing = dayStarts.length > 1 ? band * (dayStarts[1] - dayStarts[0]) : Infinity;
              const showLabel = daySpacing >= 56 || idx % 2 === 0;
              return (
                <g key={i}>
                  {idx > 0 && (
                    <line x1={x} x2={x} y1={M.top} y2={baseline} stroke="rgb(var(--line))" strokeWidth={1} />
                  )}
                  {showLabel && (
                    <text x={x + 4} y={HEIGHT - 10} className="fill-muted text-[11px] font-semibold">
                      {dayFmt.format(points[i].time)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Series */}
            {isBar ? (
              points.map((p, i) => {
                const y = cy(p.value);
                const h = baseline - y;
                return h > 0 ? (
                  <path
                    key={i}
                    d={barPath(cx(i) - barW / 2, y, barW, h)}
                    fill={SERIES}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                ) : null;
              })
            ) : (
              <>
                <path d={area} fill={SERIES} opacity={0.1} />
                <path d={line} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}

            {/* Crosshair */}
            {activePoint && active !== null && (
              <g pointerEvents="none">
                <line x1={cx(active)} x2={cx(active)} y1={M.top} y2={baseline} stroke="rgb(var(--muted))" strokeWidth={1} />
                {!isBar && (
                  <circle
                    cx={cx(active)}
                    cy={cy(activePoint.value)}
                    r={4.5}
                    fill={SERIES}
                    stroke="rgb(var(--panel))"
                    strokeWidth={2}
                  />
                )}
              </g>
            )}
          </svg>
        )}

        {activePoint && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs shadow-sm"
            style={{
              left: tipLeft,
              transform: `translateX(${tipLeft > width / 2 ? "calc(-100% - 10px)" : "10px"})`,
            }}
          >
            <div className="flex items-center gap-1.5">
              <i aria-hidden className="inline-block h-[2px] w-3 rounded" style={{ background: SERIES }} />
              <b className="text-xs text-ink">
                {fmt.format(activePoint.value)} {unit}
              </b>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">{timeFmt.format(activePoint.time)}</div>
          </div>
        )}
      </div>

      {showTable && (
        <div className="max-h-64 overflow-auto rounded-[10px] border border-line">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 bg-panel">
              <tr>
                <th scope="col" className="border-b border-line px-2.5 py-2 text-start text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  {t("weatherForecastTime")}
                </th>
                <th scope="col" className="border-b border-line px-2.5 py-2 text-end text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  {t(METRICS.find((m) => m.value === metric)!.labelKey)} ({unit})
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.time.getTime()} className="border-b border-line last:border-b-0">
                  <td className="px-2.5 py-1.5">{timeFmt.format(p.time)}</td>
                  <td className="px-2.5 py-1.5 text-end tabular-nums">{fmt.format(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
