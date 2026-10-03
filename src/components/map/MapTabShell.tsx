import Head from "next/head";
import { useRouter } from "next/router";
import type { ParsedUrlQuery } from "querystring";
import { type ReactNode, useEffect, useRef } from "react";

import { AuthGuard } from "@/components/AppShell/AuthGuard";
import { FullPageLoader } from "@/components/ui/States";
import { RegionProvider, useRegion } from "@/lib/region/RegionContext";

import { num, one } from "./mapTab";

/** Applies the region carried in the URL once - a new tab doesn't share the page's per-tab region pick. */
function ApplyRegion({ zoneId, children }: { zoneId: number | null; children: ReactNode }) {
  const { setZoneId } = useRegion();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    setZoneId(zoneId);
  }, [zoneId, setZoneId]);
  return <>{children}</>;
}

/**
 * The frame for a map opened in its own tab (the maps' expand button): signed-in only,
 * the region from the URL, no sidebar / top bar so the map gets the whole screen.
 * `children` gets the URL query once the router has read it (static export).
 */
export function MapTabShell({ title, children }: { title: string; children: (query: ParsedUrlQuery) => ReactNode }) {
  const router = useRouter();
  return (
    <AuthGuard>
      <RegionProvider>
        <Head>
          <title>{`${title} · ADAFSA`}</title>
        </Head>
        {router.isReady ? (
          <ApplyRegion zoneId={num(one(router.query.zone))}>
            <main className="min-h-screen bg-bg">{children(router.query)}</main>
          </ApplyRegion>
        ) : (
          <FullPageLoader />
        )}
      </RegionProvider>
    </AuthGuard>
  );
}
