import { Head, Html, Main, NextScript } from "next/document";

import { sansFont } from "@/lib/fonts";
import { asset } from "@/lib/assetPath";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href={asset("/images/adafsa-logo.png")} type="image/png" />
      </Head>
      {/* The font variable on <body>, so overlays rendered into it (search palette, alerts) get the sans font too. */}
      <body className={sansFont.variable}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
