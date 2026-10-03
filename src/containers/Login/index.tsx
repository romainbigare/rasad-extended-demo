import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";
import { EyeIcon, EyeOffIcon } from "@/components/AppShell/icons";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { FullPageLoader } from "@/components/ui/States";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { t } from "@/lib/i18n/translations";

const HOME = "/executive-view";

/** Only same-app paths; never "//host" or absolute URLs. */
function safeRedirect(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return HOME;
  if (value === "/login" || value.startsWith("/login?")) return HOME;
  return value;
}

interface LoginError {
  message?: string;
  requiresActivation?: boolean;
}

export default function Login() {
  const auth = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = safeRedirect(router.query.redirect);

  useEffect(() => {
    if (auth?.isAuthenticated) router.replace(redirectTo);
  }, [auth?.isAuthenticated, redirectTo, router]);

  if (auth?.loadingProfile || auth?.isAuthenticated) return <FullPageLoader />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.login({ username: username.trim(), password }, rememberMe);
      window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${redirectTo}`;
    } catch (e) {
      const err = (e ?? {}) as LoginError;
      setError(
        err.requiresActivation
          ? "This account hasn’t been activated yet. Activate it from the ADAFSA portal, then sign in here."
          : err.message || "Sign-in failed. Check your details and try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout title="Sign in · ADAFSA">
          <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-panel shadow-lg shadow-black/5">
            <div className="h-1.5 bg-gradient-to-r from-green via-green-d to-teal-3" />
            <form onSubmit={onSubmit} noValidate className="p-7 sm:p-8">
              <h2 className="m-0 text-center text-xl font-extrabold">{t("signIn", language)}</h2>
              <p className="mb-6 mt-1 text-center text-xs text-muted">{t("useAdafsaAccount", language)}</p>

              <label htmlFor="username" className="section-label">
                {t("emailOrPhone", language)}
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mb-4 mt-1.5 w-full rounded-xl border border-transparent bg-blue-l px-4 py-3 text-sm outline-none focus:border-green-d focus:bg-white"
              />

              <label htmlFor="password" className="section-label">
                {t("password", language)}
              </label>
              <div className="relative mb-4 mt-1.5">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-transparent bg-blue-l py-3 pe-11 ps-4 text-sm outline-none focus:border-green-d focus:bg-white"
                />
                {/* Show / hide the typed password. */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? "hidePassword" : "showPassword", language)}
                  aria-pressed={showPassword}
                  aria-controls="password"
                  title={t(showPassword ? "hidePassword" : "showPassword", language)}
                  className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted hover:text-ink focus-visible:text-ink focus-visible:outline-none"
                >
                  {showPassword ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
                </button>
              </div>

              <label className="mb-6 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-[rgb(var(--green-d))]"
                />
                {t("keepSignedIn", language)}
              </label>

              {error && (
                <p role="alert" className="mb-4 mt-0 rounded-lg border border-[#f2b8b0] bg-red-l px-3 py-2 text-xs text-red">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full rounded-xl py-3.5 text-sm"
                disabled={submitting || !username.trim() || !password}
              >
                {submitting ? t("signingIn", language) : t("signIn", language)}
              </Button>

              <p className="mb-0 mt-5 text-center text-xs text-muted">
                {t("newToAdafsa", language)}{" "}
                <Link href="/register" className="font-bold text-green-d hover:underline">
                  {t("createAccount", language)}
                </Link>
              </p>
            </form>
          </div>
    </AuthSplitLayout>
  );
}
