import type { ReactNode } from "react";

/** Line icons for the Reports page (24px grid, drawn with currentColor). */
export type ReportIconName = "document" | "download" | "layers" | "farm" | "building" | "palm" | "sprout" | "droplets" | "search" | "pin";

const PATHS: Record<ReportIconName, ReactNode> = {
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h6M9 9h1" />
    </>
  ),
  download: <path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" />,
  layers: <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" />,
  // Warehouse / barn: the farm holding
  farm: <path d="M3 21V9l9-5 9 5v12M7 21v-8h10v8M7 17h10" />,
  building: <path d="M4 21V9l6-3v3l6-3v3l4-2v14H4Zm4-5h1m3 0h1m3 0h1M8 12h1m3 0h1m3 0h1" />,
  palm: (
    <path d="M12 21v-9m0 0c-1.5-3-4.5-4-8-3 1.5 1 3 2 4 4m4-1c1.5-3 4.5-4 8-3-1.5 1-3 2-4 4m-4-1c-.5-3-2.5-5-5-6m5 6c.5-3 2.5-5 5-6M8 21h8" />
  ),
  sprout: <path d="M7 20h10M12 20v-8m0 0C12 8 9 6 5 6c0 4 3 6 7 6Zm0 0c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5Z" />,
  droplets: (
    <path d="M7 16.3c2.2 0 4-1.8 4-4 0-2.3-2-4-4-7-2 3-4 4.7-4 7 0 2.2 1.8 4 4 4ZM12.6 6.5A11 11 0 0 0 14 4c2 3 5 5.3 5 8.6a5 5 0 0 1-9 3" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
};

export function ReportSvg({ name, size = 16, className }: { name: ReportIconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
