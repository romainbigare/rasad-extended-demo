import { Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useDropdownPlacement } from "@/components/ui/useDropdownPlacement";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../../data/translations";

export function SatelliteDateRangePicker({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (range: { start: string; end: string }) => void;
}) {
  const t = useT(STRINGS);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Opens upward when there isn't room below.
  const placement = useDropdownPlacement(open, containerRef, panelRef);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" data-testid="satellite-date-range">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("ribbonSelectDateRange")}
        aria-label={t("ribbonSelectDateRange")}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-teal touch:h-11 touch:w-11 bg-teal text-white hover:bg-teal-2"
      >
        <Calendar className="h-5 w-5" strokeWidth={1.8} aria-hidden />
      </button>
      {open && (
        <div ref={panelRef}
          style={placement.maxHeight ? { maxHeight: placement.maxHeight, overflowY: "auto" } : undefined}
          className={`absolute end-0 z-20 flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 rounded-lg border border-line bg-panel p-3 text-xs shadow-[0_4px_16px_rgba(0,0,0,0.12)] ${placement.up ? "bottom-[calc(100%+4px)]" : "top-[calc(100%+4px)]"}`}>
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold text-muted">{t("ribbonSelectStart")}</span>
            <input
              type="date"
              value={start}
              max={end}
              onChange={(e) => onChange({ start: e.target.value, end })}
              className="rounded-md border border-line px-2 py-1"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="font-semibold text-muted">{t("ribbonSelectEnd")}</span>
            <input
              type="date"
              value={end}
              min={start}
              max={today}
              onChange={(e) => onChange({ start, end: e.target.value })}
              className="rounded-md border border-line px-2 py-1"
            />
          </label>
        </div>
      )}
    </div>
  );
}
