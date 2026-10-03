import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { InlineError, Spinner } from "@/components/ui/States";
import { cx } from "@/components/ui/cx";
import { selectableCard } from "@/components/ui/selectableCard";
import { useT } from "@/lib/i18n/createDict";
import type { SatelliteDateItem } from "@/lib/network/satellite/endpoints";
import { useNextAcquisition } from "@/lib/satellite/useNextAcquisition";
import { useSatelliteCatalog } from "@/lib/satellite/useSatelliteCatalog";
import { useSatelliteDates } from "@/lib/satellite/useSatelliteDates";
import { daysFromTodayLabel, formatPassDate, isoDaysAgo, todayIso } from "@/lib/satellite/passDates";

import { STRINGS } from "../../data/translations";
import { CloudCoverSlider } from "./CloudCoverSlider";
import { SatelliteDateRangePicker } from "./SatelliteDateRangePicker";
import { SatelliteMultiSelect } from "./SatelliteMultiSelect";

/** The satellite whose latest pass is picked by default on the map. */
const DEFAULT_SATELLITE = "S1";

/** Fixed window for the "N farm scans from M satellites" summary pill,
 * independent of whatever date range the user has the ribbon itself
 * filtered to -- the pill is always "in the last 30 days". */
const SCAN_SUMMARY_WINDOW_DAYS = 30;

const DEFAULT_RANGE_DAYS = 14;

/** Cloud-cover badge colour bands. A judgement call (the API gives a raw
 * percentage, not a tier) -- picked to match this app's existing
 * green/orange/red usage elsewhere (KPI deltas, advisories). */
function cloudTone(cloudCover: number | null): "green" | "orange" | "red" | "slate" {
  if (cloudCover === null) return "slate";
  if (cloudCover <= 20) return "green";
  if (cloudCover <= 60) return "orange";
  return "red";
}

function sceneKey(item: SatelliteDateItem): string {
  return `${item.satellite}_${item.datetime}`;
}

