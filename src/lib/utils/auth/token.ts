import { getCookieValue, setCookie } from "lib/cookieManager/cookie";
import {
  getSessionStorageItem,
  setSessionStorageItem,
} from "lib/sessionStorageManager";
import { MayBe } from "lib/types";

const COOKIE_KEY = "api_key";
const ENTERPRISE_KEY = "enterprise_api_key";
const COOKIE_EXPIRE = 20;

export function getAuthToken(): MayBe<string> {
  if (typeof window === "undefined") {
    return null;
  }
  if (getSessionStorageItem(COOKIE_KEY)) {
    return getSessionStorageItem(COOKIE_KEY);
  }

  return getCookieValue(COOKIE_KEY);
}

export function getEnterpriseToken(): MayBe<string> {
  if (typeof window === "undefined") {
    return null;
  }
  if (getSessionStorageItem(ENTERPRISE_KEY)) {
    return getSessionStorageItem(COOKIE_KEY);
  }

  return getCookieValue(ENTERPRISE_KEY);
}

export function setAuthToken(token: string, rememeberMe = true) {
  if (typeof token !== "string") {
    throw new Error(`Cannot set ${COOKIE_KEY}. Invalid Value.`);
  }
  if (rememeberMe) {
    setCookie(COOKIE_KEY, token, COOKIE_EXPIRE);
  } else {
    setSessionStorageItem(COOKIE_KEY, token);
  }
}

export function setEnterpriseToken(token: string, rememeberMe = true) {
  if (typeof token !== "string") {
    throw new Error(`Cannot set ${ENTERPRISE_KEY}. Invalid Value.`);
  }
  if (rememeberMe) {
    setCookie(ENTERPRISE_KEY, token, COOKIE_EXPIRE);
  } else {
    setSessionStorageItem(COOKIE_KEY, token);
  }
}
