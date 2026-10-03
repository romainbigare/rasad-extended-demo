import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type Language = "en" | "ar";

/**
 * Arabic is switched off for now: the app always renders in English (LTR), whatever language was stored
 * earlier, and there is no language toggle. All dictionaries still carry their `ar` twin and the RTL code
 * paths are untouched, so turning this constant on is all it takes to bring the choice back (also put a
 * language toggle back in the top bar / Settings then).
 */
export const ARABIC_ENABLED = false;

const STORAGE_KEY = "adafsa-new:language";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => undefined,
});

function applyDocumentDirection(lang: Language) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    // Arabic off: ignore any stored choice and stay English, left to right.
    if (!ARABIC_ENABLED) {
      applyDocumentDirection("en");
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "ar" || stored === "en") {
        setLanguageState(stored);
        applyDocumentDirection(stored);
      }
    } catch {
      // Private browsing / blocked storage - default to English, LTR.
    }
  }, []);

  const setLanguage = (lang: Language) => {
    if (!ARABIC_ENABLED && lang !== "en") return;
    setLanguageState(lang);
    applyDocumentDirection(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Best-effort persistence only.
    }
  };

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
