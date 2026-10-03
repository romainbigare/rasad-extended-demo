import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { useZones } from "@/lib/analytics/hooks";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";
import { useRegion } from "@/lib/region/RegionContext";

import { cx } from "../ui/cx";
import { ChevronDownIcon, PinIcon } from "./icons";

const MENU_ID = "topbar-region-menu";

/**
 * Top-bar region picker. The choice filters every Executive View card (see
 * RegionContext). Keyboard: Enter/Space/Arrow opens, Arrow/Home/End move,
 * Enter/Space picks, Escape closes; focus returns to the button either way.
 */
export function RegionPicker({ className }: { className?: string }) {
  const { language } = useLanguage();
  const { zoneId, setZoneId } = useRegion();
  const zones = useZones();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);

  const options: Array<{ id: number | null; name: string }> = [
    { id: null, name: t("regionAllLabel", language) },
    ...(zones.data ?? []),
  ];
  const ready = !zones.isLoading && !zones.isError;
  const selected = zones.data?.find((z) => z.id === zoneId);

  // A remembered region that isn't offered any more (e.g. a test zone picked earlier) falls back to
  // All regions, instead of the whole app staying filtered to it. The top bar is on every page.
  useEffect(() => {
    if (zones.isSuccess && zoneId !== null && !zones.data.some((z) => z.id === zoneId)) setZoneId(null);
  }, [zones.isSuccess, zones.data, zoneId, setZoneId]);
  const label = selected ? `${selected.name} ${t("regionSuffix", language)}` : t("regionAllLabel", language);

  // Outside click closes without stealing focus back to the button.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  // Keep keyboard focus on the highlighted option while the menu is open.
  useEffect(() => {
    if (open && ready) optionRefs.current[activeIndex]?.focus();
  }, [open, ready, activeIndex]);

  const openMenu = () => {
    const current = options.findIndex((o) => o.id === zoneId);
    setActiveIndex(current >= 0 ? current : 0);
    setOpen(true);
  };

  const closeMenu = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const choose = (id: number | null) => {
    setZoneId(id);
    closeMenu(true);
  };

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openMenu();
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i >= last ? 0 : i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? last : i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (ready) choose(options[activeIndex].id);
        break;
      case "Escape":
        e.preventDefault();
        closeMenu(true);
        break;
      case "Tab":
        // Let focus move on naturally; just close behind it.
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        data-testid="topbar-region-selector"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? MENU_ID : undefined}
        aria-label={`${t("regionPickerLabel", language)}: ${label}`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className="flex min-h-[38px] max-w-full items-center gap-2 whitespace-nowrap rounded-lg border border-line bg-[#fafbfb] px-2.5 py-[7px] text-xs font-semibold transition hover:bg-[#f4f7f6] sm:min-h-0 sm:px-3"
      >
        <PinIcon className="flex-none text-red" />
        {/* Phones: the icon only (the line under the bar names the region), so the whole top bar fits in one row. */}
        <span className="hidden min-w-0 truncate sm:inline">{label}</span>
        <ChevronDownIcon className={cx("flex-none text-muted transition", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          id={MENU_ID}
          role="listbox"
          aria-label={t("regionPickerLabel", language)}
          data-testid="topbar-region-menu"
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          className="absolute start-0 top-full z-30 m-0 mt-1.5 max-h-[min(60vh,20rem)] min-w-[200px] max-w-[calc(100vw-1rem)] list-none overflow-y-auto rounded-lg border border-line bg-panel p-0 py-1 text-xs shadow-lg"
        >
          {zones.isError ? (
            <li className="px-3 py-2 text-red">{t("regionLoadError", language)}</li>
          ) : zones.isLoading ? (
            <li className="px-3 py-2 text-muted">{t("loading", language)}…</li>
          ) : (
            options.map((option, i) => {
              const isSelected = zoneId === option.id;
              return (
                <li
                  key={option.id ?? "all"}
                  id={`${MENU_ID}-opt-${i}`}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onClick={() => choose(option.id)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cx(
                    "cursor-pointer px-3 py-2.5 outline-none sm:py-2 touch:py-3",
                    i === activeIndex && "bg-[#f4f7f6]",
                    isSelected && "font-bold text-green-d",
                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-d",
                  )}
                >
                  {option.name}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
