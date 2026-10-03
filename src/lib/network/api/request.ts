import { AxiosError, AxiosRequestConfig } from "axios";
import { toastError } from "lib/utils/toast";
import { networkApi } from "./axios.config";
import { API_ENDPOINTS } from "./endpoints";
import { getEnterpriseToken } from "lib/utils/auth/token";
import Swal from "sweetalert2";
import { ErrorObj } from "lib/types";
import { shouldShowNetworkErrorToast } from "lib/network/networkStatus";

// Define a generic API request function
export async function apiRequest<T, D = undefined>(
  endpoint: (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS],
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  requestData?: D,
  config?: AxiosRequestConfig,
) {
  try {
    // Make an API request using Axios
    const response = await networkApi.request<T>({
      url: `${endpoint}`,
      method,
      data: requestData,
      params: {
        ...(endpoint.includes("/enterprise/")
          ? { api_key: getEnterpriseToken() }
          : {}),
      },
      ...config,
    });

    // Return the data from the response
    return response.data;
  } catch (err) {
    const error = err as AxiosError<ErrorObj>;
    const errorStatus = error.response && error.response.status.toString();
    const errorMessage = error.response && error.response.data?.message;

    // Expected empty resources — return null so React Query does not log AxiosError
    if (error.response?.status === 404) {
      return null as T;
    }

    if (!error.response) {
      const networkErrorMessage =
        error.message ||
        "Network error. Please check your internet connection.";
      // Only show toast once, even if multiple API calls fail
      if (typeof window !== "undefined" && shouldShowNetworkErrorToast()) {
        toastError(networkErrorMessage);
      }
      throw { status: "NETWORK_ERROR", message: networkErrorMessage };
    }

    if (error?.response?.data) {
      // @ts-ignore
      if (Array.isArray(error?.response?.data)) {
        // @ts-ignore
        toastError(error?.response?.data[0]?.message);
      } else {
        // @ts-ignore
        if (error.response.status === 403) {
          // Only show Swal if network is online
          if (typeof window !== "undefined" && navigator.onLine) {
            Swal.fire({
              title: "Attention!",
              text: error?.response?.data?.message,
              icon: "warning",
              confirmButtonText: "OK",
              customClass: {
                confirmButton: "custom-swal-confirm-btn",
              },
              buttonsStyling: false,
            });
          }
        } else {
          // @ts-ignore
          toastError(error?.response?.data?.message || "Something went wrong on our end. Please check back later.");
        }
      }
    }
    throw { status: errorStatus, message: errorMessage };
  }
}
