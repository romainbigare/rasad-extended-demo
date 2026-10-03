import { ChevronRight } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { QueryValue } from "@/components/ui/QueryValue";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { useEnterpriseKpi, useStructuresSummary, useWaterCalculatorSummary } from "@/lib/analytics/hooks";
import type { EnterpriseKpi, EnterpriseKpiKind } from "@/lib/analytics/types";
import { formatYieldT } from "@/lib/format";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage, type Language } from "@/lib/i18n/LanguageContext";
import { displayIer } from "@/lib/scores";
import { useDayDateFormat } from "@/lib/useDayDateFormat";

import { STRINGS } from "../data/translations";
import { type DrilldownKind, HoldingDrilldown, KIND_ICON } from "./HoldingDrilldown";

type StringKey = keyof typeof STRINGS;

/** A status or count line as plain text: the first figure in ink, the rest muted ("5,094" + " critical"). */
function PlainStat({ label }: { label: string }) {
  const parts = label.split(/(\d[\d,]*(?:\.\d+)?)/);
  const index = parts.findIndex((part, i) => i % 2 === 1);
  return (
    <span className="text-muted">
      {parts.map((part, i) =>
        i === index ? (
          <b key={i} className="font-bold text-ink">
            {part}
          </b>
        ) : (
          part
        ),
      )}
    </span>
  );
}

// ─── Cards ────────────────────────────────────────────────────────────────────

/** Which card's holding-records drilldown is open, and how to open another / close it. */
const DrilldownContext = createContext<{ open: DrilldownKind | null; setOpen: (kind: DrilldownKind | null) => void }>({
  open: null,
  setOpen: () => undefined,
});

const KPI_CARDS: ReadonlyArray<{
  kind: Exclude<EnterpriseKpiKind, "water">;
  titleKey: StringKey;
  /** Grey caption after the figure; none on Seasonal Crop Monitoring. */
  captionKey?: StringKey;
}> = [
  { kind: "advisories", titleKey: "deepDiveSeasonalTitle" },
  { kind: "ier", titleKey: "deepDiveIerTitle", captionKey: "deepDiveIerSub" },
  { kind: "yield", titleKey: "deepDiveYieldTitle", captionKey: "deepDiveYieldSub" },
  { kind: "treeHealth", titleKey: "deepDiveTreeHealthTitle", captionKey: "deepDiveTreeHealthSub" },
];

const TONE_BADGE: Record<EnterpriseKpi["badges"][number]["tone"], BadgeTone> = {
  neutral: "slate",
  positive: "green",
  warning: "orange",
  critical: "red",
};

/** 12,871 / 23,726 - whole numbers. */
const number = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

