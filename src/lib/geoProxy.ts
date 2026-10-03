import {
  ADAFSA_PRODUCT_NAME,
  RBAC_ENDPOINTS,
} from "lib/network/rbac/endpoints";
import {
  clearRbacTokens,
  getRbacAccessToken,
  getRbacRefreshToken,
  isRbacRememberedSession,
  setRbacTokens,
} from "lib/utils/auth/rbacToken";
import { toastWarning } from "lib/utils/toast";

export class GeoSessionExpiredError extends Error {
  constructor() {
    super("Geo session expired -- refresh failed or no refresh token stored");
    this.name = "GeoSessionExpiredError";
  }
}

// Fires once per page load, not once per failed request -- a single expired
// map pan can fire 20-40 requests that all hit this same condition (though
// refreshGeoAccessToken's single-flight already collapses the network calls
// to one, a fresh one fires on every *subsequent* request too, since a new
// pan after the session has died would otherwise re-trigger this on each
// one). Refreshing the page naturally resets this, matching the toast's own
// advice.
let sessionExpiredToastShown = false;

function notifyGeoSessionExpiredOnce(): void {
  if (sessionExpiredToastShown) return;
  sessionExpiredToastShown = true;
  toastWarning("Your map session has expired. Please refresh the page.");
}

const RBAC_BASE_URL = (
  process.env.NEXT_PUBLIC_RBAC_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

function baseUrl(): string {
  return RBAC_BASE_URL;
}

export type ProxySource = string | Record<string, unknown>;

function toParams(source: ProxySource): Record<string, unknown> {
  if (typeof source === "string") {
    const queryString = source.split("?")[1] ?? "";
    return Object.fromEntries(new URLSearchParams(queryString).entries());
  }
  return { ...source };
}

function proxyPath(params: Record<string, unknown>): "wms" | "wfs" {
  const service = String(
    params.SERVICE ?? params.service ?? "WMS",
  ).toUpperCase();
  return service === "WFS" ? "wfs" : "wms";
}

function proxyUrl(params: Record<string, unknown>): string {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();
  return `${baseUrl()}/api/geo/${proxyPath(params)}?${query}`;
}

let inFlightRefresh: Promise<string | null> | null = null;

async function refreshGeoAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refreshToken = getRbacRefreshToken();
    if (!refreshToken) return null;
    const rememberMe = isRbacRememberedSession();

    try {
      const response = await fetch(`${baseUrl()}${RBAC_ENDPOINTS.REFRESH}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: refreshToken,
          product: ADAFSA_PRODUCT_NAME,
        }),
      });

      if (!response.ok) {
        clearRbacTokens();
        return null;
      }

      const body = await response.json();
      const accessToken: string | undefined = body?.data?.access_token;
      const newRefreshToken: string | undefined = body?.data?.refresh_token;

      if (!accessToken || !newRefreshToken) {
        clearRbacTokens();
        return null;
      }

      setRbacTokens(accessToken, newRefreshToken, rememberMe);
      return accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

// How far ahead of real expiry to refresh, and how often to check. Proactive
// refreshing this way means a request should rarely, if ever, catch the
// token already expired and have to fall back to the reactive
// refresh-on-401 path in getFromProxy below (kept as a safety net, not
// replaced -- e.g. if this tab was backgrounded/throttled and missed a
// check, or the very first request after login races this timer).
const PROACTIVE_REFRESH_LEAD_MS = 60_000;
const PROACTIVE_REFRESH_CHECK_INTERVAL_MS = 20_000;

// Starts once per page load, does nothing if there's no token yet (not
// logged in) or after logout (token cleared) -- safe to just always be
// running rather than needing any other file to start/stop it alongside
// login/logout. Reuses refreshGeoAccessToken()'s own single-flight guard,
// so this can never race a reactive refresh triggered by a 401 at the same
// moment -- both paths await the same in-flight call.
if (typeof window !== "undefined") {
  setInterval(() => {
    const token = getRbacAccessToken();
    if (!token) return;
    const expiryMs = decodeJwtExpiryMs(token);
    if (expiryMs == null) return;
    if (expiryMs - Date.now() <= PROACTIVE_REFRESH_LEAD_MS) {
      refreshGeoAccessToken();
    }
  }, PROACTIVE_REFRESH_CHECK_INTERVAL_MS);
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFromProxy(
  params: Record<string, unknown>,
  attempt = 0,
  triedRefresh = false,
  signal?: AbortSignal,
): Promise<Response> {
  const accessToken = getRbacAccessToken();
  const response = await fetch(proxyUrl(params), {
    method: "GET",
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    signal,
  });

  if (response.ok) {
    return response;
  }

  if (response.status === 401 && !triedRefresh) {
    const refreshedAccessToken = await refreshGeoAccessToken();
    if (refreshedAccessToken) {
      return getFromProxy(params, attempt, true, signal);
    }
    notifyGeoSessionExpiredOnce();
    throw new GeoSessionExpiredError();
  }

  if (RETRYABLE_STATUSES.has(response.status) && attempt < MAX_RETRIES) {
    await delay(RETRY_BASE_DELAY_MS * 3 ** attempt);
    return getFromProxy(params, attempt + 1, triedRefresh, signal);
  }

  throw new Error(`Geo proxy request failed: ${response.status}`);
}

export async function getFeatureInfo(source: ProxySource): Promise<any> {
  const response = await getFromProxy(toParams(source));
  return response.json();
}

export async function getFeatures(
  source: ProxySource,
  signal?: AbortSignal,
): Promise<any> {
  const response = await getFromProxy(toParams(source), 0, false, signal);
  return response.json();
}

export async function getFeatureCount(source: ProxySource): Promise<number> {
  const response = await getFromProxy(toParams(source));
  const text = await response.text();

  const xmlMatch =
    text.match(/numberOfFeatures="(\d+)"/) ??
    text.match(/numberMatched="(\d+)"/);
  if (xmlMatch) return Number(xmlMatch[1]);

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.totalFeatures === "number") return parsed.totalFeatures;
    if (typeof parsed?.numberMatched === "number") return parsed.numberMatched;
  } catch {
    // Not JSON either -- give up below.
  }

  return 0;
}

export async function getImageObjectUrl(source: ProxySource): Promise<string> {
  const response = await getFromProxy(toParams(source));
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export function geoProxyTileLoadFunction(tile: any, src: string): void {
  const params = { ...toParams(src), FORMAT: "image/png" };
  getFromProxy(params)
    .then((res) => res.blob())
    .then((blob) => {
      const image = tile.getImage() as HTMLImageElement;
      image.src = URL.createObjectURL(blob);
    })
    .catch(() => {
      // leave tile blank on failure
    });
}
