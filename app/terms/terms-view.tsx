"use client";

import { useI18n, useDocumentTitle, LangToggle } from "../i18n";
import { BackLink } from "../back-link";

export function TermsView() {
  const { t } = useI18n();
  useDocumentTitle("meta.title.terms");
  return (
    <main className="terms-page page-width">
      <div className="page-topbar"><BackLink /><LangToggle /></div>
      <h1>{t("terms.title")}</h1>
      <p>{t("terms.body")}</p>
    </main>
  );
}
