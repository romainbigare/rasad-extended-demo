import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { type ReactNode, useState } from "react";

import { BreakdownSlotContext } from "@/components/ui/BreakdownSlot";

import { cx } from "@/components/ui/cx";
import type { Figure as HeaderFigure } from "@/components/ui/Figure";
import { HEADER_ROW_GAP, TITLE_BLOCK_WITH_METRICS, useHeaderMetrics } from "@/components/ui/HeaderMetrics";
import { TitleIcon } from "@/components/ui/TitleIcon";
import { useT } from "@/lib/i18n/createDict";

import { FRAME_STRINGS } from "./translations";

export interface FrameTab {
  /** The `?tab=` value. */
  tab: string;
  label: string;
  /** A count shown after the label in muted normal weight ("What to check  2"). */
  count?: number | string;
}

/**
 * The tab a page is on, from `?tab=`. Waits for `router.isReady` (a statically exported page has an
 * empty query on its first render), so the first tab shows until the link has been read. An unknown
 * value falls back to the first tab. `param` is the query key ("tab", or "view" on Farm Monitoring).
 */
export function useActiveTab(tabs: readonly FrameTab[], param = "tab"): string {
  const router = useRouter();
  const raw = router.isReady ? router.query[param] : undefined;
  const wanted = Array.isArray(raw) ? raw[0] : raw;
  return tabs.find((tab) => tab.tab === wanted)?.tab ?? tabs[0]?.tab ?? "";
}

/** One figure of the strip: a small grey label, the value with its unit, and an optional grey line or change. */
export interface FigureProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** A short grey line under the value, e.g. "of 24,082 farms". */
  sub?: ReactNode;
  /** A change against an earlier reading, e.g. "+4.2%". Only for values the platform can compare. */
  change?: { text: string; tone?: "up" | "down" | "flat" };
  testId?: string;
}

