import { cx } from "@/components/ui/cx";
import { useT } from "@/lib/i18n/createDict";

import { CADENCE_OPTIONS } from "../data/options";
import { STRINGS } from "../data/translations";

// CADENCE_OPTIONS stays plain English strings - it's the stable identity used
// for state and comparisons (`option === value`), not display text. Only the
// rendered label is translated, via this lookup, per the rule against
// putting t(...) inside a config array that also carries logic.
const CADENCE_LABEL_KEYS: Record<(typeof CADENCE_OPTIONS)[number], keyof typeof STRINGS> = {
  "Very High": "cadenceVeryHigh",
  High: "cadenceHigh",
  Moderate: "cadenceModerate",
  "Needs Improvement": "cadenceNeedsImprovement",
};

export function CadenceRatingGroup({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string) => void;
}) {
  const t = useT(STRINGS);

  return (
    <div>
      <div id="cadence-label" className="mb-1 block text-xs font-bold text-ink">
        {t("cadenceQuestionLabel")}
      </div>
      <div role="radiogroup" aria-labelledby="cadence-label" className="flex flex-wrap gap-2">
        {CADENCE_OPTIONS.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={cx(
                "rounded border px-3 py-1.5 text-xs text-ink transition touch:min-h-[44px]",
                active ? "border-green bg-green-l font-semibold text-green-d" : "border-line hover:border-[#bfe3b3] hover:bg-[#F4F7F6]",
              )}
            >
              {t(CADENCE_LABEL_KEYS[option])}
            </button>
          );
        })}
      </div>
    </div>
  );
}
