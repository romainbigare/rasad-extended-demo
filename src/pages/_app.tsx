import type { AppProps } from "next/app";
import Head from "next/head";
import { QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "ol/ol.css";
import "@/styles/globals.css";

import { DemoGate } from "@/demo/DemoGate";
import { AuthProvider } from "@shared/auth/AuthContext";
import { AutoTruncateTooltip } from "@/components/ui/AutoTruncateTooltip";
import { AreaUnitProvider } from "@/lib/area/AreaUnitContext";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { sansFont } from "@/lib/fonts";
import { queryClient } from "@/lib/queryClient";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${sansFont.variable} font-sans`}>
      <Head>
        <title>ADAFSA Agricultural Intelligence Platform</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <LanguageProvider>
        <DemoGate>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AreaUnitProvider>
                <Component {...pageProps} />
              </AreaUnitProvider>
            </AuthProvider>
          </QueryClientProvider>
        </DemoGate>
      </LanguageProvider>
      <ToastContainer position="top-right" newestOnTop />
      {/* Full text on hover for any "…"-truncated text, on every page */}
      <AutoTruncateTooltip />
    </div>
  );
}
