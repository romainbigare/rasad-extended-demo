import { useRouter } from "next/router";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { RegionProvider, useRegion } from "@/lib/region/RegionContext";

import { replaceQuery } from "./replaceQuery";

/**
 * The region filter in the top bar (RegionContext, unchanged), kept in the page link (`?region=2`) so a
 * link carries it. The region also mirrors itself to sessionStorage (RegionContext); the link wins when both exist.
 */
const REGION_PARAM = "region";

const one = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

/** The zone a `?region=` value names; an empty or unreadable value means all regions (null), and no value at all is undefined. */
function zoneFromLink(value: string | undefined): number | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === "") return null;
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

/** Reads and writes the `?region=` param; must sit inside RegionProvider. */
function FilterSync({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { zoneId, setZoneId } = useRegion();
  // False until the link has been read once: before that the state is only what storage remembered.
  const [linked, setLinked] = useState(false);
  // A write of the state into the link is under way: an address change seen meanwhile is its own earlier step, not a new choice.
  const writing = useRef(false);

  // The link wins over storage: read when the router has the real query (it is empty on the first render of a
  // statically exported page) and again whenever the address changes (browser Back). A link without the key
  // leaves the state as it is - the effect below writes it into the link.
  useEffect(() => {
    if (!router.isReady) return;
    if (writing.current) return;
    const linkZone = zoneFromLink(one(router.query[REGION_PARAM]));
    if (linkZone !== undefined && linkZone !== zoneId) setZoneId(linkZone);
    setLinked(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reads the state as it is when the address changes
  }, [router.isReady, router.asPath]);

  // State -> link. Only the region key is set or removed, on top of the latest address.
  useEffect(() => {
    if (!linked) return;
    writing.current = true;
    void replaceQuery(router, { [REGION_PARAM]: zoneId === null ? null : String(zoneId) }).finally(() => {
      writing.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router is a stable singleton
  }, [linked, zoneId]);

  return <>{children}</>;
}

/** Wraps the app shell: the region provider, kept in the page link. */
export function FilterProvider({ children }: { children: ReactNode }) {
  return (
    <RegionProvider>
      <FilterSync>{children}</FilterSync>
    </RegionProvider>
  );
}

/**
 * Builds a link to another page that carries the region choice (`?region=`), so the next page opens
 * on the same selection. `href("/modules/water?tab=budget")` keeps the path's own query.
 */
export function useFilterHref(): (path: string) => string {
  const { zoneId } = useRegion();
  return useCallback(
    (path: string) => {
      const [base, query = ""] = path.split("?");
      const params = new URLSearchParams(query);
      if (zoneId !== null) params.set(REGION_PARAM, String(zoneId));
      const text = params.toString();
      return text ? `${base}?${text}` : base;
    },
    [zoneId],
  );
}
