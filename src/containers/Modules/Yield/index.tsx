import { AppShell } from "@/components/AppShell/AppShell";
import { useModuleFrame } from "../useModuleFrame";
import { YieldCalendarTab } from "./components/YieldCalendarTab";
import { YieldForecastTab } from "./components/YieldForecastTab";

/** Yield Optimisation: the forecast per farm (Yield forecast), and when crops are planted and harvested (Crop calendar). */
export default function YieldOptimisation() {
  const frame = useModuleFrame("/modules/yield");
  return <AppShell title={frame.title}>{frame.active === "calendar" ? <YieldCalendarTab frame={frame} /> : <YieldForecastTab frame={frame} />}</AppShell>;
}
