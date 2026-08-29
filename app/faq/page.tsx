import type { Metadata } from "next";
import { FaqView } from "./faq-view";

export const metadata: Metadata = {
  title: "Common questions · Unpacked",
  description: "Plain answers about a property tax bill and about this prototype.",
};

export default function FaqPage() {
  return <FaqView />;
}
