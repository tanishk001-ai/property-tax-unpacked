import type { Metadata } from "next";
import { TermsView } from "./terms-view";
import { shareTags } from "../share";

const title = "Terms · Unpacked";
const description = "Independent hackathon prototype — synthetic and simulated data only.";

export const metadata: Metadata = { title, description, ...shareTags(title, description, "/terms") };

export default function TermsPage() {
  return <TermsView />;
}
