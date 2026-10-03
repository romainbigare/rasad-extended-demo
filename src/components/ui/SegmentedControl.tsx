import type { ReactNode } from "react";

import { cx } from "./cx";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Muted text after the label in normal weight, e.g. a count ("10") or an average ("72%"). */
  hint?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  /** "lg": the Farm page design's larger switch (15px text, more padding). */
  size?: "md" | "lg";
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  disabledReason,
  size = "md",
  className,
}: SegmentedControlProps<T>) {
  const lg = size === "lg";
  return (
    <div
      role="group"
      aria-label={label}
      title={disabled ? disabledReason : undefined}
      className={cx(
        "inline-flex flex-wrap gap-0.5 border border-line bg-[#fafbfb]",
        lg ? "rounded-xl p-1" : "rounded-[9px] p-[3px]",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cx(
              "whitespace-nowrap font-semibold transition",
              lg ? "rounded-lg px-4 py-2 text-xs touch:min-h-[44px]" : "rounded-[7px] px-3 py-1.5 text-xs touch:min-h-[44px]",
              active ? "bg-teal text-white" : "text-muted hover:text-ink",
              "disabled:cursor-not-allowed disabled:hover:text-muted",
            )}
          >
            {option.label}
            {option.hint !== undefined && option.hint !== null && (
              <span className={cx("ms-1.5 font-normal tabular-nums", active ? "text-white/70" : "text-muted")}>{option.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
