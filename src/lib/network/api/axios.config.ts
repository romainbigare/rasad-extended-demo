import axios, { AxiosError } from "axios";
import baseURL from "configs/api";
import { ErrorObj } from "lib/types";
import { getAuthToken } from "lib/utils/auth/token";
import { getIsOnline } from "lib/network/networkStatus";

// Block ALL axios requests (default instance + networkApi) when offline.
axios.interceptors.request.use(
  (config) => {
    if (!getIsOnline()) {
      return Promise.reject(new Error("Offline"));
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const networkApi = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  params: {
    ...(getAuthToken()
      ? {
          api_key: getAuthToken(),
        }
      : {}),
  },
});

networkApi.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error: AxiosError<ErrorObj>) {
    // handle global res handlers

    if (error.response?.status === 404) {
    }

    return Promise.reject(error);
  },
);
