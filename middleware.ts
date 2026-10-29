import { NextResponse, type NextRequest } from "next/server";
import { canonicalId } from "./app/properties";

// Runs for every /bill/... address and for old /?id= links:
//
// 1. Links from before bills had real routes: /?id=DEMO-7719[&view=breakdown]
//    redirect to /bill/DEMO-7719[/breakdown].
// 2. /bill/<id>[/breakdown]: the exact canonical address passes straight through to
//    the prerendered page. Another spelling of a real id (demo-7719, a trailing
//    slash, a stray space) redirects once to the canonical address. An unknown id is
//    rewritten, keeping the URL, to the landing page with the "not found" message:
//    status 200, not a 404, and no cached page per probed id.
//
// The matcher takes every /bill/... address on purpose. Matching "everything except
// the three canonical ids" worked under `next start` but not on Vercel, where path
// matching ignores case, so /bill/demo-7719 was excluded from the middleware and
// returned 404, and a trailing slash made it redirect to itself.
export function middleware(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const to = (path: string, query = search) => NextResponse.redirect(new URL(path + query, request.url), 308);

  if (pathname === "/") {
    const raw = (searchParams.get("id") ?? "").trim();
    if (!raw) return NextResponse.next();
    const rest = new URLSearchParams(searchParams);
    rest.delete("id");
    rest.delete("view");
    const query = rest.size ? `?${rest}` : "";
    // The id is encoded so it can only ever be one path segment.
    return to(`/bill/${encodeURIComponent(canonicalId(raw) ?? raw)}${searchParams.get("view") === "breakdown" ? "/breakdown" : ""}`, query);
  }

  if (/^\/bill\/*$/.test(pathname)) return to("/", "");

  const match = /^\/bill\/([^/]+)(\/breakdown)?\/*$/.exec(pathname);
  if (!match) return NextResponse.next(); // e.g. /bill/DEMO-7719/extra: the not-found page
  const suffix = match[2] ?? "";
  const id = canonicalId(match[1]);
  if (id) return pathname === `/bill/${id}${suffix}` ? NextResponse.next() : to(`/bill/${id}${suffix}`);
  const url = request.nextUrl.clone();
  url.pathname = "/bill/unknown";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    { source: "/", has: [{ type: "query", key: "id" }] },
    "/bill/:path*",
  ],
};
