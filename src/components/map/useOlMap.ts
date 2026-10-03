import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { transformExtent } from "ol/proj";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import { BASEMAP, GOOGLE_MAPS_API_KEY } from "@/config/env";

import { fetchGoogleCopyright, getGoogleTileSession, type GoogleTileSession, googleTileUrl } from "./googleMapTiles";

/** Official tiles failing this many times in a row means the session lapsed - renew it once. */
const RENEW_AFTER_ERRORS = 8;

/** What the map's basemap credit line shows (see MapAttribution). */
export interface BasemapAttribution {
  /** True once the official Map Tiles API is serving the imagery. */
  official: boolean;
  /** Google's copyright text for the current view, e.g. "Map data ©2026 Google". */
  copyright: string | null;
  /** True when the satellite basemap can't load (no key, API off, billing, key refused). There is
   * deliberately no fallback tile source - only the licensed Map Tiles API is used. */
  unavailable: boolean;
  /** Demo build only: the imagery comes from Esri World Imagery. */
  esri?: boolean;
}

const ESRI_IMAGERY_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const PROJECTION = "EPSG:3857";
const UAE_EXTENT_4326 = [51.0, 22.4, 56.6, 26.6];
const FIT_PADDING = [24, 24, 24, 24];

function fitToExtent(map: OlMap, extent4326: readonly number[], duration = 0) {
  map.getView().fit(transformExtent(extent4326 as number[], "EPSG:4326", PROJECTION), {
    padding: FIT_PADDING,
    duration,
    size: map.getSize(),
  });
}

/**
 * A basemap (satellite/street toggle) + view, shared by every page's map.
 * `fitExtent4326` is the "home"/initial extent - defaults to the whole
 * emirate, override it (e.g. a single farm's bounding box) for a
 * single-holding view. `initialView` (EPSG:3857 center + zoom) starts the map
 * exactly there instead of fitting the extent - e.g. the Farm map reopened in a
 * new tab at the view it had; Home still fits the extent.
 */
