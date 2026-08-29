"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { STR, type StrKey } from "./strings";

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

  const t = useCallback(
    (key: StrKey, ...args: (string | number)[]) => {
      const entry = STR[key];
      const value = entry ? entry[lang] : undefined;
      if (value == null) return key;
      return typeof value === "function" ? (value as (...a: (string | number)[]) => string)(...args) : value;
    },
    [lang],
  );

  const ctx = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={ctx}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`lang-toggle ${compact ? "lang-toggle-compact" : ""}`} role="group" aria-label="Language / भाषा">
      <button type="button" className={lang === "en" ? "is-active" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className={lang === "hi" ? "is-active" : ""} aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>
        हिं
      </button>
    </div>
  );
}
