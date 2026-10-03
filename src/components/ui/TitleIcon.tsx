import type { LucideIcon } from "lucide-react";

import { cx } from "./cx";

/**
 * The small icon before a main widget's title: 16px, line weight, muted - no tint, no colour, no square.
 * Used by CardHeader (`icon` prop) and by the few titles that are laid out by hand.
 */
export function TitleIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return <Icon aria-hidden focusable={false} width={16} height={16} strokeWidth={1.8} className={cx("flex-none text-muted", className)} />;
}
