import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/AppShell/icons";
import { useDropdownPlacement } from "@/components/ui/useDropdownPlacement";
import { useT } from "@/lib/i18n/createDict";
import type { SatelliteCatalogEntry } from "@/lib/network/satellite/endpoints";

import { STRINGS } from "../../data/translations";

export function SatelliteMultiSelect({
  satellites,
  selected,
  onChange,
}: {
  satellites: SatelliteCatalogEntry[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useT(STRINGS);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Opens upward when there isn't room below.
  const placement = useDropdownPlacement(open, containerRef, panelRef);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const allSelected = satellites.length > 0 && selected.length === satellites.length;
  const label = satellites.length === 0 ? "—" : allSelected ? t("ribbonAllSatellites") : selected.join(", ") || "—";

  const toggle = (code: string) => {
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);
  };

  return (
    <div ref={containerRef} className="relative" data-testid="satellite-multiselect">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={satellites.length === 0}
        className="flex h-9 min-w-[160px] items-center touch:h-11 justify-between gap-2 rounded-lg border border-line bg-[#fafbfb] px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 flex-none text-muted" />
      </button>
      {open && (
        <div ref={panelRef}
          style={placement.maxHeight ? { maxHeight: placement.maxHeight, overflowY: "auto" } : undefined}
          className={`absolute start-0 z-20 min-w-[160px] max-w-[calc(100vw-1.5rem)] rounded-lg border border-line bg-panel p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${placement.up ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"}`}>
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-[#f4f7f6] touch:py-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => onChange(allSelected ? [] : satellites.map((s) => s.satellite))}
              className="accent-teal"
            />
            {t("ribbonAllSatellites")}
          </label>
          <div className="my-1 h-px bg-line" />
          {satellites.map((s) => (
            <label
              key={s.satellite}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold hover:bg-[#f4f7f6] touch:py-3"
            >
              <input
                type="checkbox"
                checked={selected.includes(s.satellite)}
                onChange={() => toggle(s.satellite)}
                className="accent-teal"
              />
              {s.satellite}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
