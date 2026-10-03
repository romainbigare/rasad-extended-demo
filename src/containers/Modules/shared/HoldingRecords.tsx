import { ClipboardList } from "lucide-react";
import { useState } from "react";

import { Section } from "@/components/frame/PageFrame";
import { HoldingDrilldown, type DrilldownKind } from "@/containers/Farm/components/HoldingDrilldown";
import { useT } from "@/lib/i18n/createDict";

import { MODULE_STRINGS } from "../data/translations";

/** The detailed holding records of the Farm page's deep dive, opened from a module page where they fit. */
export function HoldingRecords({ kind }: { kind: DrilldownKind }) {
  const t = useT(MODULE_STRINGS);
  const [open, setOpen] = useState(false);
  return open ? (
    <HoldingDrilldown kind={kind} onClose={() => setOpen(false)} />
  ) : (
    <Section
      icon={ClipboardList}
      title={t("holdingRecordsTitle")}
      caption={t("holdingRecordsCaption")}
      actions={
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid={`holding-records-${kind}`}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-green-d hover:bg-[#f4f7f6]"
        >
          {t("holdingRecordsOpen")}
        </button>
      }
    />
  );
}
