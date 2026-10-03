import { Montserrat } from "next/font/google";

export const sansFont = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

/** For canvas text (OpenLayers labels), which can't use the CSS variable: the loaded font's real family name. */
export const CANVAS_FONT_FAMILY = `${sansFont.style.fontFamily}, system-ui, sans-serif`;
