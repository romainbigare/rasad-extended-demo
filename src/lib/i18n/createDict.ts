import { useLanguage } from "./LanguageContext";

/**
 * Per-page translation dictionaries (Farm, Reports, Settings, ...) use this
 * instead of adding every string to the shared CHROME_STRINGS table, so
 * unrelated containers never touch the same file and collide. Same shape as
 * CHROME_STRINGS (`{ en, ar }` per key) - only the scope is narrower.
 */
export type Dict = Record<string, { en: string; ar: string }>;

export function useT<D extends Dict>(dict: D) {
  const { language } = useLanguage();
  return (key: keyof D): string => dict[key][language];
}
