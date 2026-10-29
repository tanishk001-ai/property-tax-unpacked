// LV-*: checks that only make sense against the production URL.
const fs = require("fs"); const path = require("path");
const { openPage, sleep, followChain, rawGet, rupeeTokens } = require("../lib.cjs");
const { expected, ids, inr } = require("../expected.cjs");

const meta = (html, key) => { const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${key}"[^>]*content="([^"]*)"`, "i")); return m ? m[1].replace(/&amp;/g, "&") : null; };

module.exports = async function live({ browser, base, rec }) {
  const { ok, note } = rec;
  const shots = path.join(__dirname, "..", "screenshots", "live"); fs.mkdirSync(shots, { recursive: true });
  // LV-01
  const p = await openPage(browser, { width: 1366, height: 800 });
  for (const id of ids) for (const sfx of ["", "/breakdown"]) {
    const res = await p.goto(`${base}/bill/${id}${sfx}`); await p.waitForSelector(sfx ? ".breakdown-main" : ".bill-main");
    const text = await p.innerText("body");
    ok("LV-01", res.status() === 200 && rupeeTokens(text).includes(expected[id].due), `${id}${sfx}: ${res.status()}, amount ${inr(expected[id].due)} ${rupeeTokens(text).includes(expected[id].due) ? "shown" : "NOT shown"}`, p);
  }
  // LV-02
  for (const [from, to] of [["/?id=DEMO-7719", "/bill/DEMO-7719"], ["/?id=demo-7719&view=breakdown", "/bill/DEMO-7719/breakdown"], ["/bill/demo-7719", "/bill/DEMO-7719"]]) {
    const c = await followChain(base, from);
    ok("LV-02", c.hops === 1 && c.chain[0][0] === 308 && c.finalPath === to && c.final.status === 200, `${from} -> ${JSON.stringify(c.chain)}`);
    note("LV-02", `${from} -> ${c.chain.map((x) => x[0]).join(",")} -> ${c.finalPath}`);
  }
  // LV-03
  { const res = await p.goto(`${base}/bill/NOPE`); await p.waitForSelector("#lookup-error"); ok("LV-03", res.status() === 200 && /sample IDs/.test(await p.textContent("#lookup-error")), `status ${res.status()}`, p); }
  // LV-04 first paint
  for (const [id, label] of [["DEMO-7719", "bill"], ["DEMO-3982", "bill"]]) {
    const noJs = await openPage(browser, { width: 390, height: 844, js: false });
    const res = await noJs.goto(`${base}/bill/${id}`);
    ok("LV-04", res.status() === 200 && (await noJs.locator(".bill-main").count()) === 1 && (await noJs.locator(".landing-shell").count()) === 0 && (await noJs.innerText("body")).includes(inr(expected[id].due)), `JS off ${id}`, noJs);
    await noJs.screenshot({ path: path.join(shots, `first-paint-js-off-${id}-390.png`) });
    await noJs.goto(`${base}/bill/${id}/breakdown`);
    ok("LV-04", (await noJs.locator(".breakdown-main").count()) === 1, `JS off ${id} breakdown`, noJs);
    await noJs.screenshot({ path: path.join(shots, `first-paint-js-off-${id}-breakdown-390.png`) });
    await noJs.ctx.close();
  }
  for (const id of ids) for (const sfx of ["", "/breakdown"]) {
    const s = await openPage(browser, { width: 390, height: 844 });
    await s.addInitScript(() => { window.__sawLanding = false; new MutationObserver(() => { if (document.querySelector(".landing-shell")) window.__sawLanding = true; }).observe(document, { childList: true, subtree: true }); });
    const cdp = await s.ctx.newCDPSession(s);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 25 * 1024 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await s.goto(`${base}/bill/${id}${sfx}`, { waitUntil: "domcontentloaded" });
    const early = await s.evaluate(() => ({ content: !!document.querySelector(".bill-main, .breakdown-main"), landing: !!document.querySelector(".landing-shell"), chars: document.body.innerText.length }));
    if (id === "DEMO-7719") await s.screenshot({ path: path.join(shots, `first-paint-slow3g-6xcpu-${id}${sfx ? "-breakdown" : ""}-390.png`) });
    ok("LV-04", early.content && !early.landing && early.chars > 300, `${id}${sfx} slow, at DOMContentLoaded: ${JSON.stringify(early)}`, s);
    await s.waitForLoadState("load", { timeout: 90000 }); await sleep(2500);
    ok("LV-04", (await s.evaluate(() => window.__sawLanding)) === false, `${id}${sfx}: landing page flashed`, s);
    await s.ctx.close();
  }
  // LV-05 demo tag, 390px, both languages
  for (const lang of ["en", "hi"]) {
    const q = await openPage(browser, { width: 390, height: 844, lang });
    for (const [sfx, panel] of [["", ".amount-panel"], ["/breakdown", ".explain-total"]]) {
      await q.goto(`${base}/bill/DEMO-7719${sfx}`); await q.waitForSelector(panel); await sleep(600);
      const t = (await q.locator(`${panel} .demo-tag`).first().textContent()).trim();
      const vis = await q.locator(`${panel} .demo-tag`).first().isVisible();
      ok("LV-05", vis && t === (lang === "en" ? "Demo data" : "डेमो डेटा"), `${lang} ${sfx || "bill"}: "${t}" visible=${vis}`, q);
      await q.locator(panel).screenshot({ path: path.join(shots, `demo-tag-${sfx ? "breakdown" : "bill"}-${lang}-390.png`) });
    }
    await q.ctx.close();
  }
  // LV-06 link preview
  for (const route of ["/", "/bill/DEMO-7719"]) {
    const html = (await rawGet(base, route)).body;
    const t = { title: (html.match(/<title>([^<]*)<\/title>/) || [])[1], "og:title": meta(html, "og:title"), "og:description": meta(html, "og:description"), "og:image": meta(html, "og:image"), "og:url": meta(html, "og:url"), "og:type": meta(html, "og:type"), "twitter:card": meta(html, "twitter:card"), "twitter:image": meta(html, "twitter:image") };
    note("LV-06", `${route}: ${JSON.stringify(t)}`);
    console.log(`OG values for ${base}${route}\n` + Object.entries(t).map(([k, v]) => `  ${k}: ${v}`).join("\n"));
    ok("LV-06", !!t["og:title"] && !!t["og:description"] && /^https:\/\//.test(t["og:image"] || "") && !!t["twitter:card"], JSON.stringify(t));
    if (t["og:image"]) {
      const u = new URL(t["og:image"]); const img = await rawGet(u.origin, u.pathname + u.search);
      const w = img.buf.slice(1, 4).toString() === "PNG" ? img.buf.readUInt32BE(16) : 0, h = w ? img.buf.readUInt32BE(20) : 0;
      note("LV-06", `${t["og:image"]} -> ${img.status} ${img.headers["content-type"]} ${w}x${h} ${img.buf.length} bytes`);
      console.log(`  image: ${img.status} ${img.headers["content-type"]} ${w}x${h}`);
      ok("LV-06", img.status === 200 && w === 1200 && h === 630, `${t["og:image"]} -> ${img.status} ${w}x${h}`);
      ok("LV-06", new URL(t["og:image"]).origin === new URL(base).origin, `og:image points at ${new URL(t["og:image"]).origin}, not the site itself`);
    }
  }
  // LV-07 analytics script (real script, but the beacons it would send are blocked so the test adds nothing to your numbers)
  {
    const a = await openPage(browser, { width: 1366, height: 800, captureVa: false, realAnalytics: true });
    const seen = [];
    await a.ctx.route(/_vercel\/insights\/(view|event|session)|\/[0-9a-f]{12,}\/(view|event|session)/, (r) => { seen.push(r.request().method() + " " + new URL(r.request().url()).pathname); r.abort(); });
    a.on("response", (r) => { if (/_vercel\/insights\/script|va\.vercel-scripts|\/[0-9a-f]{12,}\/script\.js/.test(r.url())) seen.push(`script ${r.status()} ${new URL(r.url()).pathname}`); });
    await a.goto(`${base}/bill/DEMO-7719`); await a.waitForSelector(".bill-main"); await sleep(3000);
    const script = seen.find((x) => x.startsWith("script"));
    note("LV-07", `requests: ${seen.join(" | ")}`);
    ok("LV-07", !!script && /script 200/.test(script), `analytics script: ${script || "not requested"} (${seen.join(" | ")})`);
    note("LV-07", "the script sent no page-view beacon from headless Chromium (it appears to ignore automated browsers), so whether the Vercel dashboard records views has to be checked by hand");
    await a.ctx.close();
  }
  // LV-08 console errors on every screen
  for (const lang of ["en", "hi"]) {
    const c = await openPage(browser, { width: 390, height: 844, lang });
    for (const pth of ["/", "/bill/NOPE", "/faq", "/terms", ...ids.flatMap((id) => [`/bill/${id}`, `/bill/${id}/breakdown`])]) { await c.goto(base + pth); await sleep(1200); }
    await c.goto(base + "/bill/DEMO-7719"); await c.waitForSelector(".bill-main");
    await c.click(".bottom-actions > .bottom-secondary"); await c.waitForSelector(".dispute-form"); await c.click(".dispute-form button[type=submit]"); await c.waitForSelector(".reference-box strong"); await c.click(".dispute-confirmation .button-dark"); await c.waitForSelector(".modal-layer", { state: "detached" });
    await c.click(".bottom-right .button-primary"); await c.waitForSelector(".pay-modes"); await c.click(".modal-content .button-primary"); await c.waitForSelector(".receipt-rows"); await c.click(".receipt-content .button-dark"); await c.waitForSelector(".modal-layer", { state: "detached" });
    ok("LV-08", c.problems.length === 0, `${lang}: ` + c.problems.join(" | "), c);
    await c.ctx.close();
  }
  await p.ctx.close();
};
