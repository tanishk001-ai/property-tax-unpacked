import { Landing } from "../../portal";

// What /bill/<anything that is not a demo property> is rewritten to (see
// middleware.ts): the landing page with the "not found" message, status 200.
export default function UnknownBillPage() {
  return <Landing notFound />;
}
