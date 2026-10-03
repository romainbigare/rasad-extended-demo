import { ListChecks, Printer } from "lucide-react";
import { useEffect } from "react";

import { StatusPill } from "@/components/frame/BandPill";
import { Section } from "@/components/frame/PageFrame";
import { useFarmMonitoring } from "@/lib/farm/useFarmMonitoring";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import type { Finding } from "../lib/findings";

/**
 * What to check: the farm's findings as neutral statements of fact, the most important first, with a
 * print button. Printing shows only this list and the farm's name (see the print rules in globals.css).
 */
export function CheckTab({ farmId, findings, isLoading, hasError }: { farmId: number | null; findings: readonly Finding[]; isLoading: boolean; hasError: boolean }) {
  const t = useT(STRINGS);
  const monitoring = useFarmMonitoring(farmId);
  const farm = monitoring.data?.farm;

  // While this tab prints (its button or Ctrl+P), <html> carries the class the print rules in globals.css need.
  // It is removed afterwards and when the tab goes, so printing any other page is unchanged.
  useEffect(() => {
    const root = document.documentElement;
    const on = () => root.classList.add("printing-findings");
    const off = () => root.classList.remove("printing-findings");
    window.addEventListener("beforeprint", on);
    window.addEventListener("afterprint", off);
    return () => {
      window.removeEventListener("beforeprint", on);
      window.removeEventListener("afterprint", off);
      off();
    };
  }, []);

  return (
    <div data-print-area data-testid="mon-check">
      <Section
        icon={ListChecks}
        title={t("checkTitle")}
        caption={t("checkCaption")}
        actions={
          <button
            type="button"
            onClick={() => window.print()}
            data-testid="mon-check-print"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-green-d hover:bg-[#f4f7f6] disabled:opacity-50 print:hidden"
          >
            <Printer size={14} strokeWidth={1.8} aria-hidden />
            {t("checkPrint")}
          </button>
        }
      >
        {/* Only in print: which farm the list is about. */}
        <p className="m-0 mb-3 hidden text-base font-semibold print:block">{farm ? farm.name ?? farm.uid : ""}</p>
        {isLoading ? (
          <p className="m-0 text-xs text-muted">{t("checkLoading")}</p>
        ) : findings.length === 0 ? (
          <p className="m-0 text-sm" data-testid="mon-check-empty">
            {t("checkNothing")}
          </p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0" data-testid="mon-findings">
            {findings.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3 text-sm" data-testid={`mon-finding-${f.id}`}>
                <StatusPill tone={f.level === "act" ? "act" : "watch"} className="w-16 flex-none justify-center">
                  {t(f.level === "act" ? "levelAct" : "levelWatch")}
                </StatusPill>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        )}
        {hasError && !isLoading && <p className="m-0 mt-3 text-xs text-muted">{t("checkPartial")}</p>}
      </Section>
    </div>
  );
}
