import { useQuery } from "react-query";

import type { RbacRequestError } from "@shared/network/rbacRequest";
import { rbacRequest } from "@shared/network/rbacRequest";
import {
  WEATHER_ENDPOINTS,
  type CurrentWeatherData,
  type DayForecastPoint,
  type MinuteCastData,
  type SoilWaterContentData,
} from "@shared/weather/endpoints";

const STALE_MS = 5 * 60 * 1000;

async function get<T>(url: string): Promise<T> {
  const result = await rbacRequest<T>(url, "GET", undefined, undefined, { silent: true });
  return result.data;
}

export function useCurrentWeather(farmId: number | null) {
  return useQuery<CurrentWeatherData, RbacRequestError>(
    ["weather-service", "current", farmId],
    () => get<CurrentWeatherData>(WEATHER_ENDPOINTS.CURRENT(farmId as number)),
    { enabled: farmId !== null, staleTime: STALE_MS, retry: false },
  );
}

export function useSoilWaterContent(farmId: number | null) {
  return useQuery<SoilWaterContentData, RbacRequestError>(
    ["weather-service", "soil-water-content", farmId],
    () => get<SoilWaterContentData>(WEATHER_ENDPOINTS.SOIL_WATER_CONTENT(farmId as number)),
    { enabled: farmId !== null, staleTime: STALE_MS, retry: false },
  );
}

export function useDayForecast(farmId: number | null) {
  return useQuery<DayForecastPoint[], RbacRequestError>(
    ["weather-service", "day-forecast", farmId],
    () => get<DayForecastPoint[]>(WEATHER_ENDPOINTS.DAY_FORECAST({ farmId: farmId as number })),
    { enabled: farmId !== null, staleTime: STALE_MS, retry: false },
  );
}

export function useMinuteCast(farmId: number | null) {
  return useQuery<MinuteCastData, RbacRequestError>(
    ["weather-service", "minutecast", farmId],
    () => get<MinuteCastData>(WEATHER_ENDPOINTS.MINUTECAST({ farmId: farmId as number })),
    { enabled: farmId !== null, staleTime: STALE_MS, retry: false },
  );
}