import { type ReactNode, useEffect, useState } from "react";

import { FullPageLoader } from "@/components/ui/States";
import { BASE_PATH } from "@/lib/assetPath";
import { getRbacAccessToken, setRbacTokens } from "lib/utils/auth/rbacToken";

// Placeholder session for the static demo (JWT payload only, signature is fake; expires in 2100).
const ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0YXJpcS5hbG51YWltaUBhZGFmc2EuZ292LmFlIiwibmFtZSI6IkRyLiBUYXJpcSBBbC1OdWFpbWkiLCJyb2xlX25hbWUiOiJBZ3Jvbm9taXN0Iiwicm9sZV9pZCI6MywicHJvZHVjdCI6ImZhcm0gbW9uaXRvcmluZyIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjo0MTAyNDQ0ODAwLCJ0eXBlIjoiYWNjZXNzIn0.mock-signature";
const REFRESH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0YXJpcS5hbG51YWltaUBhZGFmc2EuZ292LmFlIiwibmFtZSI6IkRyLiBUYXJpcSBBbC1OdWFpbWkiLCJyb2xlX25hbWUiOiJBZ3Jvbm9taXN0Iiwicm9sZV9pZCI6MywicHJvZHVjdCI6ImZhcm0gbW9uaXRvcmluZyIsImlhdCI6MTc2NzIyNTYwMCwiZXhwIjo0MTAyNDQ0ODAwLCJ0eXBlIjoicmVmcmVzaCJ9.mock-signature";

/**
 * The demo has no backend: a service worker (public/mock-sw.js, built from demo/) answers every
 * request under <base>/__mock/ with generated placeholder data. This gate registers it, waits until
 * it controls the page, and signs the visitor in with a placeholder session before the app mounts.
 */
export function DemoGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getRbacAccessToken()) setRbacTokens(ACCESS_TOKEN, REFRESH_TOKEN, true);
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register(`${BASE_PATH}/mock-sw.js`, { scope: `${BASE_PATH}/` });
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          // First visit: the worker is active but not yet controlling this page.
          await new Promise<void>((resolve) => {
            navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
            setTimeout(resolve, 2500);
          });
          if (!navigator.serviceWorker.controller) {
            window.location.reload();
            return;
          }
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <>{children}</> : <FullPageLoader />;
}
