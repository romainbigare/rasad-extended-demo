import { clearCookies } from "lib/cookieManager/cookie";

export function logout(redirect: boolean = true, url?: string) {
  clearCookies();
  localStorage.clear();
  sessionStorage.clear();
  if (redirect) {
    // window.location bypasses Next router, so include basePath explicitly.
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    window.location.href = url
      ? `${base}/login?redirect=${url}`
      : `${base}/login`;
  }
}
