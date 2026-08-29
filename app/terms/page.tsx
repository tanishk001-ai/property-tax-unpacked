import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms · Unpacked",
  description: "Independent hackathon prototype — synthetic and simulated data only.",
};

export default function TermsPage() {
  return (
    <main className="terms-page page-width">
      <a className="terms-back" href="/">&larr; Unpacked</a>
      <h1>Terms</h1>
      <p>
        This is an independent hackathon prototype, not a government product or service. All property records,
        calculations, and payments shown are synthetic and simulated — no real data is collected, stored, or
        transmitted, and no payment gateway is contacted. Nothing here should be relied on as an actual property
        tax record.
      </p>
    </main>
  );
}
