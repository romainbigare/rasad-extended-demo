import { CloudSun } from "lucide-react";
import { useAuth } from "@shared/auth/AuthContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { useT } from "@/lib/i18n/createDict";
import { useCurrentWeather } from "@/lib/weather/useFarmWeather";
import { unitSystem } from "@/lib/weather/format";

import { STRINGS } from "../../data/translations";
import { CurrentConditions } from "./CurrentConditions";
import { LastUpdated } from "./LastUpdated";

export function WeatherSection({ farmId }: { farmId: number | null }) {
  const t = useT(STRINGS);
  const auth = useAuth();
  const system = unitSystem(auth?.user?.unit);

  const current = useCurrentWeather(farmId);

  return (
    <Card className="p-4" testId="mon-weather">
      <CardHeader
        size="lg"
        icon={CloudSun}
        title={t("weatherTitle")}
        subtitle={t("weatherSubtitle")}
        actions={farmId !== null ? <LastUpdated at={current.data?.last_updated} /> : undefined}
      />

      {farmId === null ? (
        <p className="m-0 text-xs text-muted">{t("weatherSelectFarm")}</p>
      ) : (
        <CurrentConditions query={current} system={system} />
      )}
    </Card>
  );
}
