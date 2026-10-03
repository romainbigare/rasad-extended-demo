
/* ------------------------------------------------------------------ colours */

export const COLORS = {
  // core (have Tailwind tokens)
  ink: "#04303B", // main text, headings, numbers            -> text-ink
  muted: "#667876", // descriptions, labels                    -> text-muted
  line: "#DDE5E2", // borders, dividers                        -> border-line
  bg: "#F4F7F6", // page background, table header, hovers     -> bg-bg
  panel: "#FFFFFF", // cards                                   -> bg-panel
  teal: "#04303B", // dark hero surfaces                       -> bg-teal
  green: "#4FB840", // accent, icons, primary button           -> text-green / bg-green
  greenDark: "#006E01", // positive text                       -> text-green-d

  panelAlt: "#FAFBFB", // card header strips, inner boxes
  mint: "#E4F8F5", // icon squares, selected states, "good" pills
  greenSoft: "#72C02C", // soft green borders (used at 30-40% opacity), button hover
  greenBright: "#8CF877", // green text on the dark hero
  forest: "#15803D", // tree / forestry accents
  greyText: "#41484B", // secondary values (structure type, season)
  blue: "#0284C7", // "Good" pills, water quota, info
  blueLight: "#E0F2FE",
  amber: "#D97706", // "Moderate" / warning pills
  amberLight: "#FEF3C7",
  red: "#DC2626", // "Poor" / overdraft / critical
  redLight: "#FEE2E2",
  redDeep: "#BA1A1A", // "Clear" links, map dot outline
  successLight: "#DCFCE7", // light green chips (0.5M, checklist)
  successBorder: "#86EFAC",
  successText: "#16A34A",
  mapTool: "#181F25", // Farm Monitoring dark map toolbar
  mapToolOn: "#22C55E", // map toolbar "on" state
} as const;

/** Tailwind token classes for the core colours (prefer these over hex in class names). */
export const token = {
  text: { ink: "text-ink", muted: "text-muted", green: "text-green", greenDark: "text-green-d" },
  bg: { page: "bg-bg", panel: "bg-panel", teal: "bg-teal", green: "bg-green" },
  border: { line: "border-line" },
} as const;

/* ------------------------------------------------------------------ type scale */

export const TEXT = {
  pageTitle: "text-lg font-extrabold tracking-tight", // e.g. Reports page title
  sectionTitle: "text-base font-extrabold tracking-tight", // big section cards
  cardTitle: "text-sm font-bold", // card titles
  subTitle: "text-xs font-bold", // sub-card titles
  body: "text-xs", // body, tables, buttons, dropdowns, nav
  description: "text-xs text-muted", // line under a title
  caption: "text-[11px] text-muted", // small notes
  footnote: "text-[10px] text-muted", // tiny captions, sub-lines
  label: "text-[11px] font-bold uppercase tracking-wider text-muted", // card labels (caps)
  labelSmall: "text-[10px] font-bold uppercase tracking-wider text-muted", // tile labels (forestry, telemetry)
  tableHeader: "text-[11px] font-bold uppercase tracking-wider text-muted",
  badge: "text-[10px] font-bold",
  mono: "font-mono", // IDs, codes, coordinates
} as const;

/** KPI number sizes. */
export const NUMBER = {
  large: "text-3xl font-bold tabular-nums", // big white KPI cards (Farm page)
  hero: "text-2xl font-black tracking-tight tabular-nums", // dark Executive hero
  small: "text-xl font-extrabold tabular-nums", // small stat cards (Reports, ranking)
  inner: "text-base font-black tabular-nums", // numbers inside boxes
  unit: "text-xs font-medium text-muted", // unit after a number
} as const;

/* ------------------------------------------------------------------ shape */

export const RADIUS = {
  badge: "rounded", // 4px - pills / badges
  control: "rounded-lg", // 8px - buttons, inputs, inner boxes, icon squares
  card: "rounded-xl", // 12px - cards (also rounded-card)
  section: "rounded-2xl", // 16px - big section cards (Operations Domain, Forestry)
} as const;

