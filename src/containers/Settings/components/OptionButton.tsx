import type { ReactNode } from "react";

import { cx } from "@/components/ui/cx";

export function OptionButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "rounded-lg border p-3 text-xs font-bold text-ink transition-all disabled:cursor-not-allowed disabled:opacity-60",
        selected ? "border-[#4FB840] bg-[#E4F8F5]" : "border-line bg-[#F4F7F6] hover:bg-panel",
      )}
    >
      {children}
    </button>
  );
}
