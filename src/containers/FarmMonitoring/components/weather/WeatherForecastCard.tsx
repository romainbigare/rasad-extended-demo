import { CalendarDays } from "lucide-react";
import { useAuth } from "@shared/auth/AuthContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n/createDict";
import { useDayForecast } from "@/lib/weather/useFarmWeather";
import { unitSystem } from "@/lib/weather/format";

import { STRINGS } from "../../data/translations";
import { DayForecastChart } from "./DayForecastChart";
import { LastUpdated } from "./LastUpdated";

export function WeatherForecastCard({ farmId }: { farmId: number | null }) {
  const t = useT(STRINGS);
  const auth = useAuth();
  const system = unitSystem(auth?.user?.unit);
  const forecast = useDayForecast(farmId);

  return (
    <Card className="p-4" testId="mon-weather-forecast">
      <CardHeader
        size="lg"
        icon={CalendarDays}
        title={t("weatherForecastTitle")}
        subtitle={t("weatherForecastSubtitle")}
        actions={farmId !== null && forecast.data ? <LastUpdated at={forecast.dataUpdatedAt} /> : undefined}
      />
      {farmId === null ? (
        <p className="m-0 text-xs text-muted">{t("weatherSelectFarm")}</p>
      ) : (
        <DayForecastChart query={forecast} system={system} />
      )}
    </Card>
  );
}
