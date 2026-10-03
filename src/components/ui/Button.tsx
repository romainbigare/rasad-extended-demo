import type { ButtonHTMLAttributes } from "react";

import { cx } from "./cx";

export type ButtonVariant = "default" | "primary" | "green" | "danger" | "onDark";

const VARIANT: Record<ButtonVariant, string> = {
  default: "border-line bg-panel text-ink hover:bg-[#f4f7f6]",
  primary: "border-teal bg-teal text-white hover:bg-teal-2",
  green: "border-green bg-green text-white hover:brightness-95",
  danger: "border-[#f2b8b0] bg-red-l text-red hover:brightness-[0.98]",
  onDark: "border-teal-3 bg-teal-2 text-white hover:bg-teal-3",
};

const SIZE = {
  md: "px-3 py-[7px] text-xs",
  /** Small, quiet secondary action (e.g. the map panel's Clear all / Fit to selection). */
  sm: "px-2.5 py-1 text-[11px]",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof SIZE;
}

export function Button({ variant = "default", size = "md", className, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg border font-semibold transition touch:min-h-[44px]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-d",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SIZE[size],
        VARIANT[variant],
        className,
      )}
      {...rest}
    />
  );
}
