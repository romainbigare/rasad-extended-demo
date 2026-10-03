import { AppShell } from "@/components/AppShell/AppShell";
import { TreeModelProvider } from "@/lib/analytics/TreeModelContext";

import { useModuleFrame } from "../useModuleFrame";
import { TreesPage } from "./components/TreesPage";

/** Tree Monitoring: how many trees and of what kind, and how healthy the palms are, on one page. */
export default function TreeMonitoring() {
  const frame = useModuleFrame("/modules/trees");
  return (
    // The tree-model pick drives the tree numbers of the census and the species table.
    <AppShell title={frame.title}>
      <TreeModelProvider>
        <TreesPage frame={frame} />
      </TreeModelProvider>
    </AppShell>
  );
}
