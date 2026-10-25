// Anonymous product analytics (Vercel Web Analytics custom events).
// Only demo property IDs, line ids, payment-mode names and the chosen language are
// ever sent — never anything a visitor types, and no personal data.
import { track } from "@vercel/analytics";

type Events = {
  property_opened: { id: string; source: "sample" | "search" | "deeplink" };
  breakdown_opened: { id: string };
  line_expanded: { id: string; line: string };
  question_line_clicked: { id: string; line: string };
  dispute_submitted: { id: string; line: string };
  payment_simulated: { id: string; mode: string };
  language_switched: { to: "en" | "hi" };
};

// track() silently drops events if the analytics queue does not exist yet, which
// is the case for events fired from the first mount effect (before <Analytics />
// has run). Create the same queue the package uses so those events are kept and
// replayed once the script loads.
function ensureQueue() {
  if (typeof window !== "undefined" && !window.va) {
    window.va = (...params: unknown[]) => {
      (window.vaq = window.vaq || []).push(params as [string, unknown?]);
    };
  }
}

export function trackEvent<N extends keyof Events>(name: N, props: Events[N]) {
  try {
    ensureQueue();
    track(name, props as Record<string, string>);
  } catch {
    /* analytics must never break the app */
  }
}
