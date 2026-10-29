// RT-*: HTTP-level routing, redirects and hostile URLs (no browser needed).
const { followChain, rawGet } = require("../lib.cjs");
const { ids } = require("../expected.cjs");

module.exports = async function routing({ base, rec }) {
  const { ok, note } = rec;
  const chains = {};
  const get = async (p) => (chains[p] = await followChain(base, p));
  const bodyText = (res) => res.final.body.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  // RT-01
  for (const id of ids) for (const suffix of ["", "/breakdown"]) {
    const c = await get(`/bill/${id}${suffix}`);
    ok("RT-01", c.hops === 0 && c.final.status === 200 && /<html/.test(c.final.body), `/bill/${id}${suffix} -> ${JSON.stringify(c.chain)}`);
  }
  // RT-02 case variants
  for (const [p, want] of [["/bill/demo-7719", "/bill/DEMO-7719"], ["/bill/DeMo-2048", "/bill/DEMO-2048"], ["/bill/demo-3982/breakdown", "/bill/DEMO-3982/breakdown"]]) {
    const c = await get(p);
    ok("RT-02", c.hops === 1 && c.finalPath === want && c.final.status === 200, `${p} -> ${JSON.stringify(c.chain)}`);
  }
  // RT-03 trailing slash
  for (const [p, want] of [["/bill/DEMO-7719/", "/bill/DEMO-7719"], ["/bill/DEMO-7719/breakdown/", "/bill/DEMO-7719/breakdown"], ["/bill/demo-7719/", "/bill/DEMO-7719"]]) {
    const c = await get(p);
    ok("RT-03", c.hops <= 1 && c.finalPath.replace(/\/$/, "") === want && c.final.status === 200, `${p} -> ${JSON.stringify(c.chain)}`);
  }
  // RT-04 URL-encoded id
  { const c = await get("/bill/%44EMO-7719"); ok("RT-04", c.hops <= 1 && c.final.status === 200 && c.finalPath === "/bill/DEMO-7719", JSON.stringify(c.chain)); }
  // RT-05 encoded spaces
  for (const p of ["/bill/%20DEMO-7719%20", "/bill/DEMO-7719%20"]) { const c = await get(p); ok("RT-05", c.hops <= 1 && c.final.status === 200 && c.finalPath === "/bill/DEMO-7719", `${p} -> ${JSON.stringify(c.chain)}`); }
  // RT-06 emoji
  { const c = await get("/bill/%F0%9F%8F%A0%F0%9F%92%B8"); ok("RT-06", c.final.status === 200 && /sample IDs/.test(bodyText(c)), JSON.stringify(c.chain)); }
  // RT-07 very long ids
  for (const n of [600, 5000]) { const c = await get("/bill/" + "A".repeat(n)); ok("RT-07", c.final.status === 200 && c.hops === 0 && /sample IDs/.test(bodyText(c)), `${n} chars -> ${JSON.stringify(c.chain.map((x) => [x[0], x[1].length]))}`); }
  // RT-08 extra segment
  { const c = await get("/bill/DEMO-7719/breakdown/extra"); note("RT-08", `/bill/DEMO-7719/breakdown/extra -> ${c.final.status}, branded=${/Unpacked/.test(c.final.body)}`); ok("RT-08", c.final.status === 404 || c.final.status === 200, JSON.stringify(c.chain)); ok("RT-08", /Unpacked/.test(c.final.body), "404 page is the unbranded framework page"); }
  // RT-09 /bill and /bill/
  for (const p of ["/bill", "/bill/"]) { const c = await get(p); ok("RT-09", c.hops <= 1 && c.finalPath === "/" && c.final.status === 200, `${p} -> ${JSON.stringify(c.chain)}`); }
  // RT-10 double slash
  { const c = await get("/bill//breakdown"); note("RT-10", JSON.stringify(c.chain)); ok("RT-10", c.hops <= 1 && c.final.status < 500, JSON.stringify(c.chain)); }
  // RT-11 literal unknown
  { const c = await get("/bill/unknown"); ok("RT-11", c.final.status === 200 && c.hops === 0 && /sample IDs/.test(bodyText(c)), JSON.stringify(c.chain)); }
  // RT-12 query kept
  { const c = await get("/bill/DEMO-7719?foo=bar"); ok("RT-12", c.final.status === 200 && c.hops === 0, JSON.stringify(c.chain)); const d = await get("/bill/demo-7719?foo=bar"); ok("RT-12", d.hops === 1 && d.finalPath === "/bill/DEMO-7719?foo=bar", JSON.stringify(d.chain)); }
  // RT-13 double encoded
  { const c = await get("/bill/%2544EMO-7719"); ok("RT-13", c.final.status < 500 && c.hops <= 1, JSON.stringify(c.chain)); note("RT-13", `final ${c.final.status} ${c.finalPath}`); }
  // RT-14 traversal
  for (const p of ["/bill/..%2F..%2Fetc", "/bill/%2e%2e/%2e%2e/etc", "/bill/..%5C..%5Cwindows", "/bill/%00", "/bill/%E0%A4%A", "/bill/DEMO-7719%00"]) {
    const c = await get(p); const body = c.final.body;
    ok("RT-14", c.final.status < 500 && !/root:|\[boot loader\]|etc\/passwd/.test(body) && c.hops <= 1, `${p} -> ${JSON.stringify(c.chain)}`);
  }
  // RT-15 old links
  const old = [
    ["/?id=demo-7719", "/bill/DEMO-7719"], ["/?id=DEMO-7719&view=breakdown", "/bill/DEMO-7719/breakdown"], ["/?id=DEMO-2048&view=bill", "/bill/DEMO-2048"],
    ["/?id=", "/?id="], ["/?view=breakdown", "/?view=breakdown"], ["/?id=NOPE", "/bill/NOPE"], ["/?id=%20demo-3982%20", "/bill/DEMO-3982"], ["/?id=DEMO-7719&utm_source=linkedin", "/bill/DEMO-7719?utm_source=linkedin"],
  ];
  for (const [p, want] of old) { const c = await get(p); ok("RT-15", c.hops <= 1 && c.finalPath === want && c.final.status === 200, `${p} -> ${JSON.stringify(c.chain)} (want ${want})`); }
  { const c = await get("/?id=%2F%2Fevil.com"); ok("RT-15", c.hops <= 1 && !/evil\.com/.test(c.finalPath.replace(/%2F%2Fevil\.com$/i, "")) && new URL(c.chain[c.chain.length - 1][1], base).origin === new URL(base).origin, JSON.stringify(c.chain)); }
  // RT-16 no more than one redirect anywhere
  const worst = Object.entries(chains).filter(([, c]) => c.hops > 1);
  ok("RT-16", worst.length === 0, worst.map(([p, c]) => `${p}: ${JSON.stringify(c.chain)}`).join("\n"));
  note("RT-16", `${Object.keys(chains).length} URLs checked, max hops ${Math.max(...Object.values(chains).map((c) => c.hops))}`);
  // RT-18 case variants of the fixed segments
  for (const p of ["/bill/DEMO-7719/Breakdown", "/BILL/DEMO-7719", "/Bill/DEMO-7719", "/bill/DEMO-7719/BREAKDOWN", "/Faq", "/TERMS"]) {
    const c = await get(p); note("RT-18", `${p} -> ${JSON.stringify(c.chain)}`);
    ok("RT-18", c.final.status < 500 && c.hops <= 1, `${p} -> ${JSON.stringify(c.chain)}`);
  }
  // RT-19 unknown route branded + translated
  { const c = await get("/nope"); ok("RT-19", c.final.status === 404 && /Unpacked/.test(c.final.body) && /href="\//.test(c.final.body), `status ${c.final.status}, branded=${/Unpacked/.test(c.final.body)}`); }
  // static assets that crawlers hit
  for (const p of ["/robots.txt", "/favicon.ico"]) { const c = await get(p); note("RT-20", `${p} -> ${c.final.status}`); }
};
