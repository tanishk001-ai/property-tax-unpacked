import { BillScreen } from "../../../portal";
import { propertyIds } from "../../../properties";

export const dynamicParams = false;

export function generateStaticParams() {
  return propertyIds.map((id) => ({ id }));
}

export default async function BreakdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BillScreen id={id} view="breakdown" />;
}
