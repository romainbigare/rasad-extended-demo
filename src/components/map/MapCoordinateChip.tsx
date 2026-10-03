import type OlMap from "ol/Map";
import type MapBrowserEvent from "ol/MapBrowserEvent";
import { toLonLat } from "ol/proj";
import { useEffect, useState } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

function dms(value: number, pos: string, neg: string): string {
  const hemi = value < 0 ? neg : pos;
  const abs = Math.abs(value);
  let deg = Math.floor(abs);
  let min = Math.floor((abs - deg) * 60);
  let sec = Math.round(((abs - deg) * 60 - min) * 60);
  if (sec === 60) {
    sec = 0;
    min += 1;
  }
  if (min === 60) {
    min = 0;
    deg += 1;
  }
  return `${deg}°${String(min).padStart(2, "0")}'${String(sec).padStart(2, "0")}"${hemi}`;
}

const formatLonLat = ([lon, lat]: number[]) => `${dms(lat, "N", "S")} ${dms(lon, "E", "W")}`;

export function MapCoordinateChip({ map, className }: { map: OlMap | null; className?: string }) {
  const { language } = useLanguage();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;
    const view = map.getView();
    let pointerOn = false;
    let frame = 0;
    const fromCenter = () => {
      const c = view.getCenter();
      if (c) setText(formatLonLat(toLonLat(c)));
    };
    const onMove = (e: MapBrowserEvent<PointerEvent>) => {
      pointerOn = true;
      const coord = e.coordinate;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setText(formatLonLat(toLonLat(coord)));
      });
    };
    const onMoveEnd = () => {
      if (!pointerOn) fromCenter();
    };
    const target = map.getTargetElement();
    const onLeave = () => {
      pointerOn = false;
      fromCenter();
    };
    fromCenter();
    map.on("pointermove", onMove);
    map.on("moveend", onMoveEnd);
    target?.addEventListener("mouseleave", onLeave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      map.un("pointermove", onMove);
      map.un("moveend", onMoveEnd);
      target?.removeEventListener("mouseleave", onLeave);
    };
  }, [map]);

  return (
    <div
      dir="ltr"
      data-testid="map-coordinate-chip"
      className={
        "pointer-events-none flex items-center gap-2 whitespace-nowrap rounded-md border border-line bg-white/95 px-3 py-1.5 font-mono text-xs font-semibold text-ink shadow-xs " +
        (className ?? "")
      }
    >
      <span className="tabular-nums">{text ?? "—"}</span>
      <span aria-hidden className="text-[#c9d1ce]">|</span>
      <span className="font-sans text-[11px] font-medium text-muted">{t("emirateAbuDhabi", language)}</span>
      <span aria-hidden className="text-[#c9d1ce]">·</span>
      <span className="font-sans text-[11px] font-medium text-muted">{t("emirateAlAin", language)}</span>
      <span aria-hidden className="text-[#c9d1ce]">·</span>
      <span className="font-sans text-[11px] font-medium text-muted">{t("emirateAlDhafra", language)}</span>
    </div>
  );
}
