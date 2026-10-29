"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translate, type StrKey } from "./strings";
import { trackEvent } from "./analytics";

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
export function useDocumentTitle(key: StrKey, ...args: (string | number)[]) {
  const { t } = useI18n();
  const title = t(key, ...args);
  useEffect(() => {
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    // Next re-renders its own <title> from the layout metadata after hydration,
    // which would put the English title back; re-apply when that happens.
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [title]);
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const choose = (next: Lang) => {
    if (next === lang) return;
    trackEvent("language_switched", { to: next });
    setLang(next);
  };
  return (
    <div className={`lang-toggle ${compact ? "lang-toggle-compact" : ""}`} role="group" aria-label={t("lang.group")}>
      <button type="button" className={lang === "en" ? "is-active" : ""} aria-pressed={lang === "en"} onClick={() => choose("en")}>
        EN
      </button>
      <button type="button" className={lang === "hi" ? "is-active" : ""} aria-pressed={lang === "hi"} onClick={() => choose("hi")}>
        हिं
      </button>
    </div>
  );
}
