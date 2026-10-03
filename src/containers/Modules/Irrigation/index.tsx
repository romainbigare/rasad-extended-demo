import { AppShell } from "@/components/AppShell/AppShell";
import { useModuleFrame } from "../useModuleFrame";
import { IrrigationPage } from "./components/IrrigationPage";

/** Irrigation Efficiency: the farms' scores against the subsidy line, on one page. */
export default function IrrigationEfficiency() {
  const frame = useModuleFrame("/modules/irrigation");
  return (
    <AppShell title={frame.title}>
      <IrrigationPage frame={frame} />
    </AppShell>
  );
}
