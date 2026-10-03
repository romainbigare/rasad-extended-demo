import Head from "next/head";
import { type ReactNode, useEffect } from "react";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";
import { asset } from "@/lib/assetPath";

/** One is picked at random on every load/refresh. `tint` is the photo's own average
 * colour, painted under it - so while it downloads the panel looks like the photo,
 * never the plain teal. `ratio` is the photo's width / height. `x` / `y` (0-1) say
 * which side gives way when the panel crops it: 0 keeps the left / top edge, 0.5
 * crops both sides evenly. The brand panel and the "Powered by" line are pinned
 * onto the photo itself (see the section below), so they need a safe, always-visible
 * spot - hence x: 0 for that photo (only its right side is ever cropped). */
type LoginBackground = { src: string; tint: string; ratio: number; x: number; y: number; yWide?: number };
const LOGIN_BACKGROUNDS: ReadonlyArray<LoginBackground> = [
  {
    src: asset("/images/login/login-bg-palm-oasis.webp"),
    tint: "#7f7a54",
    ratio: 2400 / 1799,
    x: 0,
    y: 0.5,
    // Side-by-side layout (950px+): when a very wide screen crops top and bottom, lose mostly sky -
    // keeps the "Powered by" line near the photo's bottom on screen.
    yWide: 0.8,
  },
];

function pickLoginBackground(options: ReadonlyArray<LoginBackground>) {
  const style = document.documentElement.style;
  if (style.getPropertyValue("--login-bg")) return;
  const pick = options[Math.floor(Math.random() * options.length)];
  style.setProperty("--login-bg", "url(" + pick.src + ")");
  style.setProperty("--login-bg-tint", pick.tint);
  style.setProperty("--login-bg-ratio", String(pick.ratio));
  style.setProperty("--login-bg-x", String(pick.x));
  style.setProperty("--login-bg-y", String(pick.y));
  style.setProperty("--login-bg-y-wide", String(pick.yWide ?? pick.y));
}
const PICK_BACKGROUND_SCRIPT = `(${pickLoginBackground.toString()})(${JSON.stringify(LOGIN_BACKGROUNDS)})`;

/** The sign-in / sign-up page frame: the photo panel on the left (brand blurb, "Powered by"),
 * the ADAFSA logo and a form card slot on the right. Shared so both pages look the same. */
export function AuthSplitLayout({ title, children }: { title: string; children: ReactNode }) {
  const { language } = useLanguage();

  useEffect(() => pickLoginBackground(LOGIN_BACKGROUNDS), []);

  return (
      <>
      <Head>
        <title>{title}</title>
        {/* Start both photos downloading with the page itself, not after the JS runs -
         * whichever one is picked is then already (or nearly) in the cache. */}
        {LOGIN_BACKGROUNDS.map(({ src }) => (
          <link key={src} rel="preload" as="image" href={src} type={src.endsWith(".webp") ? "image/webp" : undefined} />
        ))}
        {/* eslint-disable-next-line react/no-danger -- a fixed, build-time string (no user input) */}
        <script dangerouslySetInnerHTML={{ __html: PICK_BACKGROUND_SCRIPT }} />
      </Head>
      <div className="flex min-h-screen flex-col min-[950px]:grid min-[950px]:grid-cols-[minmax(0,1fr)_minmax(400px,25%)]">
        {/* [container-type:size]: the photo layer below sizes itself from this panel (cqw / cqh).
         * Stacked layout (below 950px - phones, tablets, a zoomed-in browser): the banner takes the photo's
         * own shape, so the whole photo shows, uncropped. Side by side it fills the column (cropped to fit). */}
        <section className="relative overflow-hidden bg-teal text-[#e7f0ee] [aspect-ratio:var(--login-bg-ratio,1.333)] [container-type:size] min-[950px]:aspect-auto min-[950px]:h-auto">
          {/* The photo at its own shape, scaled to cover the panel (like background-size: cover) and
           * anchored by --login-bg-x / -y. Everything inside it is positioned in % of the photo and
           * sized from the photo's width (cqw), so the brand panel and the "Powered by" line stay on
           * the same spot of the photo - and scale with it - whatever the window size. */}
          <div
            className="login-photo absolute bg-[length:100%_100%]"
            style={{ backgroundColor: "var(--login-bg-tint)", backgroundImage: "var(--login-bg)" }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            {/* No wash over the whole photo - legibility comes from this one scoped backdrop
             * panel, sized to the text block only. Pinned 5% in / 36% down the photo. */}
            <div className="absolute left-[5%] top-[36%] w-fit max-w-[28em] rounded-[1em] bg-black/45 p-[1em] backdrop-blur-[2px] min-[950px]:p-[1.25em]">
              <div className="mb-[0.5em] flex items-center gap-[0.5em] text-[max(11px,0.75em)] font-bold tracking-[0.12em] text-onDark-green min-[950px]:mb-[1.33em]">
                {t("loginBadge", language)}
              </div>
              <h1 className="mb-0 mt-0 text-[max(22px,1.875em)] font-extrabold leading-tight text-white min-[950px]:mb-[0.33em] min-[950px]:text-[2.25em]">
                {t("brandLine", "en")}
              </h1>
              <p className="m-0 hidden text-[max(12px,0.875em)] text-onDark-sub min-[950px]:block">
                {t("loginTagline", language)}
              </p>
            </div>
            {/* Same dark backing as the brand panel. Pinned 5% in / 6% up from the photo's bottom. */}
            <div className="absolute bottom-[6%] left-[5%] w-fit rounded-[0.5em] bg-black/45 px-[0.75em] py-[0.4em] text-[max(11px,0.6875em)] text-onDark-sub backdrop-blur-[2px]">
              <b className="block text-onDark-green">Wafra Greentech</b>
              <span className="block">
                {t("poweredBy", language)} <b className="text-white">Map My Crop</b>
              </span>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col items-center justify-center bg-panel p-4 sm:p-10">
          <div className="mb-5 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static
             * export + images.unoptimized:true (next.config.js), same as the
             * sidebar's use of this asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images (see above) */}
            <img
              src={asset("/images/adafsa-logo-full.png")}
              alt={t("adafsaEmblemAlt", language)}
              className="mx-auto h-auto w-[300px] max-w-full"
            />
            <div className="mt-2 text-[10px] font-bold tracking-[0.03em] text-green-d">
              {t("brandLine", "en")}
            </div>
          </div>
          {children}
        </section>
      </div>
    </>
  );
}
