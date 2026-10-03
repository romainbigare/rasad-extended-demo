import type { ParsedUrlQuery } from "querystring";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import { MapTabShell } from "@/components/map/MapTabShell";
import { num, one } from "@/components/map/mapTab";
import { FieldModelProvider, useFieldModel } from "@/lib/farm/FieldModelContext";
import { useFarmList } from "@/lib/farm/useFarmList";
import { useT } from "@/lib/i18n/createDict";
import { useRegion } from "@/lib/region/RegionContext";

import { fieldModelFromQuery, IndexMapSection, monitoringMapTabFromQuery } from "./components/IndexMapSection";
import { STRINGS } from "./data/translations";

/** Applies the field model carried in the URL once - a new tab doesn't share the page's per-tab pick. */
function ApplyFieldModel({ id, children }: { id: number | null; children: ReactNode }) {
  const { setFieldModelVersionId } = useFieldModel();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    setFieldModelVersionId(id);
  }, [id, setFieldModelVersionId]);
  return <>{children}</>;
}

function MonitoringMap({ query }: { query: ParsedUrlQuery }) {
  const farms = useFarmList();
  const { zoneId } = useRegion();
  const [farmId, setFarmId] = useState<number | null>(num(one(query.farm)));
  const initial = useMemo(() => monitoringMapTabFromQuery(query), [query]);

  /** The region's farms, plus the farm the tab was opened on if it's outside the region. */
  const options = useMemo(() => {
    const regionFarms = farms.data?.filter((f) => zoneId === null || f.zone_id === zoneId);
    if (!regionFarms) return undefined;
    const open = farms.data?.find((f) => f.id === farmId);
    return open && !regionFarms.some((f) => f.id === open.id) ? [open, ...regionFarms] : regionFarms;
  }, [farms.data, zoneId, farmId]);

  // No farm in the URL: the region's first farm, as on the page.
  useEffect(() => {
    if (farmId === null && options?.[0]) setFarmId(options[0].id);
  }, [farmId, options]);

  return (
    <IndexMapSection
      farms={options}
      farmId={farmId}
      onSelectFarm={setFarmId}
      // No Field Parcels table / field detail in this tab - field clicks have nothing to open.
      onSelectField={() => undefined}
      fullPage
      initial={initial}
    />
  );
}

/**
 * The Farm Monitoring map (farm picker, index, map, satellite passes) on its own, filling
 * the tab - where the map's expand button opens it. Starts at the farm, field model,
 * overlay / HRI, index, region and position it was opened from.
 */
export default function FarmMonitoringMapTab() {
  const t = useT(STRINGS);
  return (
    <MapTabShell title={t("indexMapTitle")}>
      {(query) => (
        <FieldModelProvider>
          <ApplyFieldModel id={fieldModelFromQuery(query)}>
            <MonitoringMap query={query} />
          </ApplyFieldModel>
        </FieldModelProvider>
      )}
    </MapTabShell>
  );
}
