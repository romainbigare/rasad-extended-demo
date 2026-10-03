import { Fragment } from "react";

import { cx } from "@/components/ui/cx";
import { useT } from "@/lib/i18n/createDict";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { IER_BANDS, IER_SUBSIDY_LINE, displayIer } from "@/lib/scores";

import { FRAME_STRINGS } from "./translations";

/**
 * The irrigation efficiency scale (lib/scores.ts) in a small space: the five bands side by side from 0 to 100,
 * the subsidy line marked at 65, and under it one line naming each band with its range. With `score`, a marker
 * shows where one farm stands. The bar is a number line, so it keeps left-to-right order in Arabic too.
 */
export function ScoreScale({ score, testId = "score-scale" }: { score?: number | null; testId?: string }) {
  const t = useT(FRAME_STRINGS);
  const { language } = useLanguage();
  // Worst to best, each band running from its own minimum to the next band's (the last to 100).
  const ascending = [...IER_BANDS].reverse();
  // Band, position and label all use the whole number that is printed.
  const own = displayIer(score, 0);
  const shown = own === null ? null : own.value;
  /** "<50" for the lowest band, "90+" for the highest, "50–64" between. */
  const range = (i: number) => {
    const band = ascending[i];
    if (i === 0) return `<${ascending[1].min}`;
    if (i === ascending.length - 1) return `${band.min}+`;
    return `${band.min}–${band.max}`;
  };

  return (
    <div data-testid={testId}>
      <div dir="ltr" role="img" aria-label={t("scaleLabel")} className={cx("relative pt-6", shown !== null && "pb-6")}>
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {ascending.map((band, i) => {
            const end = ascending[i + 1]?.min ?? 100;
            return <div key={band.band} style={{ width: `${end - band.min}%`, background: band.color }} />;
          })}
        </div>
        <div className="absolute top-0 -translate-x-1/2 text-xs font-medium" style={{ left: `${IER_SUBSIDY_LINE}%` }}>
          <span className="whitespace-nowrap">{t("scaleSubsidyLine").replace("{line}", String(IER_SUBSIDY_LINE))}</span>
          <span aria-hidden className="mx-auto block h-2.5 w-px bg-ink" />
        </div>
        {shown !== null && own && (
          <div className="absolute bottom-0 -translate-x-1/2 text-xs font-medium" style={{ left: `${Math.min(100, Math.max(0, shown))}%` }}>
            <span aria-hidden className="mx-auto block h-2 w-px" style={{ background: own.info.text }} />
            <span className="whitespace-nowrap" style={{ color: own.info.text }}>
              {t("scaleThisFarm").replace("{score}", String(shown))}
            </span>
          </div>
        )}
      </div>
      <p className="m-0 mt-2 text-xs leading-relaxed text-muted" data-testid="score-scale-key">
        {ascending.map((band, i) => (
          <Fragment key={band.band}>
            {i > 0 && " · "}
            <span className="whitespace-nowrap">
              <span className="font-medium text-ink">{band[language]}</span> <span dir="ltr">{range(i)}</span>
            </span>
          </Fragment>
        ))}
      </p>
    </div>
  );
}
