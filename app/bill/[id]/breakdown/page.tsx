import type { Metadata } from "next";
import { BillScreen } from "../../../portal";
import { propertyIds, propertyLabel } from "../../../properties";
import { translate } from "../../../strings";
import { shareTags } from "../../../share";

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const title = translate("en", "meta.title.breakdown", id);
  const description = `Demo property ${id} (${propertyLabel(id).toLowerCase()}): see how an Indian property tax bill is worked out, line by line. An independent hackathon prototype with synthetic data.`;
  return { title, description, ...shareTags(title, description, `/bill/${id}/breakdown`) };
}

export function generateStaticParams() {
  return propertyIds.map((id) => ({ id }));
}

export default async function BreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BillScreen id={id} view="breakdown" />;
}
