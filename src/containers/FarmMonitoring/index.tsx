import { useRouter } from "next/router";
import { useEffect, useMemo, useRef } from "react";

import { AppShell } from "@/components/AppShell/AppShell";
import { PageFrame, useActiveTab } from "@/components/frame/PageFrame";
import { FieldModelProvider } from "@/lib/farm/FieldModelContext";
import { replaceQuery } from "@/lib/filters/replaceQuery";
import { useT } from "@/lib/i18n/createDict";
import { useFarmList } from "@/lib/farm/useFarmList";
import { useRegion } from "@/lib/region/RegionContext";

import { CheckTab } from "./components/CheckTab";
import { MonitoringHeader } from "./components/MonitoringHeader";
import { ProfileTab } from "./components/ProfileTab";
import { SatelliteTab } from "./components/SatelliteTab";
import { STRINGS } from "./data/translations";
import { useFarmFindings } from "./hooks/useFarmFindings";
import { useSelectedFarm } from "./hooks/useSelectedFarm";

export default function FarmMonitoring() {
  const t = useT(STRINGS);
  return (
    <AppShell title={t("pageTitle")}>
      {/* The field-model pick (header) drives the field count, Field Parcels table and map. */}
      <FieldModelProvider>
        <FarmMonitoringContent />
      </FieldModelProvider>
    </AppShell>
  );
}

/** The page's blocks; inside the AppShell so the region filter is in scope. */
function FarmMonitoringContent() {
  const t = useT(STRINGS);
  const router = useRouter();
  const farms = useFarmList();
  const { zoneId } = useRegion();
  const { farmId, fieldId, setFarmId, setFieldId, queryRead } = useSelectedFarm();
  const farmUid = farms.data?.find((f) => f.id === farmId)?.uid ?? null;
  const { findings, isLoading: findingsLoading, hasError: findingsError } = useFarmFindings(farmId, farmUid);

  /** Farms in the top-bar region (all of them for the whole emirate). */
  const regionFarms = useMemo(
    () => farms.data?.filter((f) => zoneId === null || f.zone_id === zoneId),
    [farms.data, zoneId],
  );
  /** The pickers' options - plus the open farm if a link opened one outside the region. */
  const options = useMemo(() => {
    if (!regionFarms) return undefined;
    const open = farms.data?.find((f) => f.id === farmId);
    return open && !regionFarms.some((f) => f.id === open.id) ? [open, ...regionFarms] : regionFarms;
  }, [regionFarms, farms.data, farmId]);

  // First farm once the list loads; the region's first farm when the region
  // changes away from the open one. A deep link (?farm=) is kept on first load.
  const previousZone = useRef(zoneId);
  useEffect(() => {
    // Wait for the link's ?farm= to be read first, so a deep link (Reports' Action button) isn't replaced.
    if (!regionFarms || !queryRead) return;
    const zoneChanged = previousZone.current !== zoneId;
    previousZone.current = zoneId;
    const first = regionFarms[0];
    if (first && (farmId === null || (zoneChanged && !regionFarms.some((f) => f.id === farmId)))) setFarmId(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the region's farm list changes (or the link is read)
  }, [regionFarms, zoneId, queryRead]);

  const tabs = [
    { tab: "profile", label: t("viewProfile") },
    { tab: "check", label: t("viewCheck"), count: findingsLoading ? undefined : findings.length },
    { tab: "satellite", label: t("viewSatellite") },
  ];
  const active = useActiveTab(tabs, "view");

  // A link to one field (the search palette's) lands on the satellite view, where the field is.
  useEffect(() => {
    if (!queryRead || fieldId === null || router.query.view !== undefined) return;
    void replaceQuery(router, { view: "satellite" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the link has been read
  }, [queryRead]);

  return (
    <PageFrame
      title={t("pageTitle")}
      testId="farm-monitoring-page"
      tabs={tabs}
      tabParam="view"
      activeTab={active}
      lead={
        <MonitoringHeader
          farms={options}
          holdings={regionFarms?.length}
          farmId={farmId}
          onSelectFarm={setFarmId}
          onFieldModelChange={() => setFieldId(null)}
        />
      }
    >
      {active === "check" ? (
        <CheckTab farmId={farmId} findings={findings} isLoading={findingsLoading} hasError={findingsError} />
      ) : active === "satellite" ? (
        <SatelliteTab farms={options} farmId={farmId} fieldId={fieldId} onSelectFarm={setFarmId} onSelectField={setFieldId} />
      ) : (
        <ProfileTab farmId={farmId} farmUid={farmUid} />
      )}
    </PageFrame>
  );
}