export const SHADOW = {
  card: "shadow-xs", // 0 1px 2px / 5%
  tile: "shadow-2xs", // 0 1px / 5%
} as const;

/* ------------------------------------------------------------------ recipes */

export const UI = {
  /** Standard card. */
  card: "rounded-xl border border-line bg-panel p-5 shadow-xs",
  /** Small stat card (Reports cards). */
  statCard: "rounded-xl border border-line bg-panel p-3.5 shadow-2xs",
  /** Large white KPI card (Farm page). */
  kpiCard: "rounded-xl border border-line bg-panel p-5 shadow-xs",
  /** Big section card with a header strip. */
  sectionCard: "overflow-hidden rounded-2xl border border-line bg-panel shadow-xs",
  sectionHeader: "border-b border-line bg-[#FAFBFB] p-5",
  /** Box inside a card. */
  innerBox: "rounded-lg border border-line bg-[#FAFBFB] p-3",
  /** Mint icon square before a section title (16px icon inside). */
  iconSquare: "flex-none rounded-lg bg-[#E4F8F5] p-1.5 text-[#4FB840]",
  /** Text input / dropdown (also components/ui/fieldStyles.ts FIELD_CLASS). */
  field:
    "rounded-lg border border-line bg-[#F4F7F6] px-3 py-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-[#4FB840] focus:bg-white disabled:cursor-not-allowed disabled:opacity-60",
  /** The same field on a dark panel (Farm Monitoring header). */
  fieldOnDark:
    "rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none transition placeholder:text-muted focus:border-[#4FB840] disabled:cursor-not-allowed disabled:opacity-60",
  /** Buttons. */
  buttonPrimary: "rounded-lg bg-[#4FB840] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#72C02C]",
  buttonSecondary: "rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-[#F4F7F6]",
  /** The app's shared "selected card" look (components/ui/selectableCard.ts) - inset ring, no layout shift. */
  cardSelected: "border-green bg-[#ecf8f0] shadow-[inset_0_0_0_1px_rgb(var(--green))]",
  cardUnselected: "border-line bg-panel hover:border-[#bfe3b3] hover:bg-[#F4F7F6]",
  /** Selected / unselected clickable card. */
  selected: "border-[#4FB840] bg-[#E4F8F5] shadow-xs",
  unselected: "border-line bg-white hover:bg-[#F4F7F6]",
  /** Table. */
  tableHeaderRow: "bg-[#F4F7F6] text-[11px] font-bold uppercase tracking-wider text-muted",
  tableRow: "border-b border-line transition-colors hover:bg-[#F4F7F6]",
  tableCell: "px-4 py-3",
  /** Progress bar (health / vigor). */
  barTrack: "h-1.5 overflow-hidden rounded-full bg-[#DDE5E2]",
  barFill: "h-full rounded-full bg-[#4FB840]",
} as const;

/** Pill / badge tones: base + tone, e.g. cx(PILL.base, PILL.good). */
export const PILL = {
  base: "inline-block whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-bold",
  good: "bg-[#E4F8F5] text-[#006E01]", // Excellent, Low risk, Compliant, Harvesting, Optimal, Normal
  info: "bg-[#E0F2FE] text-[#0284C7]", // Good, irrigation & utilities
  warn: "bg-[#FEF3C7] text-[#D97706]", // Moderate, Fruiting, maturity, Active
  bad: "bg-[#FEE2E2] text-[#DC2626]", // Poor, High risk, Overdraft, Critical
  neutral: "bg-[#F4F7F6] text-[#04303B]", // Compliant (condition), other
} as const;

/* ------------------------------------------------------------------ layout */

export const LAYOUT = {
  pagePadding: "p-4 sm:p-6", // AppShell main
  sectionGap: "gap-6", // between page sections
  gridGap: "gap-4", // card grids
  sidebarWidth: "w-64",
  topBarHeight: "h-14", // 56px
} as const;
