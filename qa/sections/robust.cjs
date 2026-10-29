// RB-*: JavaScript off, slow device, blocked analytics.
const { openPage, sleep, text, rupeeTokens } = require("../lib.cjs");
const { expected, ids } = require("../expected.cjs");

module.exports = async function robust({ browser, base, rec }) {
  const { ok, note } = rec;
  // RB-01 JS off
  for (const id of ids) {
    const e = expected[id];
    const p = await openPage(browser, { width: 390, height: 844, js: false });
    for (const [suffix, sel] of [["", ".bill-main"], ["/breakdown", ".breakdown-main"]]) {
      const res = await p.goto(`${base}/bill/${id}${suffix}`);
      const txt = await p.innerText("body");
      ok("RB-01", res.status() === 200 && (await p.locator(sel).count()) === 1 && rupeeTokens(txt).includes(e.due) && /hackathon prototype/i.test(txt), `JS off /bill/${id}${suffix}: status ${res.status()}`, p);
    }
    // links still work without JS
    await p.goto(base + "/");
    await p.click(`a.sample-card[href$="${id}"]`);
    ok("RB-01", (await p.locator(".bill-main").count()) === 1 && p.url().endsWith(id), "sample card did not navigate with JS off: " + p.url(), p);
    await p.ctx.close();
  }
  // RB-02 slow device, every deep link
  {
    const fcps = [];
    for (const id of ids) for (const suffix of ["", "/breakdown"]) {
      const p = await openPage(browser, { width: 390, height: 844 });
      await p.addInitScript(() => {
        window.__sawLanding = false; window.__sawBlank = null;
        const check = () => { if (document.querySelector(".landing-shell")) window.__sawLanding = true; };
        new MutationObserver(check).observe(document, { childList: true, subtree: true });
      });
      const cdp = await p.ctx.newCDPSession(p);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 25 * 1024 }); // ~Slow 3G
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
      await p.goto(`${base}/bill/${id}${suffix}`, { waitUntil: "domcontentloaded" });
      const early = await p.evaluate(() => ({ content: !!document.querySelector(".bill-main, .breakdown-main"), landing: !!document.querySelector(".landing-shell"), text: document.body.innerText.length }));
      ok("RB-02", early.content && !early.landing && early.text > 300, `${id}${suffix} at DOMContentLoaded: ${JSON.stringify(early)}`, p);
      await p.waitForLoadState("load", { timeout: 60000 }); await sleep(2500);
      ok("RB-02", (await p.evaluate(() => window.__sawLanding)) === false, `${id}${suffix}: the landing page appeared at some point`, p);
      ok("RB-02", (await p.locator(".app-shell").count()) === 1 && (await p.evaluate(() => document.body.innerText.length)) > 300, "blank after load", p);
      const fcp = await p.evaluate(() => performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null);
      if (fcp) fcps.push(Math.round(fcp));
      ok("RB-02", !p.problems.some((x) => /pageerror/.test(x)), p.problems.join(" | "), p);
      await p.ctx.close();
    }
    note("RB-02", `first contentful paint under Slow 3G + 6× CPU (all six deep links): ${fcps.join(", ")} ms`);
  }
  // RB-04 analytics blocked
  {
    const p = await openPage(browser, { width: 390, height: 844, blockAnalytics: true, captureVa: false });
    const ignorable = (x) => /ERR_BLOCKED_BY_CLIENT|Failed to load resource/.test(x) && !/pageerror/.test(x);
    await p.goto(base + "/bill/DEMO-7719/breakdown"); await p.waitForSelector(".breakdown-main"); await sleep(800);
    await p.locator(".calc-trigger").nth(2).click(); await sleep(400);
    await p.locator(".calc-line.is-open .question-button").click(); await p.waitForSelector(".dispute-form");
    await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong");
    await p.click(".dispute-confirmation .button-dark"); await p.waitForSelector(".modal-layer", { state: "detached" });
    await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows");
    await p.click(".receipt-content .button-dark"); await p.waitForSelector(".modal-layer", { state: "detached" });
    const paidOk = /paid/i.test(await p.innerText(".amount-panel"));
    await p.click(".lang-toggle button:last-child"); await sleep(400);
    const errs = p.problems.filter((x) => !ignorable(x));
    ok("RB-04", errs.length === 0 && paidOk, `with analytics blocked: paid=${paidOk} ` + errs.join(" | "), p);
    note("RB-04", "browser-level 'blocked by client' resource errors are expected and excluded");
    await p.ctx.close();
  }
};
