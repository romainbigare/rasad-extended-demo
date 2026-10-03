import { AxiosError, AxiosRequestConfig } from "axios";
import { toastError } from "lib/utils/toast";
import { rbacApi } from "./axios.config";

type RbacEnvelope<T> = {
  status?: "success" | "error";
  message?: string;
  status_code?: number;
  error_code?: string | null;
  data?: T;
  timestamp?: string;
  detail?: string;
};

export type RbacResult<T> = {
  data: T;
  message?: string;
  errorCode?: string | null;
};

export type RbacRequestError = {
  status?: number;
  message: string;
  errorCode?: string | null;
};

export async function rbacRequest<T, D = any>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  requestData?: D,
  config?: AxiosRequestConfig,
  options?: { silent?: boolean },
): Promise<RbacResult<T>> {
  try {
    const response = await rbacApi.request<RbacEnvelope<T>>({
      url,
      method,
      data: requestData,
      ...config,
    });

    const body = response.data;
    return {
      data: (body?.data ?? (body as unknown as T)) as T,
      message: body?.message,
      errorCode: body?.error_code ?? null,
    };
  } catch (err) {
    const axiosError = err as AxiosError<RbacEnvelope<unknown>>;
    const status = axiosError.response?.status;
    const body = axiosError.response?.data;
    const message =
      status !== undefined && status >= 500
        ? "Something went wrong on our end. Please check back later."
        : body?.message ||
          (typeof body?.detail === "string" ? body.detail : undefined) ||
          "Something went wrong on our end. Please check back later.";

    if (!options?.silent) {
      toastError(message);
    }

    const rbacError: RbacRequestError = {
      status,
      message,
      errorCode: body?.error_code ?? null,
    };
    throw rbacError;
  }
}
