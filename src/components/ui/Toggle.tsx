import type { ReactNode } from "react";

import { cx } from "./cx";

interface ToggleRowProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  testId?: string;
  disabled?: boolean;
  /** Shown as the row's title (tooltip) when disabled. */
  disabledReason?: string;
  /** Optional small icon before the label (the map's layer rows). */
  icon?: ReactNode;
}

/**
 * A plain layer row: muted icon, name and an optional one-line description at the
 * start, the switch at the end (mirrors in RTL). The switch alone shows on/off -
 * the row has no active-state styling. Stack rows in a `divide-y divide-line` list.
 * Whole row is the hit target.
 */
export function ToggleRow({ checked, onChange, label, description, testId, disabled, disabledReason, icon }: ToggleRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={cx(
        "flex w-full items-center justify-between gap-3 rounded-md py-1.5 text-start transition-colors hover:bg-[#f4f7f6]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-green-d",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span aria-hidden className="flex-none text-muted">
            {icon}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-ink">{label}</span>
          {description && <span className="block truncate text-[11px] leading-snug text-muted">{description}</span>}
        </span>
      </span>
      <SwitchKnob checked={checked} />
    </button>
  );
}

/** The on/off switch drawing on its own. Decorative: the row is the control. */
function SwitchKnob({ checked }: { checked: boolean }) {
  return (
    <span aria-hidden className={cx("relative h-[19px] w-[34px] flex-none rounded-full transition-colors", checked ? "bg-green" : "bg-[#d7dddb]")}>
      {/* start-*: the knob slides toward the reading end in both EN and AR. */}
      <span className={cx("absolute top-0.5 h-[15px] w-[15px] rounded-full bg-white shadow-sm transition-all", checked ? "start-[17px]" : "start-0.5")} />
    </span>
  );
}
