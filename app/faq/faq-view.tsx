"use client";

import { useI18n, LangToggle } from "../i18n";
import { BackLink } from "../back-link";
import type { StrKey } from "../strings";

// Q&A content lives in the shared strings dictionary (faq.q1..q8 / faq.a1..a8)
// so it picks up the EN/HI toggle automatically.
const FAQ_KEYS: { q: StrKey; a: StrKey }[] = [
  { q: "faq.q1", a: "faq.a1" },
  { q: "faq.q2", a: "faq.a2" },
  { q: "faq.q3", a: "faq.a3" },
  { q: "faq.q4", a: "faq.a4" },
  { q: "faq.q5", a: "faq.a5" },
  { q: "faq.q6", a: "faq.a6" },
  { q: "faq.q7", a: "faq.a7" },
  { q: "faq.q8", a: "faq.a8" },
];

export function FaqView() {
  const { t } = useI18n();
  return (
    <main className="terms-page faq-page page-width">
      <div className="page-topbar"><BackLink /><LangToggle /></div>
      <h1>{t("faq.title")}</h1>
      <p className="faq-intro">{t("faq.intro")}</p>
      <ol className="faq-list">
        {FAQ_KEYS.map(({ q, a }, i) => (
          <li className="faq-item" key={q}>
            <span className="faq-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="faq-body">
              <h2 className="faq-q">{t(q)}</h2>
              <p className="faq-a">{t(a)}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
