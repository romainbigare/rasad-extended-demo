import type { ReactNode } from "react";

import {
  CompressIcon,
  ExpandIcon,
  HomeViewIcon,
  MinusIcon,
  PlusIcon,
} from "@/components/AppShell/icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

function ToolButton({ label, onClick, lg, children }: { label: string; onClick: () => void; lg?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid place-items-center bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.15)] hover:bg-[#f4f7f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-d ${
        lg ? "h-10 w-10 rounded-[9px] touch:h-11 touch:w-11 [&_svg]:h-[18px] [&_svg]:w-[18px]" : "h-8 w-8 rounded-[7px] touch:h-11 touch:w-11"
      }`}
    >
      {children}
    </button>
  );
}

export function MapControls({
  onZoomIn,
  onZoomOut,
  onHome,
  homeLabelKey = "fitToEmirate",
  onFullscreen,
  isFullscreen,
  fullscreenSupported,
  fullscreenLabel,
  size = "md",
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Omit to hide the Home button. */
  onHome?: () => void;
  /** The Home button's tooltip: the emirate (default) or, on a single-farm map, the farm. */
  homeLabelKey?: "fitToEmirate" | "fitToFarm";
  onFullscreen: () => void;
  isFullscreen: boolean;
  fullscreenSupported: boolean;
  /** Replaces the full-screen button's label - e.g. when it opens the map in a new tab instead. */
  fullscreenLabel?: string;
  /** "lg": the Farm Monitoring design's larger buttons. */
  size?: "md" | "lg";
}) {
  const { language } = useLanguage();
  const lg = size === "lg";
  return (
    <div className={`absolute z-10 flex flex-col ${lg ? "right-4 top-4 gap-2" : "right-3 top-3 gap-1.5"}`} data-testid="map-controls">
      <ToolButton lg={lg} label={t("zoomIn", language)} onClick={onZoomIn}>
        <PlusIcon />
      </ToolButton>
      <ToolButton lg={lg} label={t("zoomOut", language)} onClick={onZoomOut}>
        <MinusIcon />
      </ToolButton>
      {onHome && (
        <ToolButton lg={lg} label={t(homeLabelKey, language)} onClick={onHome}>
          <HomeViewIcon />
        </ToolButton>
      )}
      {fullscreenSupported && (
        <ToolButton
          lg={lg}
          label={fullscreenLabel ?? (isFullscreen ? t("exitFullScreen", language) : t("fullScreen", language))}
          onClick={onFullscreen}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </ToolButton>
      )}
    </div>
  );
}
