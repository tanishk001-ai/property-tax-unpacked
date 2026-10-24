"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type StrKey } from "./strings";

export type Lang = "en" | "hi";

const STORAGE_KEY = "unpacked.lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: StrKey, ...args: (string | number)[]) => string };

const I18nContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read persisted choice after mount only, so server and first client render
  // both start from "en" (no hydration mismatch); then correct if needed.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "hi" || saved === "en") setLangState(saved);
    } catch {
      /* storage unavailable — stay on default */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // Keep <html lang> in step with the toggle (screen readers, hyphenation, fonts).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback((key: StrKey, ...args: (string | number)[]) => translate(lang, key, ...args), [lang]);

  const ctx = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

// Sets the browser tab title in the active language.
export function useDocumentTitle(key: StrKey) {
  const { t } = useI18n();
  useEffect(() => {
    document.title = t(key);
  }, [t, key]);
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`lang-toggle ${compact ? "lang-toggle-compact" : ""}`} role="group" aria-label={t("lang.group")}>
      <button type="button" className={lang === "en" ? "is-active" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className={lang === "hi" ? "is-active" : ""} aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>
        हिं
      </button>
    </div>
  );
}
