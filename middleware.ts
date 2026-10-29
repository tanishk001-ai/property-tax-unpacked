import { NextResponse, type NextRequest } from "next/server";
import { canonicalId } from "./app/properties";

// Two jobs, both off the fast path (the three prerendered bills never reach this):
//
// 1. Links from before bills had real routes: /?id=DEMO-7719[&view=breakdown]
//    redirect to /bill/DEMO-7719[/breakdown].
// 2. /bill/<something else>: a different spelling of a real id (demo-7719) redirects
//    to the canonical path; anything unknown is rewritten, keeping the URL, to the
//    landing page with the "not found" message. That is status 200, not a 404, and
//    it never creates a cached page per probed id.
export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  if (url.pathname === "/") {
    const raw = (url.searchParams.get("id") ?? "").trim();
    if (!raw) return NextResponse.next();
    const breakdown = url.searchParams.get("view") === "breakdown";
    url.searchParams.delete("id");
    url.searchParams.delete("view");
    // The id is encoded so it can only ever be one path segment.
    url.pathname = `/bill/${encodeURIComponent(canonicalId(raw) ?? raw)}${breakdown ? "/breakdown" : ""}`;
    return NextResponse.redirect(url, 308);
  }

  const match = /^\/bill\/([^/]+)(\/breakdown)?\/?$/.exec(url.pathname);
  if (!match) return NextResponse.next();
  const id = canonicalId(match[1]);
  if (id) {
    url.pathname = `/bill/${id}${match[2] ?? ""}`;
    return NextResponse.redirect(url, 308);
  }
  url.pathname = "/bill/unknown";
  return NextResponse.rewrite(url);
}

// Keep this list of ids in step with app/data/properties.json: the matcher has to
// be a literal, so it cannot be built from the data. A missing id would only mean
// that bill is routed through the middleware (still correct, just not instant).
export const config = {
  matcher: [
    { source: "/", has: [{ type: "query", key: "id" }] },
    "/bill/((?!(?:DEMO-2048|DEMO-7719|DEMO-3982)(?:/breakdown)?$).+)",
  ],
};