export function SatellitePassRibbon({
  farmId,
  selectedScene,
  onSelectScene,
}: {
  farmId: number | null;
  selectedScene: SatelliteDateItem | null;
  onSelectScene: (scene: SatelliteDateItem | null) => void;
}) {
  const t = useT(STRINGS);
  const catalog = useSatelliteCatalog(farmId);
  const [selectedSatellites, setSelectedSatellites] = useState<string[]>([]);
  const [cloudCover, setCloudCover] = useState(100);
  const [range, setRange] = useState(() => ({ start: isoDaysAgo(DEFAULT_RANGE_DAYS), end: todayIso() }));
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the satellite checkboxes have had their one-time "default to
  // everything" applied yet for the current farm. A plain `.length === 0`
  // check would re-trigger that default every time the user deliberately
  // unchecks every box and the catalog query happens to refetch in the
  // background (react-query returns a new array reference even when the
  // content is unchanged) -- this flag makes the default fire exactly once
  // per farm instead.
  const didDefaultSatellites = useRef(false);

  // A different farm invalidates every filter and the current selection --
  // nothing from the old farm's ribbon should leak into the new one's.
  useEffect(() => {
    setSelectedSatellites([]);
    setCloudCover(100);
    setRange({ start: isoDaysAgo(DEFAULT_RANGE_DAYS), end: todayIso() });
    onSelectScene(null);
    didDefaultSatellites.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on farm change
  }, [farmId]);

  // Default to every satellite the farm's catalog has, once it loads.
  useEffect(() => {
    if (!didDefaultSatellites.current && catalog.data && catalog.data.length > 0) {
      setSelectedSatellites(catalog.data.map((s) => s.satellite));
      didDefaultSatellites.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when the catalog (re)loads
  }, [catalog.data]);

  // Whenever the satellite checkbox filter itself changes (checking/
  // unchecking a satellite in the multi-select above), drop the current pick
  // so the default-scene effect below re-picks the latest pass among the
  // NEWLY checked satellites -- otherwise unchecking a satellite could leave
  // a stale scene selected that no longer matches the visible filtered list
  // (and the index-select above the map, which follows this same scene).
  useEffect(() => {
    onSelectScene(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to the checkbox filter itself
  }, [selectedSatellites]);

  const dates = useSatelliteDates(farmId, { startDate: range.start, endDate: range.end, cloudCover });
  const nextAcquisition = useNextAcquisition(farmId);
  const scanSummary = useSatelliteDates(farmId, {
    startDate: isoDaysAgo(SCAN_SUMMARY_WINDOW_DAYS),
    endDate: todayIso(),
    cloudCover: 100,
  });

  // Newest first -- the leftmost card is always the latest pass, matching
  // whichever one is showing on the map by default.
  const sorted = useMemo(
    () => [...(dates.data ?? [])].sort((a, b) => b.datetime.localeCompare(a.datetime)),
    [dates.data],
  );
  const filtered = useMemo(
    () => (selectedSatellites.length ? sorted.filter((d) => selectedSatellites.includes(d.satellite)) : sorted),
    [sorted, selectedSatellites],
  );

  useEffect(() => {
    if (selectedScene || filtered.length === 0) return;
    const s1 = filtered.filter((d) => d.satellite === DEFAULT_SATELLITE);
    const active = filtered.find((d) => d.is_active);
    onSelectScene(s1.find((d) => d.is_active) ?? s1[0] ?? active ?? filtered[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedScene]);

  const scanCount = scanSummary.data?.length ?? 0;
  const satelliteCount = useMemo(
    () => new Set((scanSummary.data ?? []).map((d) => d.spacecraft_id).filter(Boolean)).size,
    [scanSummary.data],
  );

  // Bring the picked card (e.g. the default latest S1 pass) into view inside the ribbon - sideways only,
  // so the page itself doesn't jump.
  useEffect(() => {
    const el = scrollRef.current;
    const card = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !card) return;
    const left = card.offsetLeft - el.offsetLeft;
    if (left < el.scrollLeft || left + card.offsetWidth > el.scrollLeft + el.clientWidth) {
      el.scrollTo({ left: Math.max(0, left - 8), behavior: "smooth" });
    }
  }, [selectedScene, filtered]);

  const scrollByCards = (direction: 1 | -1) => {
    const el = scrollRef.current;
    // Arabic: the row (and its buttons) are mirrored, so the physical scroll direction flips too.
    const rtl = el ? getComputedStyle(el).direction === "rtl" : false;
    el?.scrollBy({ left: direction * 360 * (rtl ? -1 : 1), behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-3" data-testid="satellite-pass-ribbon">
      {/* Filters row: satellite multi-select, date range, cloud cover */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SatelliteMultiSelect
          satellites={catalog.data ?? []}
          selected={selectedSatellites}
          onChange={setSelectedSatellites}
        />
        <SatelliteDateRangePicker start={range.start} end={range.end} onChange={setRange} />
        <CloudCoverSlider value={cloudCover} onChange={setCloudCover} />
      </div>

      {/* Scene cards */}
      {dates.isLoading || catalog.isLoading ? (
        <div className="flex items-center gap-2 py-3 text-xs text-muted">
          <Spinner /> {t("ribbonLoadingPasses")}
        </div>
      ) : dates.isError ? (
        <InlineError message={t("ribbonLoadError")} />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-[#fafbfb] px-4 py-5 text-center text-xs text-muted">
          {t("ribbonNoPasses")}
        </div>
      ) : (
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label={t("ribbonScrollLater")}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-yellow touch:h-11 touch:w-11 text-ink shadow-sm hover:brightness-95"
          >
            <span aria-hidden className="inline-block rtl:-scale-x-100">‹</span>
          </button>
          <div ref={scrollRef} className="flex flex-1 gap-2 overflow-x-auto scroll-smooth py-1" data-testid="scene-scroll">
            {filtered.map((item) => {
              const { date, time } = formatPassDate(item.datetime);
              const isSelected = selectedScene ? sceneKey(selectedScene) === sceneKey(item) : false;
              return (
                <button
                  key={sceneKey(item)}
                  type="button"
                  disabled={!item.is_active}
                  aria-pressed={isSelected}
                  onClick={() => onSelectScene(item)}
                  className={cx(
                    "flex flex-none flex-col gap-1 rounded-lg border px-3 py-2 text-start transition disabled:cursor-not-allowed disabled:opacity-40",
                    selectableCard(isSelected),
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{item.satellite}</span>
                    <Badge tone={cloudTone(item.cloud_cover)}>
                      {item.cloud_cover === null ? "—" : `${Math.round(item.cloud_cover)}%`}
                    </Badge>
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-muted">
                    {date} <br /> {time}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label={t("ribbonScrollEarlier")}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-yellow touch:h-11 touch:w-11 text-ink shadow-sm hover:brightness-95"
          >
            <span aria-hidden className="inline-block rtl:-scale-x-100">›</span>
          </button>
        </div>
      )}

      {/* Next pass chips + 30-day scan summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-muted">{t("ribbonNextPassLabel")}</span>
          {(catalog.data ?? []).map((s) => {
            const acquisition = nextAcquisition.data?.find((n) => n.satellite === s.satellite);
            return (
              <span
                key={s.satellite}
                title={acquisition ? undefined : t("ribbonNoRepeatCycle")}
                className={cx("font-semibold", acquisition ? "text-ink" : "text-muted")}
              >
                {s.satellite} {acquisition ? daysFromTodayLabel(acquisition.next_estimated_date) : "—"}
              </span>
            );
          })}
        </div>
        <span className="text-[11px] text-muted">
          {scanSummary.isLoading
            ? t("ribbonLoadingScanSummary")
            : t("ribbonScanSummary")
                .replace("{count}", String(scanCount))
                .replace("{satellites}", String(satelliteCount))
                .replace("{days}", String(SCAN_SUMMARY_WINDOW_DAYS))}
        </span>
      </div>
    </div>
  );
}
