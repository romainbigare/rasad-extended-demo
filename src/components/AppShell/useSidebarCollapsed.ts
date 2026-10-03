import { usePersistentCollapsed } from "@/lib/usePersistentCollapsed";

/** Desktop sidebar collapsed (icons only) or expanded, remembered in this browser. */
export function useSidebarCollapsed() {
  return usePersistentCollapsed("rasad.sidebarCollapsed");
}
