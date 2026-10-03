import { useEffect, useId, useMemo, useRef, useState } from "react";

import type { FarmServiceFarm } from "@shared/farm/endpoints";
import { cx } from "@/components/ui/cx";
import { FIELD_CLASS } from "@/components/ui/fieldStyles";
import { useDropdownPlacement } from "@/components/ui/useDropdownPlacement";
import { type Dict, useT } from "@/lib/i18n/createDict";

const STRINGS = {
  farmSelectorLabel: { en: "Farm", ar: "المزرعة" },
  farmSelectorLoadingOption: { en: "Loading farms…", ar: "جارٍ تحميل المزارع…" },
  farmSelectorEmptyOption: { en: "No farms in this region", ar: "لا توجد مزارع في هذه المنطقة" },
  farmPickerSearchPlaceholder: { en: "Search farm…", ar: "ابحث عن مزرعة…" },
  farmPickerNoMatch: { en: "No farm matches.", ar: "لا توجد مزرعة مطابقة." },
  farmPickerMoreTemplate: { en: "{count} more - keep typing to narrow the list", ar: "{count} أخرى - تابع الكتابة لتضييق القائمة" },
} satisfies Dict;

/** Draw at most this many matches - keeps the list fast with thousands of farms. */
const MAX_SHOWN = 100;

export function FarmPicker({
  options,
  farmId,
  onChange,
  isLoading,
  optionLabel,
  className,
  buttonClassName,
}: {
  options: FarmServiceFarm[];
  farmId: number | null;
  onChange: (farmId: number) => void;
  isLoading: boolean;
  /** Option text; defaults to the farm uid. Also what the search matches against. */
  optionLabel?: (farm: FarmServiceFarm) => string;
  /** Wrapper classes (width, margins). */
  className?: string;
  /** Replaces the button's field classes (e.g. the white FIELD_ON_DARK_CLASS on Farm Monitoring's dark header). */
  buttonClassName?: string;
}) {
  const t = useT(STRINGS);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  // Opens upward when there isn't room below (e.g. near the bottom of the screen).
  const placement = useDropdownPlacement(open, rootRef, panelRef);

  const labelOf = (f: FarmServiceFarm) => (optionLabel ? optionLabel(f) : f.uid);
  const selected = options.find((f) => f.id === farmId);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((f) => labelOf(f).toLowerCase().includes(q)) : options;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- labelOf is derived from optionLabel
  }, [options, query, optionLabel]);
  const shown = matches.slice(0, MAX_SHOWN);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    inputRef.current?.focus();
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const pick = (f: FarmServiceFarm) => {
    onChange(f.id);
    setOpen(false);
    setQuery("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && shown[active]) {
      e.preventDefault();
      pick(shown[active]);
    }
  };

  const empty = !options.length;
  return (
    <div ref={rootRef} className={cx("relative", className)}>
      <button
        type="button"
        disabled={empty}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("farmSelectorLabel")}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "flex w-full items-center justify-between gap-2 text-start text-ink disabled:cursor-not-allowed",
          buttonClassName ??
            FIELD_CLASS,
        )}
      >
        <span className="truncate">
          {selected ? labelOf(selected) : isLoading ? t("farmSelectorLoadingOption") : empty ? t("farmSelectorEmptyOption") : ""}
        </span>
        <span aria-hidden className="flex-none text-muted">
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className={cx(
            "absolute end-0 start-0 z-30 overflow-hidden rounded-xl border border-line bg-panel text-xs text-ink shadow-lg",
            placement.up ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={t("farmPickerSearchPlaceholder")}
            className="w-full border-b border-line bg-[#fafbfb] px-3 py-2.5 outline-none"
          />
          <ul
            id={listId}
            role="listbox"
            aria-label={t("farmSelectorLabel")}
            // Tight on both sides: the list (not the search box above it) gives up the height.
            style={placement.maxHeight ? { maxHeight: Math.max(96, placement.maxHeight - 48) } : undefined}
            className="m-0 max-h-72 list-none overflow-y-auto p-0 py-1"
          >
            {shown.length === 0 && <li className="px-3 py-2 text-muted">{t("farmPickerNoMatch")}</li>}
            {shown.map((f, i) => (
              <li key={f.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={f.id === farmId}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(f)}
                  className={cx(
                    "block w-full truncate px-3 py-2 text-start touch:py-3",
                    i === active && "bg-[#f4f7f6]",
                    f.id === farmId && "font-bold",
                  )}
                >
                  {labelOf(f)}
                </button>
              </li>
            ))}
            {matches.length > MAX_SHOWN && (
              <li className="px-3 py-2 text-xs text-muted">
                {t("farmPickerMoreTemplate").replace("{count}", String(matches.length - MAX_SHOWN))}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
