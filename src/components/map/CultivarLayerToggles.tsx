import { TreePalm } from "lucide-react";

import { ToggleRow } from "@/components/ui/Toggle";
import { type Dict, useT } from "@/lib/i18n/createDict";

import type { CultivarVersion } from "./wmsOverlays";

const STRINGS = {
  title: { en: "Date palm species", ar: "أنواع نخيل التمر" },
  hintOff: { en: "Species model", ar: "نموذج الأنواع" },
  hintOn: { en: "Species model {v}", ar: "نموذج الأنواع {v}" },
} satisfies Dict;

const SHOWN_VERSION: CultivarVersion = "v1";

export function CultivarLayerToggles({
  active,
  onChange,
}: {
  active: CultivarVersion | null;
  onChange: (next: CultivarVersion | null) => void;
}) {
  const t = useT(STRINGS);
  return (
    <ToggleRow
      testId="cultivar-layer-select"
      checked={active !== null}
      onChange={(on) => onChange(on ? SHOWN_VERSION : null)}
      icon={<TreePalm size={16} strokeWidth={1.8} />}
      label={t("title")}
      description={active ? t("hintOn").replace("{v}", active.toUpperCase()) : t("hintOff")}
    />
  );
}
