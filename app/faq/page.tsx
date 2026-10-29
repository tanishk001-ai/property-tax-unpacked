import type { Metadata } from "next";
import { FaqView } from "./faq-view";
import { shareTags } from "../share";

const title = "Common questions · Unpacked";
const description = "Plain answers about a property tax bill and about this prototype.";

export const metadata: Metadata = { title, description, ...shareTags(title, description, "/faq") };

export default function FaqPage() {
  return <FaqView />;
}
