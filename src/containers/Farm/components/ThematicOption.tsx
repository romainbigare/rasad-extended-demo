import { cx } from "@/components/ui/cx";

/**
 * One "Colour by" choice: a single-line radio row - name at the start, its class count (muted)
 * at the end. The native radio is visually hidden, so the group keeps its keyboard behaviour
 * (one tab stop, arrow keys) and the circle shows the focus ring.
 */
export function ThematicOption({
  label,
  hint,
  count,
  checked,
  onSelect,
  testId,
}: {
  label: string;
  /** Longer description, shown as the row's tooltip only. */
  hint?: string;
  count?: string;
  checked: boolean;
  onSelect: () => void;
  testId: string;
}) {
  return (
    <label
      data-testid={testId}
      title={hint}
      className="flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 text-xs transition-colors hover:bg-[#f4f7f6]"
    >
      <input type="radio" name="thematic-colour-by" checked={checked} onChange={onSelect} className="peer sr-only" />
      <span
        aria-hidden
        className={cx(
          "grid h-4 w-4 flex-none place-items-center rounded-full border-2 bg-white transition-colors",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-green-d",
          checked ? "border-green" : "border-[#c9d1ce]",
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-green" />}
      </span>
      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{label}</span>
      {count && <span className="flex-none text-[11px] text-muted">{count}</span>}
    </label>
  );
}
