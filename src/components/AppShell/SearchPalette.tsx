import { ChevronRight, Search, Warehouse, X } from "lucide-react";
import { useRouter } from "next/router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useGlobalSearch, useZones } from "@/lib/analytics/hooks";
import { useAreaUnit } from "@/lib/area/AreaUnitContext";
import { useFarmList } from "@/lib/farm/useFarmList";
import { formatInteger } from "@/lib/format";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { type ChromeStringKey, t } from "@/lib/i18n/translations";
import { useRegion } from "@/lib/region/RegionContext";
import { displayIer } from "@/lib/scores";

import { cx } from "../ui/cx";
import { SearchIcon } from "./icons";
import { NAV_GROUPS, type NavItem as MenuItem } from "./navigation";

const DEFAULT_FARMS = 15;

/** The quick-navigation tiles: every page of the main menu (not Support); a module with several pages lists them. */
const QUICK_NAV: readonly MenuItem[] = NAV_GROUPS.filter((group) => !group.collapsible).flatMap((group) => group.items);

const QUICK_NAV_SUB: Record<string, ChromeStringKey> = {
  "/executive-view": "paletteNavExecutiveSub",
  "/modules/crops": "paletteNavCropsSub",
  "/modules/trees": "paletteNavTreesSub",
  "/modules/land": "paletteNavLandSub",
  "/modules/irrigation": "paletteNavIrrigationSub",
  "/modules/water": "paletteNavWaterSub",
  "/farm-monitoring": "paletteNavFarmMonitoringSub",
  "/reports": "paletteNavReportsSub",
};

type FarmRow = {
  key: string;
  href: string;
  name: string;
  uid: string;
  region: string | null;
  areaDu: number | null;
  /** IER score; neither the farm list nor the search results carry one yet, so the pill shows a dash. */
  ier: number | null;
};

