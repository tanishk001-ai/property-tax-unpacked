"use client";

import { useI18n } from "./i18n";

export function BackLink() {
  const { t } = useI18n();
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else window.location.href = "/";
  }
  return (
    <button type="button" className="terms-back" onClick={goBack}>&larr; {t("terms.back")}</button>
  );
}
