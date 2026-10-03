import Link from "next/link";
import { useRouter } from "next/router";
import { type FormEvent, useEffect, useState } from "react";

import { useAuth } from "@shared/auth/AuthContext";
import { EyeIcon, EyeOffIcon } from "@/components/AppShell/icons";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/Button";
import { FullPageLoader } from "@/components/ui/States";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { type ChromeStringKey, t } from "@/lib/i18n/translations";

const HOME = "/executive-view";

const PASSWORD_RULES: ReadonlyArray<{ key: ChromeStringKey; test: (value: string) => boolean }> = [
  { key: "pwRuleLength", test: (v) => v.length >= 8 },
  { key: "pwRuleUpper", test: (v) => /[A-Z]/.test(v) },
  { key: "pwRuleLower", test: (v) => /[a-z]/.test(v) },
  { key: "pwRuleDigit", test: (v) => /\d/.test(v) },
  { key: "pwRuleSpecial", test: (v) => /[!@#$%*?&]/.test(v) },
];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INPUT =
  "mt-1.5 w-full rounded-xl border border-transparent bg-blue-l px-4 py-3 text-sm outline-none focus:border-green-d focus:bg-white";

/** A password box with the same show / hide toggle as the sign-in page. */
function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  const { language } = useLanguage();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input
        id={id}
        name={id}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-transparent bg-blue-l py-3 pe-11 ps-4 text-sm outline-none focus:border-green-d focus:bg-white"
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={t(shown ? "hidePassword" : "showPassword", language)}
        aria-pressed={shown}
        aria-controls={id}
        title={t(shown ? "hidePassword" : "showPassword", language)}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted hover:text-ink focus-visible:text-ink focus-visible:outline-none"
      >
        {shown ? <EyeOffIcon width={18} height={18} /> : <EyeIcon width={18} height={18} />}
      </button>
    </div>
  );
}

export default function Register() {
  const auth = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, confirm: false });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth?.isAuthenticated) router.replace(HOME);
  }, [auth?.isAuthenticated, router]);

  if (auth?.loadingProfile || auth?.isAuthenticated) return <FullPageLoader />;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const nameError = !trimmedName ? "nameRequired" : trimmedName.length > 50 ? "nameTooLong" : null;
  const emailError = EMAIL_PATTERN.test(trimmedEmail) ? null : "emailInvalid";
  const passwordOk = PASSWORD_RULES.every((rule) => rule.test(password));
  const confirmError = confirm !== password ? "passwordsDontMatch" : null;
  const canSubmit = !nameError && !emailError && passwordOk && !confirmError;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setTouched({ name: true, email: true, confirm: true });
    if (!canSubmit) return;
    setSubmitting(true);
    const response = await auth.register({ name: trimmedName, email: trimmedEmail, password });
    if (response) {
      await router.push("/login");
      return;
    }
    setError(t("signUpFailed", language));
    setSubmitting(false);
  };

  const fieldError = (show: boolean, key: ChromeStringKey | null) =>
    show && key ? (
      <p role="alert" className="mb-0 mt-1 text-[11px] text-red">
        {t(key, language)}
      </p>
    ) : null;

  return (
    <AuthSplitLayout title="Create account · ADAFSA">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-panel shadow-lg shadow-black/5">
        <div className="h-1.5 bg-gradient-to-r from-green via-green-d to-teal-3" />
        <form onSubmit={onSubmit} noValidate className="p-7 sm:p-8">
          <h2 className="m-0 text-center text-xl font-extrabold">{t("createYourAccount", language)}</h2>
          <p className="mb-6 mt-1 text-center text-xs text-muted">{t("signUpSubtitle", language)}</p>

          <label htmlFor="name" className="section-label">
            {t("fullName", language)}
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, name: true }))}
            className={INPUT}
          />
          {fieldError(touched.name, nameError)}

          <label htmlFor="email" className="section-label mt-4 block">
            {t("emailAddress", language)}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((s) => ({ ...s, email: true }))}
            className={INPUT}
          />
          {fieldError(touched.email, emailError)}

          <label htmlFor="password" className="section-label mt-4 block">
            {t("password", language)}
          </label>
          <PasswordField id="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <ul className="mb-0 mt-2 list-none space-y-0.5 p-0 text-[11px]" aria-label={t("passwordRulesTitle", language)}>
            {PASSWORD_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <li key={rule.key} className={ok ? "text-green-d" : "text-muted"}>
                  <span aria-hidden>{ok ? "✓" : "•"}</span> {t(rule.key, language)}
                </li>
              );
            })}
          </ul>

          <label htmlFor="confirm-password" className="section-label mt-4 block">
            {t("confirmPassword", language)}
          </label>
          <PasswordField id="confirm-password" value={confirm} onChange={(v) => { setConfirm(v); setTouched((s) => ({ ...s, confirm: true })); }} autoComplete="new-password" />
          {fieldError(touched.confirm, confirmError)}

          {error && (
            <p role="alert" className="mb-0 mt-4 rounded-lg border border-[#f2b8b0] bg-red-l px-3 py-2 text-xs text-red">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" className="mt-6 w-full rounded-xl py-3.5 text-sm" disabled={submitting || !canSubmit}>
            {submitting ? t("creatingAccount", language) : t("createAccount", language)}
          </Button>

          <p className="mb-0 mt-5 text-center text-xs text-muted">
            {t("alreadyHaveAccount", language)}{" "}
            <Link href="/login" className="font-bold text-green-d hover:underline">
              {t("signIn", language)}
            </Link>
          </p>
        </form>
      </div>
    </AuthSplitLayout>
  );
}
