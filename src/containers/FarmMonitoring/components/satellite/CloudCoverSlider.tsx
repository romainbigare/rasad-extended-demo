import { useLanguage } from "@/lib/i18n/LanguageContext";

export function CloudCoverSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { language } = useLanguage();
  return (
    <div className="flex min-w-[220px] flex-1 flex-col gap-1" data-testid="cloud-cover-container">
      <div className="flex items-center justify-between text-[11px] font-semibold text-muted">
        <span>0%</span>
        <span>Cloud Cover</span>
        <span>100%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        data-testid="cloud-cover-slider"
        title={`${value}%`}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-line accent-teal"
        style={{
          // The browser mirrors a range input in Arabic - the fill has to follow it.
          background: `linear-gradient(to ${language === "ar" ? "left" : "right"}, rgb(var(--teal)) ${value}%, rgb(var(--line)) ${value}%)`,
        }}
      />
    </div>
  );
}
