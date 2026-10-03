import { MapTabShell } from "@/components/map/MapTabShell";
import { useT } from "@/lib/i18n/createDict";

import { FarmMapPanel } from "./components/FarmMapPanel";
import { STRINGS } from "./data/translations";
import { fromFarmMapTabQuery } from "./map/mapTabState";

/**
 * The GIS map card on its own, filling the tab - where the expand button of the
 * Emirate map opens it. Starts at the view it was opened from (farm, layers, thematic,
 * species version, region, position - see mapTabState).
 */
export default function FarmMapTab() {
  const t = useT(STRINGS);
  return (
    <MapTabShell title={t("mapCardTitle")}>
      {(query) => <FarmMapPanel fullPage initial={fromFarmMapTabQuery(query)} />}
    </MapTabShell>
  );
}
