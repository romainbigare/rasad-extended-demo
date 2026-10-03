export const WEATHER_ENDPOINTS = {
  CURRENT: (farmId: string | number) => `/api/v1/?farm_id=${farmId}`,
  // Either level, but exactly one -- passing both or neither 400s.
  DAY_FORECAST: (
    id: { farmId: string | number } | { fieldId: string | number },
  ) =>
    "farmId" in id
      ? `/api/v1/day-forecast?farm_id=${id.farmId}`
      : `/api/v1/day-forecast?field_id=${id.fieldId}`,
  SOIL_WATER_CONTENT: (farmId: string | number) =>
    `/api/v1/soil-water-content?farm_id=${farmId}`,
  // Either level, but exactly one (same convention as day-forecast). farm_id
  // serves the Farm Monitoring "all fields" view, which has no single field.
  MINUTECAST: (
    id: { farmId: string | number } | { fieldId: string | number },
  ) =>
    "farmId" in id
      ? `/api/v1/minutecast?farm_id=${id.farmId}`
      : `/api/v1/minutecast?field_id=${id.fieldId}`,
} as const;

export type CurrentWeatherData = {
  temperature_c: number;
  temperature_f: number;
  humidity: number;
  pressure_hpa: number;
  pressure_inhg: number;
  t_dew_c: number;
  t_dew_f: number;
  vpd_kpa: number;
  vpd_inhg: number;
  unit: string;
  "uv index": number;
  wind_speed_mps: number;
  wind_speed_mph: number;
  wind_deg: number;
  clouds: number;
  rain_mm: number;
  rain_in: number;
  last_updated: string;
  type: string;
  current_rain_beta_mm: number;
  current_rain_beta_in: number;
  soil_moisture_deficit_mm?: number | null;
  soil_moisture_0_7_cm?: number | null;
  soil_moisture_7_28_cm?: number | null;
  soil_moisture_28_100_cm?: number | null;
  soil_moisture_100_289_cm?: number | null;
  soil_temperature_0_7_cm?: number | null;
  soil_temperature_7_28_cm?: number | null;
  soil_temperature_54_cm?: number | null;
  soil_temperature_100_289_cm?: number | null;
};

export type DayForecastPoint = {
  temp: number;
  pressure: number;
  humidity: number;
  wind_speed: number;
  rain: number;
  datetime: string;
};

export type SoilWaterContentData = {
  soil_moisture_deficit_mm: number | null;
  volumetric_soil_water_5cm_m3m3: number | null;
  volumetric_soil_water_15cm_m3m3: number | null;
  volumetric_soil_water_50cm_m3m3: number | null;
  volumetric_soil_water_150cm_m3m3: number | null;
  soil_temp_5cm_c: number | null;
  soil_temp_15cm_c: number | null;
  soil_temp_50cm_c: number | null;
  soil_temp_150cm_c: number | null;
  last_updated: string | null;
  stale: boolean;
};

export type MinuteCastData = {
  Summary: { Phrase: string; Type: string | null; TypeId: number };
  Summaries: Array<{
    StartMinute: number;
    EndMinute: number;
    CountMinute: number;
    MinuteText: string;
    Type: string | null;
    TypeId: number;
  }>;
  Link: string;
  MobileLink: string;
};
