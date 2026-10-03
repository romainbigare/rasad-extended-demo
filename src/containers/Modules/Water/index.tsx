import { AppShell } from "@/components/AppShell/AppShell";
import { useModuleFrame } from "../useModuleFrame";
import { WaterPage } from "./components/WaterPage";

/** Crop Water Calculator: the calculated demand, the farms above their allocation, and each farm's monthly demand, on one page. */
export default function CropWaterCalculator() {
  const frame = useModuleFrame("/modules/water");
  return (
    <AppShell title={frame.title}>
      <WaterPage frame={frame} />
    </AppShell>
  );
}
