import type { CSSProperties, ReactNode } from "react";

import { cx } from "./cx";

export type BadgeTone = "green" | "blue" | "orange" | "red" | "slate";

const TONE: Record<BadgeTone, string> = {
  green: "bg-green-l text-green-d",
  blue: "bg-blue-l text-blue",
  orange: "bg-orange-l text-orange-d",
  red: "bg-red-l text-red",
  slate: "bg-slate-l text-slate",
};

export function Badge({
  tone = "slate",
  children,
  className,
  title,
  style,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  title?: string;
  /** For colours that are not one of the tones, e.g. an IER band's (lib/scores.ts). */
  style?: CSSProperties;
}) {
  return (
    <span
      title={title}
      style={style}
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
