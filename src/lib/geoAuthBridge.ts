import { rbacRequest } from "@shared/network/rbacRequest";
import { RBAC_ENDPOINTS } from "@shared/network/rbacEndpoints";
import { getRbacAccessToken } from "@shared/tokens/rbacToken";

/**
 * geoProxy sends the RBAC access token itself, so there's no separate geo
 * token to sync. This only renews an already-expired access token up front,
 * through rbacApi's single-flighted 401 interceptor, so a burst of geo
 * requests doesn't each start with a 401.
 */
export async function ensureGeoToken(): Promise<void> {
  const access = getRbacAccessToken();
  if (!access || !isExpired(access)) return;

  // Any authenticated rbacApi call renews an expired access token through
  // its response interceptor.
  await rbacRequest(RBAC_ENDPOINTS.PROFILE, "GET", undefined, undefined, {
    silent: true,
  }).catch(() => undefined);
}

const EXPIRY_SKEW_MS = 5_000;

function isExpired(token: string): boolean {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const { exp } = JSON.parse(atob(padded)) as { exp?: number };
    return typeof exp === "number" && exp * 1000 <= Date.now() + EXPIRY_SKEW_MS;
  } catch {
    return false;
  }
}
