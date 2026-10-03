import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ierInfo } from "@/lib/scores";

import { cx } from "./cx";

/** An IER score's band as a small badge (Excellent ... Critical), in the shared colours; nothing without a score. */
export function IerBandBadge({ score, className }: { score: number | null | undefined; className?: string }) {
  const { language } = useLanguage();
  const info = ierInfo(score);
  if (info === null) return null;
  return (
    <span
      className={cx("inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold", className)}
      style={{ background: info.tint, color: info.text }}
    >
      {info[language]}
    </span>
  );
}
