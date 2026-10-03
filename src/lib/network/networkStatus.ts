let isOnline = typeof window !== "undefined" ? navigator.onLine : false;
let networkErrorToastShown = false;

export function getIsOnline(): boolean {
  return isOnline;
}

export function setGlobalNetworkStatus(online: boolean): void {
  const wasOffline = !isOnline;
  isOnline = online;
  // Reset the toast flag when network comes back online
  if (online && wasOffline) {
    networkErrorToastShown = false;
  }
}

export function shouldShowNetworkErrorToast(): boolean {
  // Don't show network error toast when network is offline
  // The NoInternet banner already provides this information
  if (!navigator.onLine) {
    return false;
  }
  if (networkErrorToastShown) {
    return false; // Already shown, don't show again
  }
  // Only show if network is online and we haven't shown it yet
  // (This case shouldn't normally happen, but kept for edge cases)
  return false;
}
