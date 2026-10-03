import type { ReactNode } from "react";
import { useRef } from "react";

import { useAuth } from "@shared/auth/AuthContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

import { Button } from "../ui/Button";
import { FullPageLoader } from "../ui/States";

export function AuthGuard({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { language } = useLanguage();

  const hasLoadedOnce = useRef(false);
  if (auth?.user) hasLoadedOnce.current = true;

  if (auth?.loadingProfile && !hasLoadedOnce.current) {
    return <FullPageLoader label={t("loadingProfile", language)} />;
  }

  if (auth?.profileFetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-card border border-line bg-panel p-6 text-center">
          <h1 className="m-0 text-base font-bold">{t("accountUnavailableTitle", language)}</h1>
          <p className="mb-5 mt-2 text-xs text-muted">{t("accountUnavailableBody", language)}</p>
          <Button variant="primary" className="w-full" onClick={() => auth.logout()}>
            {t("backToSignIn", language)}
          </Button>
        </div>
      </div>
    );
  }

  if (auth?.isAuthenticated && !auth.isAuthPage) return <>{children}</>;

  // Not authenticated yet: AuthProvider is fetching the profile or redirecting.
  return <FullPageLoader />;
}
