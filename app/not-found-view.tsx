"use client";

import Link from "next/link";
import { useI18n, useDocumentTitle, LangToggle } from "./i18n";

// Shown for any address that is not a page (the default framework 404 is English-only
// and has no way back). Unknown property ids never get here: they show the landing page.
export function NotFoundView() {
  const { t } = useI18n();
  useDocumentTitle("meta.title.notfound");
  return (
    <main className="terms-page page-width">
      <div className="page-topbar"><span className="brand"><span>Unpacked</span></span><LangToggle /></div>
      <h1>{t("nf.title")}</h1>
      <p>{t("nf.body")}</p>
      <p><Link className="button button-primary" href="/">{t("nf.home")} →</Link></p>
    </main>
  );
}
