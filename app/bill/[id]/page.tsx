import { BillScreen } from "../../portal";
import { propertyIds } from "../../properties";

// Only the demo properties exist as pages, all prerendered at build time. Any
// other path under /bill is handled by middleware.ts before it gets here.
export const dynamicParams = false;

export function generateStaticParams() {
  return propertyIds.map((id) => ({ id }));
}

export default async function BillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BillScreen id={id} view="bill" />;
}
