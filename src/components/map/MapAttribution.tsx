import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import type { BasemapAttribution } from "./useOlMap";

export function MapAttribution({ attribution }: { attribution: BasemapAttribution }) {
  const { language } = useLanguage();
  return (
    <div
      data-testid="map-attribution"
      className="pointer-events-none absolute bottom-1 left-1/2 z-10 flex max-w-[70%] -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded bg-black/35 px-1.5 py-px text-[11px] leading-tight text-white"
    >
      {attribution.unavailable ? (
        <span>{t("satelliteUnavailable", language)}</span>
      ) : attribution.esri ? (
        <span>Tiles © Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community</span>
      ) : (
        <>
          <b className="font-bold tracking-tight">Google</b>
          {attribution.copyright ? <span className="truncate">{attribution.copyright}</span> : <span>©</span>}
        </>
      )}
    </div>
  );
}