export function useOlMap(
  containerRef: RefObject<HTMLDivElement>,
  fitExtent4326: readonly number[] = UAE_EXTENT_4326,
  initialView?: { center: [number, number]; zoom: number } | null,
) {
  const [map, setMap] = useState<OlMap | null>(null);
  const [attribution, setAttribution] = useState<BasemapAttribution>({ official: false, copyright: null, unavailable: false });
  const basemapsRef = useRef<{ satellite: TileLayer<XYZ>; street: TileLayer<OSM> } | null>(null);
  const fitExtentRef = useRef(fitExtent4326);
  fitExtentRef.current = fitExtent4326;
  // Read once, at creation - a later change of the prop mustn't move the map.
  const initialViewRef = useRef(initialView);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    const street = new TileLayer({ source: new OSM(), visible: false });
    // No source until the official Map Tiles API session exists (below) - no fallback tiles.
    const satellite = new TileLayer<XYZ>({});

    const instance = new OlMap({
      target,
      layers: [street, satellite],
      // No controls - the default Attribution control (the bottom-right
      // "i" that expands to "Imagery © Google") was the only one OL adds on
      // its own, and it's not wanted on any of this app's maps.
      controls: [],
      view: new View({ projection: PROJECTION, center: [0, 0], zoom: 2, minZoom: 5, maxZoom: 20 }),
    });
    // The initial fit needs the map's real pixel size. Right after creation the
    // container often hasn't been laid out yet (size 0 or undefined), so a fit
    // here silently did nothing and the view stayed at minZoom - the whole
    // Middle East instead of the UAE. Fit on the first real size instead.
    let initialFitDone = false;
    const fitOnceSized = () => {
      const size = instance.getSize();
      if (initialFitDone || !size || size[0] === 0 || size[1] === 0) return;
      initialFitDone = true;
      const start = initialViewRef.current;
      if (start) {
        instance.getView().setCenter(start.center);
        instance.getView().setZoom(start.zoom);
      } else {
        fitToExtent(instance, fitExtentRef.current);
      }
    };
    fitOnceSized();

    // OL measures its container once; re-measure when the layout (sidebar,
    // fullscreen, card reflow) changes without a window resize.
    const resizeObserver = new ResizeObserver(() => {
      instance.updateSize();
      fitOnceSized();
    });
    resizeObserver.observe(target);

    basemapsRef.current = { satellite, street };
    setMap(instance);

    return () => {
      resizeObserver.disconnect();
      instance.setTarget(undefined);
      basemapsRef.current = null;
      setMap(null);
    };
  }, [containerRef]);

  // Official Google Map Tiles API - the only satellite source: set it once a session exists, keep
  // the copyright line in step with the view, renew a lapsed session once. If it can't load, the
  // basemap stays empty and the credit line says so (no unlicensed fallback).
  useEffect(() => {
    const layer = basemapsRef.current?.satellite;
    const apiKey = GOOGLE_MAPS_API_KEY;
    if (!map || !layer) return;
    if (BASEMAP === "esri") {
      // Static demo: no key needed. Esri's terms require the credit line shown by MapAttribution.
      layer.setSource(new XYZ({ url: ESRI_IMAGERY_URL, maxZoom: 19, crossOrigin: "anonymous" }));
      setAttribution({ official: false, copyright: null, unavailable: false, esri: true });
      return;
    }
    const markUnavailable = () => {
      layer.setSource(null);
      setAttribution({ official: false, copyright: null, unavailable: true });
    };
    if (!apiKey) {
      markUnavailable();
      return;
    }
    let cancelled = false;
    let session: GoogleTileSession | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const updateCopyright = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const size = map.getSize();
        const zoom = map.getView().getZoom();
        if (!session || !size || zoom === undefined) return;
        const [west, south, east, north] = transformExtent(map.getView().calculateExtent(size), PROJECTION, "EPSG:4326");
        const copyright = await fetchGoogleCopyright(session, apiKey, { zoom, west, south, east, north });
        if (!cancelled) setAttribution({ official: true, copyright, unavailable: false });
      }, 400);
    };

    const applySession = (s: GoogleTileSession, renewed: boolean) => {
      session = s;
      const source = new XYZ({ url: googleTileUrl(s, apiKey), tileSize: s.tileSize, crossOrigin: "anonymous", maxZoom: 20 });
      let errors = 0;
      source.on("tileloadend", () => {
        errors = 0;
      });
      source.on("tileloaderror", () => {
        errors += 1;
        if (errors !== RENEW_AFTER_ERRORS) return;
        if (renewed) {
          // Renewing didn't help (key revoked, quota, billing) - say so rather than keep failing.
          session = null;
          if (!cancelled) markUnavailable();
          return;
        }
        void getGoogleTileSession(apiKey, { force: true }).then((fresh) => {
          if (cancelled) return;
          if (fresh) applySession(fresh, true);
          else {
            session = null;
            markUnavailable();
          }
        });
      });
      layer.setSource(source);
      if (!cancelled) setAttribution({ official: true, copyright: null, unavailable: false });
      updateCopyright();
    };

    void getGoogleTileSession(apiKey).then((s) => {
      if (cancelled) return;
      if (s) applySession(s, false);
      else markUnavailable();
    });
    map.on("moveend", updateCopyright);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map.un("moveend", updateCopyright);
    };
  }, [map]);

  const fitToHome = useCallback(() => {
    if (map) fitToExtent(map, fitExtentRef.current, 600);
  }, [map]);

  const zoomBy = useCallback(
    (delta: number) => {
      const view = map?.getView();
      if (!view) return;
      view.animate({ zoom: (view.getZoom() ?? 6) + delta, duration: 200 });
    },
    [map],
  );

  const setSatellite = useCallback((on: boolean) => {
    basemapsRef.current?.satellite.setVisible(on);
    basemapsRef.current?.street.setVisible(!on);
  }, []);

  return { map, fitToHome, zoomBy, setSatellite, attribution };
}
