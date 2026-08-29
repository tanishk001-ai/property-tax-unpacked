import type { Metadata } from "next";
import { TermsView } from "./terms-view";

export const metadata: Metadata = {
  title: "Terms · Unpacked",
  description: "Independent hackathon prototype — synthetic and simulated data only.",
};

export default function TermsPage() {
  return <TermsView />;
}
