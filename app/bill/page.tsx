import { redirect } from "next/navigation";

// There is no list of bills; /bill on its own is the landing page.
export default function BillIndexPage() {
  redirect("/");
}
