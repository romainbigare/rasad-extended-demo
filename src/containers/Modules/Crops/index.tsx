import { AppShell } from "@/components/AppShell/AppShell";
import { useModuleFrame } from "../useModuleFrame";
import { CropsPage } from "./components/CropsPage";

/** Crop Monitoring: what is planted and where, which farms grow it, and how much land lies fallow, on one page. */
export default function CropMonitoring() {
  const frame = useModuleFrame("/modules/crops");
  return (
    <AppShell title={frame.title}>
      <CropsPage frame={frame} />
    </AppShell>
  );
}