const parseArea = (v: string | null | undefined) => {
  const n = v === null || v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function SearchPalette({ className, autoFocus = false }: { className?: string; autoFocus?: boolean }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  // Debounce typing so every keystroke doesn't fire a search.
  useEffect(() => {
    const id = setTimeout(() => setQuery(text), 250);
    return () => clearTimeout(id);
  }, [text]);

  // Ctrl/⌘+K opens the window from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Focus the input when it opens; lock the page scroll behind the window.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const { zoneId } = useRegion();
  const zones = useZones();
  const farms = useFarmList();
  const { area, unitLabel } = useAreaUnit();
  const search = useGlobalSearch(query);
  const q = query.trim().toLowerCase();
  const searching = q.length >= 2;

  const zoneName = useMemo(() => new Map((zones.data ?? []).map((z) => [z.id, z.name])), [zones.data]);
  const farmById = useMemo(() => new Map((farms.data ?? []).map((f) => [f.id, f])), [farms.data]);

  const subOf = (n: MenuItem) =>
    n.children ? n.children.map((child) => t(child.titleKey, language)).join(" · ") : t(QUICK_NAV_SUB[n.path], language);
  const navItems = QUICK_NAV.filter((n) => !q || `${t(n.titleKey, language)} ${subOf(n)}`.toLowerCase().includes(q)).map((n) => ({
    href: n.path,
    Icon: n.icon,
    title: t(n.titleKey, language),
    sub: subOf(n),
  }));

  const farmRows: FarmRow[] = useMemo(() => {
    if (searching) {
      return (search.data?.results ?? []).map((r) => {
        const farmId = r.type === "field" ? r.farm_id : r.id;
        const farm = farmId !== null ? farmById.get(farmId) : undefined;
        return {
          key: `${r.type}-${r.id}`,
          href: r.type === "field" && r.farm_id !== null ? `/farm-monitoring?farm=${r.farm_id}&field=${r.id}` : `/farm-monitoring?farm=${r.id}`,
          name: farm?.name || r.label || r.owner_name || r.uid,
          uid: r.uid,
          region: r.zone_name,
          areaDu: r.type === "farm" ? parseArea(farm?.area_dunum) : null,
          ier: null,
        };
      });
    }
    return (farms.data ?? [])
      .filter((f) => zoneId === null || f.zone_id === zoneId)
      .slice(0, DEFAULT_FARMS)
      .map((f) => ({
        key: `farm-${f.id}`,
        href: `/farm-monitoring?farm=${f.id}`,
        name: f.name || f.owner_name || f.uid,
        uid: f.uid,
        region: f.zone_id !== null ? zoneName.get(f.zone_id) ?? null : null,
        areaDu: parseArea(f.area_dunum),
        ier: null,
      }));
  }, [searching, search.data, farms.data, farmById, zoneId, zoneName]);

  // One keyboard list: the navigation tiles, then the farms.
  const items: Array<{ href: string }> = [...navItems, ...farmRows];
  useEffect(() => setActive(0), [query, open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    setText("");
    setQuery("");
  };
  const go = (href: string) => {
    close();
    void router.push(href);
  };
  // Keys work wherever focus is inside the page while the window is open, not only when focus is
  // inside the dialog (a click on empty list space would otherwise drop them).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[active]) {
      e.preventDefault();
      go(items[active].href);
    }
  };

  const keyHandler = useRef(onKeyDown);
  keyHandler.current = onKeyDown;
  useEffect(() => {
    if (!open) return;
    const listener = (e: KeyboardEvent) => keyHandler.current(e);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [open]);

  let farmStatus: string | null = null;
  if (searching) {
    if (search.isError) farmStatus = t("searchError", language);
    else if (search.isLoading || text.trim().toLowerCase() !== q) farmStatus = farmRows.length ? null : t("searchLoading", language);
    else if (farmRows.length === 0) farmStatus = t("searchNoResults", language);
  } else if (farms.isLoading) farmStatus = t("searchLoading", language);
  else if (farms.isError) farmStatus = t("searchError", language);
  else if (farmRows.length === 0) farmStatus = t("searchNoResults", language);

  const sectionLabel = (children: ReactNode) => (
    <div className="mx-4 border-b border-line px-1 pb-2 pt-4 text-xs font-semibold text-muted">{children}</div>
  );

  const palette = (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#04303B]/30 p-3 pt-[6vh] sm:p-6 sm:pt-[8vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("searchLabel", language)}
        data-testid="search-palette"
        className="flex max-h-[84vh] w-full max-w-[880px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
      >
        {/* Search input + close */}
        <div className="flex items-center gap-3 border-b border-line bg-[#FAFBFB] px-5 py-4">
          <Search size={22} strokeWidth={1.8} aria-hidden className="flex-none text-muted" />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("palettePlaceholder", language)}
            aria-label={t("searchLabel", language)}
            data-testid="search-palette-input"
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted md:text-base"
          />
          <button
            type="button"
            onClick={close}
            aria-label={t("paletteClose", language)}
            className="grid h-8 w-8 flex-none place-items-center rounded-md text-muted hover:bg-[#F4F7F6] hover:text-ink"
          >
            <X size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto pb-3">
          {navItems.length > 0 && (
            <>
              {sectionLabel(t("paletteQuickNav", language))}
              <div className="grid gap-3 px-4 pt-3 sm:grid-cols-2">
                {navItems.map((n, i) => (
                  <button
                    key={n.href}
                    type="button"
                    data-active={active === i}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(n.href)}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition",
                      navItems.length % 2 === 1 && i === navItems.length - 1 && "sm:col-span-2",
                      active === i ? "border-[#4FB840] bg-[#F4F7F6]" : "border-line bg-white hover:bg-[#F4F7F6]",
                    )}
                  >
                    <n.Icon width={20} height={20} className="flex-none text-green-d" />
                    <span className="min-w-0">
                      <b className="block truncate text-sm text-ink">{n.title}</b>
                      <span className="block truncate text-xs text-muted">{n.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {sectionLabel(
            <>
              {t("paletteFarms", language)}
              {farmRows.length > 0 && ` (${farmRows.length})`}
            </>,
          )}
          {farmStatus ? (
            <p className={cx("m-0 px-5 py-4 text-xs", search.isError || farms.isError ? "text-red" : "text-muted")}>{farmStatus}</p>
          ) : (
            <ul className="m-0 list-none space-y-2 px-4 pt-3">
              {farmRows.map((r, j) => {
                const i = navItems.length + j;
                const areaShown = r.areaDu === null ? null : area({ du: r.areaDu });
                const ierShown = displayIer(r.ier, 0);
                const band = ierShown?.info;
                return (
                  <li key={r.key}>
                    <button
                      type="button"
                      data-active={active === i}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(r.href)}
                      className={cx(
                        "flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-start transition",
                        active === i ? "border-[#4FB840] bg-[#F4F7F6]" : "border-line bg-white hover:bg-[#F4F7F6]",
                      )}
                    >
                      <span aria-hidden className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-[#72C02C]/30 bg-[#E4F8F5] text-[#4FB840]">
                        <Warehouse size={18} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <b className="truncate text-sm text-ink">{r.name}</b>
                          {r.uid !== r.name && (
                            <span className="flex-none rounded border border-line bg-[#F4F7F6] px-1.5 py-0.5 font-mono text-xs font-semibold text-muted">
                              {r.uid}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted">
                          {[
                            r.region ? t("paletteRegionTemplate", language).replace("{region}", r.region) : null,
                            areaShown !== null ? `${formatInteger(areaShown)} ${unitLabel}` : null,
                          ]
                            .filter(Boolean)
                            .join("  ·  ")}
                        </span>
                      </span>
                      {/* Slate without a score; the IER band's colours (lib/scores.ts) with one. */}
                      <span
                        className={cx(
                          "flex-none rounded-full border px-2.5 py-0.5 text-xs font-bold",
                          !band && "border-line bg-slate-l text-slate",
                        )}
                        style={band ? { background: band.tint, color: band.text, borderColor: band.color } : undefined}
                      >
                        {t("paletteIer", language)} {ierShown === null ? "—" : formatInteger(ierShown.value)}
                      </span>
                      <ChevronRight size={18} strokeWidth={2} aria-hidden className="flex-none text-muted rtl:rotate-180" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-[#FAFBFB] px-5 py-3 text-xs text-muted">
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-sans text-xs">↑↓</kbd> {t("paletteToNavigate", language)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-sans text-xs">ESC</kbd> {t("paletteToExit", language)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cx("relative", className)}>
      {/* The top-bar box keeps its look; clicking it (or Ctrl/⌘+K) opens the search window. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="topbar-search-input"
        aria-haspopup="dialog"
        aria-label={t("searchLabel", language)}
        className="flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-xl border border-line bg-[#fafbfb] px-3.5 py-2 text-start text-xs text-muted transition hover:border-[#4FB840] hover:bg-white"
      >
        <SearchIcon className="flex-none" />
        <span className="min-w-0 flex-1 truncate">{t("searchPlaceholder", language)}</span>
        <span className="hidden flex-none rounded border border-line px-[5px] py-px text-xs md:inline">⌘K</span>
      </button>
      {open && mounted && createPortal(palette, document.body)}
    </div>
  );
}
