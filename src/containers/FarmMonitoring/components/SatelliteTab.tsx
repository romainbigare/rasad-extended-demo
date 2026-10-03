import type { FarmServiceFarm } from "@shared/farm/endpoints";

import { FieldDetailPanel } from "./FieldDetailPanel";
import { FieldParcelsTable } from "./FieldParcelsTable";
import { IndexMapSection } from "./IndexMapSection";
import { SoilProfileCard } from "./weather/SoilProfileCard";
import { WeatherForecastCard } from "./weather/WeatherForecastCard";
import { WeatherSection } from "./weather/WeatherSection";

/** Satellite detail: the satellite strip with its indices and map, the field parcels, and the weather, forecast and soil. Nothing removed. */
export function SatelliteTab({
  farms,
  farmId,
  fieldId,
  onSelectFarm,
  onSelectField,
}: {
  farms: FarmServiceFarm[] | undefined;
  farmId: number | null;
  fieldId: number | null;
  onSelectFarm: (id: number) => void;
  onSelectField: (id: number | null) => void;
}) {
  return (
    <>
      <IndexMapSection farms={farms} farmId={farmId} onSelectFarm={onSelectFarm} onSelectField={onSelectField} />
      <FieldParcelsTable farmId={farmId} selectedFieldId={fieldId} onSelectField={onSelectField} />
      {fieldId !== null && <FieldDetailPanel farmId={farmId} fieldId={fieldId} onClose={() => onSelectField(null)} />}
      <WeatherSection farmId={farmId} />
      <WeatherForecastCard farmId={farmId} />
      <SoilProfileCard farmId={farmId} />
    </>
  );
}
