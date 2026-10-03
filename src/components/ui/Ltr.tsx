import type { ReactNode } from "react";

/**
 * Keeps a number-with-sign / unit / phone number in left-to-right order inside
 * Arabic text - without it the bidi rules show "+971 2 816 5000" as
 * "5000 816 2 971+" and "680 / 510" as "510 / 680". No visible change in English.
 */
export function Ltr({ children }: { children: ReactNode }) {
  return (
    <bdi dir="ltr" className="whitespace-nowrap">
      {children}
    </bdi>
  );
}
