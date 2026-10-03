import { getCookieValue, setCookie } from "lib/cookieManager/cookie";
import {
  getSessionStorageItem,
  setSessionStorageItem,
} from "lib/sessionStorageManager";
import { MayBe } from "lib/types";

const ACCESS_TOKEN_KEY = "rbac_access_token";
const REFRESH_TOKEN_KEY = "rbac_refresh_token";
const REFRESH_TOKEN_EXPIRE_DAYS = 7;

export function getRbacAccessToken(): MayBe<string> {
  if (typeof window === "undefined") return null;
  return (
    getSessionStorageItem(ACCESS_TOKEN_KEY) || getCookieValue(ACCESS_TOKEN_KEY)
  );
}

export function getRbacRefreshToken(): MayBe<string> {
  if (typeof window === "undefined") return null;
  return (
    getSessionStorageItem(REFRESH_TOKEN_KEY) ||
    getCookieValue(REFRESH_TOKEN_KEY)
  );
}

export function isRbacRememberedSession(): boolean {
  if (typeof window === "undefined") return true;
  return !getSessionStorageItem(REFRESH_TOKEN_KEY);
}

export function setRbacTokens(
  accessToken: string,
  refreshToken: string,
  rememberMe = true,
): void {
  if (rememberMe) {
    setCookie(ACCESS_TOKEN_KEY, accessToken, REFRESH_TOKEN_EXPIRE_DAYS);
    setCookie(REFRESH_TOKEN_KEY, refreshToken, REFRESH_TOKEN_EXPIRE_DAYS);
  } else {
    setSessionStorageItem(ACCESS_TOKEN_KEY, accessToken);
    setSessionStorageItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function getRbacRoleName(): MayBe<string> {
  const token = getRbacAccessToken() || getRbacRefreshToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)).role_name ?? null;
  } catch {
    return null;
  }
}

export function clearRbacTokens(): void {
  setCookie(ACCESS_TOKEN_KEY, "", -1);
  setCookie(REFRESH_TOKEN_KEY, "", -1);
  setSessionStorageItem(ACCESS_TOKEN_KEY, "");
  setSessionStorageItem(REFRESH_TOKEN_KEY, "");
}
