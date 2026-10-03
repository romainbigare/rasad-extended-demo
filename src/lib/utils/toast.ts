import { toast, ToastOptions } from "react-toastify";
import { getIsOnline } from "lib/network/networkStatus";

/**
 * Wrapper for toast functions that checks network status.
 * Hides all toasts when network is offline.
 */

const shouldShowToast = (): boolean => {
  // Don't show any toasts when network is offline
  return getIsOnline();
};

export const toastSuccess = (message: string, options?: ToastOptions): void => {
  if (shouldShowToast()) {
    toast.success(message, options);
  }
};

export const toastError = (message: string, options?: ToastOptions): void => {
  if (shouldShowToast()) {
    toast.error(message, options);
  }
};

export const toastInfo = (message: string, options?: ToastOptions): void => {
  if (shouldShowToast()) {
    toast.info(message, options);
  }
};

export const toastWarning = (message: string, options?: ToastOptions): void => {
  if (shouldShowToast()) {
    toast.warning(message, options);
  }
};

// Export the original toast for cases where we need it (like dismiss)
export { toast };
