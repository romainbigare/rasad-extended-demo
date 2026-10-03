import { AppShell } from "@/components/AppShell/AppShell";
import { useModuleFrame } from "../useModuleFrame";
import { LandPage } from "./components/LandPage";

/** Land Use & Structures: the land-use classes and domains, and the built structures, on one page. */
export default function LandUseStructures() {
  const frame = useModuleFrame("/modules/land");
  return (
    <AppShell title={frame.title}>
      <LandPage frame={frame} />
    </AppShell>
  );
}
