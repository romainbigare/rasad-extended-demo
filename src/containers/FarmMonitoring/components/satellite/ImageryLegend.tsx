import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon } from "@/components/AppShell/icons";
import type { FieldImageryLegendEntry } from "@/lib/network/satellite/endpoints";

export function ImageryLegend({
  legends,
  unit,
  open: openProp,
  onOpenChange,
}: {
  legends: FieldImageryLegendEntry[];
  unit: "hectare" | "acre";
  /** Controlled open state (the map toolbar's legend button); uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = (next: boolean | ((v: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(open) : next;
    if (openProp === undefined) setOpenState(value);
    onOpenChange?.(value);
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const setOpenRef = useRef(setOpen);
  setOpenRef.current = setOpen;

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // The map toolbar's legend button toggles it itself - don't close here first (it would reopen at once).
      if (target.closest?.('[data-testid="mon-map-toolbar"]')) return;
      if (containerRef.current && !containerRef.current.contains(target)) setOpenRef.current(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  if (!legends.length) return null;

  return (
    <div ref={containerRef} className="absolute bottom-3 end-3 z-10 [@container(max-width:640px)]:bottom-7" data-testid="mon-map-legend-toggle-container">
      {open && (
        <div className="absolute bottom-[calc(100%+6px)] end-0 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-line bg-panel shadow-[0_4px_16px_rgba(0,0,0,0.18)]">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-[#F4F7F6] text-start text-[11px] font-bold uppercase tracking-[0.04em] text-muted">
                <th className="w-9 px-2.5 py-1.5">Colour</th>
                <th className="px-2.5 py-1.5">Range</th>
                <th className="px-2.5 py-1.5">Area ({unit === "hectare" ? "ha" : "ac"})</th>
              </tr>
            </thead>
            <tbody>
              {legends.map((legend, i) => (
                <tr key={i} className="border-t border-line" data-testid={`mon-map-legend-toggle-row-${i}`}>
                  <td className="px-2.5 py-1.5">
                    <span
                      aria-hidden
                      className="inline-block h-3 w-3 rounded-sm border border-black/10"
                      style={{ background: legend.hex }}
                    />
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-1.5 font-mono">
                    {legend.min.toFixed(2)}–{legend.max.toFixed(2)}
                    {legend.unit ? ` ${legend.unit}` : ""}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-1.5">
                    {Math.round(legend.area).toLocaleString("en-US")} <span className="text-muted">({legend["area%"]})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        type="button"
        data-testid="mon-map-legend-toggle"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:bg-white"
      >
        <ChevronDownIcon className={`h-3.5 w-3.5 flex-none transition-transform ${open ? "rotate-180" : ""}`} />
        Legend
      </button>
    </div>
  );
}
