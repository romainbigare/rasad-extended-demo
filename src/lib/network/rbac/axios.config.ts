import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearRbacTokens,
  getRbacAccessToken,
  getRbacRefreshToken,
  isRbacRememberedSession,
  setRbacTokens,
} from "lib/utils/auth/rbacToken";
import { ADAFSA_PRODUCT_NAME, RBAC_ENDPOINTS } from "./endpoints";

const RBAC_BASE_URL = (
  process.env.NEXT_PUBLIC_RBAC_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

export const rbacApi = axios.create({
  baseURL: RBAC_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

rbacApi.interceptors.request.use((config) => {
  const token = getRbacAccessToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let inFlightRefresh: Promise<string | null> | null = null;

async function refreshRbacAccessToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refreshToken = getRbacRefreshToken();
    if (!refreshToken) return null;
    const rememberMe = isRbacRememberedSession();

    try {
      const response = await axios.post(
        `${RBAC_BASE_URL}${RBAC_ENDPOINTS.REFRESH}`,
        { refresh_token: refreshToken, product: ADAFSA_PRODUCT_NAME },
        { headers: { "Content-Type": "application/json" } },
      );

      const accessToken: string | undefined = response.data?.data?.access_token;
      const newRefreshToken: string | undefined =
        response.data?.data?.refresh_token;

      if (!accessToken || !newRefreshToken) {
        clearRbacTokens();
        return null;
      }

      setRbacTokens(accessToken, newRefreshToken, rememberMe);
      return accessToken;
    } catch {
      clearRbacTokens();
      return null;
    }
  })();

  try {
    return await inFlightRefresh;
  } finally {
    inFlightRefresh = null;
  }
}

type RetriableConfig = InternalAxiosRequestConfig & { _rbacRetried?: boolean };

rbacApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthEndpoint =
      config?.url === RBAC_ENDPOINTS.LOGIN ||
      config?.url === RBAC_ENDPOINTS.REFRESH;

    if (
      error.response?.status === 401 &&
      config &&
      !config._rbacRetried &&
      !isAuthEndpoint
    ) {
      config._rbacRetried = true;
      const newAccessToken = await refreshRbacAccessToken();
      if (newAccessToken) {
        config.headers.set("Authorization", `Bearer ${newAccessToken}`);
        return rbacApi.request(config);
      }
    }

    return Promise.reject(error);
  },
);
