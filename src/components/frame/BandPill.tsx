import { cx } from "@/components/ui/cx";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ierInfo } from "@/lib/scores";

/**
 * A score's band (Excellent ... Critical) as a status pill in the shared colours (lib/scores.ts), at
 * 12px. Nothing without a score. Pills are for status only: a band is a judgement.
 */
export function BandPill({ score, className }: { score: number | null | undefined; className?: string }) {
  const { language } = useLanguage();
  const info = ierInfo(score);
  if (info === null) return null;
  return (
    <span
      className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", className)}
      style={{ background: info.tint, color: info.text }}
    >
      {info[language]}
    </span>
  );
}

/** A neutral status pill in one of the status tones (a finding's ACT / WATCH, "Below average"). */
export function StatusPill({ tone, children, className }: { tone: "act" | "watch" | "info"; children: React.ReactNode; className?: string }) {
  const tones = {
    act: "bg-red-l text-red",
    watch: "bg-orange-l text-orange-d",
    info: "bg-slate-l text-slate",
  } as const;
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