function DeepDiveCard({
  kind,
  title,
  value,
  caption,
  details,
  badges,
  testId,
}: {
  kind: DrilldownKind;
  title: string;
  value: ReactNode;
  caption?: string;
  details?: ReactNode;
  badges?: ReactNode;
  testId: string;
}) {
  const { open, setOpen } = useContext(DrilldownContext);
  const t = useT(STRINGS);
  const active = open === kind;
  return (
    <button
      type="button"
      data-testid={testId}
      aria-expanded={active}
      onClick={() => setOpen(active ? null : kind)}
      className="group block w-full rounded-card text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-d"
    >
      <Card
        as="div"
        // Calm: a faint background on hover, no coloured border. An open card keeps a neutral darker border.
        className={cx(
          "flex h-full flex-col gap-3 p-4 transition-colors group-hover:bg-[#fafbfa] group-active:bg-[#f4f7f6]",
          active && "border-[#9aa5a2]",
        )}
      >
        <div className="flex items-center gap-2">
          <TitleIcon icon={KIND_ICON[kind]} />
          <h4 className="m-0 min-w-0 flex-1 text-xs font-bold leading-snug">{title}</h4>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-3xl font-bold leading-none tracking-tight">{value}</span>
          {caption && <span className="text-xs text-muted">{caption}</span>}
        </div>
        {details && <div className="text-xs leading-snug text-muted">{details}</div>}
        {badges && <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">{badges}</div>}
        {/* The explicit way in: the whole card is the button, this says what it does. */}
        <span className="mt-auto inline-flex items-center gap-0.5 pt-1 text-xs font-semibold text-green-d">
          {t("deepDiveViewHoldings")}
          <ChevronRight size={14} strokeWidth={2} aria-hidden className={cx("transition-transform rtl:rotate-180", active && "rotate-90 rtl:rotate-90")} />
        </span>
      </Card>
    </button>
  );
}

function treeHealthText(d: EnterpriseKpi, t: (k: StringKey) => string, day: (isoDate: string) => string) {
  if (d.scored_trees === null || d.scored_trees === undefined) return { details: d.subtext, badges: d.badges };
  const details = [
    t("deepDiveTreeHealthScored").replace("{count}", number.format(d.scored_trees)),
    d.average_score === null || d.average_score === undefined
      ? null
      : t("deepDiveTreeHealthAverage").replace("{score}", number.format(d.average_score)),
    d.as_of ? t("deepDiveTreeHealthAsOf").replace("{date}", day(d.as_of)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const badges = [
    d.stressed_trees ? { label: t("deepDiveTreeHealthStressed").replace("{count}", number.format(d.stressed_trees)), tone: "warning" as const } : null,
    d.critical_trees ? { label: t("deepDiveTreeHealthCritical").replace("{count}", number.format(d.critical_trees)), tone: "critical" as const } : null,
  ].filter((badge) => badge !== null);
  return { details, badges: badges.length ? badges : d.badges };
}

/** A card badge: the API's own (label + tone), or one with its own colours (the IER average's band). */
type KpiBadge = EnterpriseKpi["badges"][number] & { style?: CSSProperties };

function ierText(
  d: EnterpriseKpi,
  t: (k: StringKey) => string,
  day: (isoDate: string) => string,
  language: Language,
): { details: ReactNode; badges: KpiBadge[] } {
  if (d.scored_farms === null || d.scored_farms === undefined) return { details: d.subtext, badges: d.badges };
  const details = [
    t("deepDiveIerScored").replace("{count}", number.format(d.scored_farms)),
    d.as_of ? t("deepDiveTreeHealthAsOf").replace("{date}", day(d.as_of)) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // The band is read from the average score on the shared IER scale (lib/scores.ts), not from the API's average_class.
  const shown = displayIer(d.average_score, 0);
  const band = shown?.info;
  const badges: KpiBadge[] =
    shown && band
      ? [
          {
            label: `${t("deepDiveIerAverage").replace("{score}", number.format(shown.value))} · ${band[language]}`,
            tone: "neutral",
            style: { background: band.tint, color: band.text },
          },
        ]
      : d.badges;
  return { details, badges };
}

function EnterpriseKpiCard({
  kind,
  titleKey,
  captionKey,
}: (typeof KPI_CARDS)[number]) {
  const t = useT(STRINGS);
  const kpi = useEnterpriseKpi(kind);
  const day = useDayDateFormat();
  const { language } = useLanguage();
  const text = kpi.data && kind === "treeHealth" ? treeHealthText(kpi.data, t, day) : kpi.data && kind === "ier" ? ierText(kpi.data, t, day, language) : null;
  return (
    <DeepDiveCard
      kind={kind}
      testId={`deep-dive-${kind}`}
      title={t(titleKey)}
      value={<QueryValue query={kpi} render={(d) => (kind === "yield" ? formatYieldT(d.value) : number.format(d.value))} />}
      caption={captionKey ? t(captionKey) : undefined}
      details={text ? text.details : kpi.data?.subtext}
      badges={(text ? text.badges : kpi.data?.badges)?.map((b) =>
        "style" in b && b.style ? (
          // The one coloured badge: the IER average's band (lib/scores.ts).
          <Badge key={b.label} tone={TONE_BADGE[b.tone]} style={b.style} className="px-2.5 py-1 text-xs">
            {b.label}
          </Badge>
        ) : (
          <PlainStat key={b.label} label={b.label} />
        ),
      )}
    />
  );
}

function WaterCalculatorDeepDiveCard() {
  const t = useT(STRINGS);
  const kpi = useWaterCalculatorSummary();
  const d = kpi.data;
  return (
    <DeepDiveCard
      kind="water"
      testId="deep-dive-water"
      title={t("deepDiveWaterCalcTitle")}
      value={<QueryValue query={kpi} render={(v) => number.format(v.total_demand_m3 / 1000)} />}
      caption={t("deepDiveWaterCalcSub")}
      details={
        d &&
        t("waterFarmsAboveAllocationTemplate")
          .replace("{count}", number.format(d.farms_above_allocation))
          .replace("{total}", number.format(d.total_farms))
      }
    />
  );
}

function StructuresCard() {
  const t = useT(STRINGS);
  const structures = useStructuresSummary();
  const d = structures.data;
  const { area, unitWord, unitLabel } = useAreaUnit();
  return (
    <DeepDiveCard
      kind="structures"
      testId="deep-dive-structures"
      title={t("deepDiveStructuresTitle")}
      value={<QueryValue query={structures} render={(s) => number.format(area({ du: s.total_area_du }) ?? 0)} />}
      caption={unitWord}
      details={
        d && (
          <>
            {t("structuresFarmsTemplate").replace("{count}", number.format(d.farms_with_structures))}
            {d.largest_holding &&
              ` · ${t("structuresLargestHoldingTemplate")
                .replace("{farm}", d.largest_holding.farm_name)
                .replace("{area}", number.format(area({ du: d.largest_holding.area_du }) ?? 0))
                .replace("{unit}", unitLabel)}`}
          </>
        )
      }
      badges={
        d && (
          <>
            <PlainStat label={t("structuresCountTemplate").replace("{count}", number.format(d.total_count))} />
            {d.largest_structure && (
              <PlainStat
                label={t("structuresLargestStructureTemplate")
                  .replace("{type}", d.largest_structure.type)
                  .replace("{area}", number.format(area({ du: d.largest_structure.area_du }) ?? 0))
                  .replace("{unit}", unitLabel)}
              />
            )}
          </>
        )
      }
    />
  );
}

export function OperationalDeepDivesSection() {
  const t = useT(STRINGS);
  const [open, setOpen] = useState<DrilldownKind | null>(null);
  const drilldownRef = useRef<HTMLDivElement>(null);
  // Opening (or switching) a card's drilldown glides the page down to it, instead of the table
  // appearing out of sight below the cards.
  useEffect(() => {
    if (open) drilldownRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [open]);

  return (
    <DrilldownContext.Provider value={{ open, setOpen }}>
      <section data-testid="farm-deep-dives">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {KPI_CARDS.map((c) => (
            <EnterpriseKpiCard key={c.kind} {...c} />
          ))}
          <StructuresCard />
          <WaterCalculatorDeepDiveCard />
        </div>
        {/* The clicked card's holding records, below the cards. */}
        {open && (
          <div ref={drilldownRef} className="mt-4 scroll-mt-4">
            <HoldingDrilldown kind={open} onClose={() => setOpen(null)} />
          </div>
        )}
      </section>
    </DrilldownContext.Provider>
  );
}