export function Figure({ label, value, unit, sub, change, testId }: FigureProps) {
  return (
    <div className="min-w-0 px-4 py-3.5" data-testid={testId}>
      <div className="truncate text-xs text-muted">{label}</div>
      <div className="mt-1 flex min-h-[32px] flex-wrap items-baseline gap-x-1.5 text-2xl font-semibold leading-tight tabular-nums">
        {value}
        {unit && <small className="text-xs font-normal text-muted">{unit}</small>}
      </div>
      {(sub || change) && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {sub && <span className="min-w-0">{sub}</span>}
          {change && (
            <span className={cx("font-medium", change.tone === "up" && "text-green-d", change.tone === "down" && "text-red")}>{change.text}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** One row of lg columns per figure count (Tailwind needs the class names spelled out). */
const COLUMNS: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

/** Up to four figures in one white card, side by side (two by two on a phone). */
export function FigureStrip({
  figures,
  testId = "frame-figures",
  twoColumns = false,
}: {
  figures: readonly FigureProps[];
  testId?: string;
  twoColumns?: boolean;
}) {
  const t = useT(FRAME_STRINGS);
  const shown = figures.slice(0, 4);
  return (
    <div
      role="group"
      aria-label={t("figuresLabel")}
      data-testid={testId}
      className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-line shadow-xs"
    >
      <div className={cx("grid flex-1 auto-rows-fr grid-cols-2 gap-px", !twoColumns && COLUMNS[shown.length])}>
        {shown.map((figure, i) => (
          // An odd figure out fills the last row on a phone instead of leaving a grey cell.
          <div key={figure.label} className={cx("bg-panel", shown.length % 2 === 1 && i === shown.length - 1 && "max-lg:col-span-2")}>
            <Figure {...figure} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A white block of the frame (the chart or map, the table): one header style - a small muted icon and a
 * sentence-case title, a grey caption, actions on the right. `metrics` are the block's own headline
 * figures, top right of the header like every widget (see CardHeader).
 */
export function Section({
  title,
  icon,
  caption,
  actions,
  metrics,
  children,
  testId,
  flush = false,
}: {
  title?: ReactNode;
  /** The block's icon, in front of the title (a title-less block has none). */
  icon?: LucideIcon;
  caption?: ReactNode;
  actions?: ReactNode;
  /** Headline figures, top right of the header, most important first; they hide from the end when the header is short. */
  metrics?: HeaderFigure[];
  /** Left out for a header-only block (a title with a button). */
  children?: ReactNode;
  testId?: string;
  /** No padding around the body (a table or map that runs edge to edge). */
  flush?: boolean;
}) {
  const { headerRef, actionsRef, metricsNode } = useHeaderMetrics(metrics);
  return (
    <section className="rounded-card border border-line bg-panel shadow-xs" data-testid={testId}>
      {(title || actions || metrics) && (
        <header
          ref={headerRef}
          className={cx("flex flex-col gap-2 px-5 pb-3 pt-4 sm:flex-row sm:items-start sm:justify-between", metrics && cx("max-sm:gap-3", HEADER_ROW_GAP))}
        >
          <div className={cx("min-w-0", metrics && TITLE_BLOCK_WITH_METRICS)}>
            {title && (
              <h2 className={cx("m-0 text-sm font-semibold leading-snug", icon && "flex items-start gap-2")}>
                {/* Centred on the title's first line (line-height 1.375). */}
                {icon && <TitleIcon icon={icon} className="mt-[1.5px]" />}
                {icon ? <span className="min-w-0">{title}</span> : title}
              </h2>
            )}
            {caption && <p className="m-0 mt-0.5 text-xs text-muted">{caption}</p>}
          </div>
          {metricsNode}
          {actions && (
            <div ref={actionsRef} className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </header>
      )}
      {children && <div className={cx(!flush && "px-5 pb-5", !title && !actions && !metrics && !flush && "pt-5")}>{children}</div>}
      {!children && <div className="pb-1" />}
    </section>
  );
}

/**
 * The frame every module page shares: a title row, optional tabs (links that change `?tab=` with
 * shallow routing, so the region in the link is kept), a strip of up to four figures, then
 * the body - a chart or map, then a table.
 */
export function PageFrame({
  title,
  subtitle,
  lead,
  tabs,
  tabParam = "tab",
  activeTab,
  figures,
  figuresAside,
  children,
  testId,
}: {
  title: string;
  subtitle?: ReactNode;
  /** A block between the title and the tabs (the farm picker on Farm Monitoring). */
  lead?: ReactNode;
  tabs?: readonly FrameTab[];
  /** The query key the tabs write; "tab" unless the page already uses it. */
  tabParam?: string;
  activeTab?: string;
  figures?: readonly FigureProps[];
  /** A compact card (a donut) beside the figures: the figures take two thirds, two by two, the card one third. */
  figuresAside?: ReactNode;
  children: ReactNode;
  testId?: string;
}) {
  const [breakdownSlot, setBreakdownSlot] = useState<HTMLElement | null>(null);
  const t = useT(FRAME_STRINGS);
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4" data-testid={testId}>
      <div>
        <h1 className="m-0 text-xl font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="m-0 mt-1 text-sm text-muted">{subtitle}</p>}
      </div>

      {lead}

      {tabs && tabs.length > 1 && (
        <nav aria-label={t("tabsLabel")} data-testid="frame-tabs" className="-mb-1 flex gap-1 overflow-x-auto border-b border-line">
          {tabs.map((tab) => {
            const active = tab.tab === activeTab;
            return (
              <Link
                key={tab.tab}
                href={{ pathname: router.pathname, query: { ...router.query, [tabParam]: tab.tab } }}
                shallow
                replace
                scroll={false}
                aria-current={active ? "page" : undefined}
                data-testid={`frame-tab-${tab.tab}`}
                className={cx(
                  "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition touch:py-3",
                  active ? "border-green-d text-green-d" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {tab.label}
                {tab.count !== undefined && <span className="ms-1.5 font-normal tabular-nums text-muted">{tab.count}</span>}
              </Link>
            );
          })}
        </nav>
      )}

      {figures && figures.length > 0 && figuresAside ? (
        <BreakdownSlotContext.Provider value={breakdownSlot}>
          <div className="grid items-stretch gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <FigureStrip figures={figures} twoColumns />
            </div>
            <div className="min-w-0 [&>*]:h-full">{figuresAside}</div>
          </div>
          {/* An opened breakdown table appears here, full width. */}
          <div ref={setBreakdownSlot} className="flex flex-col gap-4 empty:hidden" />
        </BreakdownSlotContext.Provider>
      ) : (
        figures && figures.length > 0 && <FigureStrip figures={figures} />
      )}
      {children}
    </div>
  );
}
