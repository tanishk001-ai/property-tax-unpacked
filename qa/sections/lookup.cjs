// LK-*: landing page and property lookup.
const { openPage, sleep } = require("../lib.cjs");

module.exports = async function lookup({ browser, base, rec }) {
  const { ok } = rec;
  const page = await openPage(browser, { width: 1366, height: 768 });
  const mobile = await openPage(browser, { width: 390, height: 844 });
  const search = async (pg, value, { press = false } = {}) => {
    await pg.goto(base + "/");
    await pg.waitForSelector("#property-id");
    await pg.fill("#property-id", value);
    if (press) await pg.press("#property-id", "Enter"); else await pg.click(".lookup-controls button[type=submit]");
  };

  // LK-01
  await page.goto(base + "/"); await page.waitForSelector(".landing-shell"); await sleep(800);
  ok("LK-01", (await page.locator("a.sample-card").count()) === 3 && (await page.locator("#property-id").count()) === 1 && (await page.locator(".prototype-note").count()) >= 1 && /prototype/i.test(await page.textContent(".prototype-note")), "landing structure", page);
  ok("LK-01", page.problems.length === 0, page.problems.join(" | "), page);

  // LK-02..05, 12
  for (const [id, value, press] of [["LK-02", "DEMO-7719"], ["LK-03", "demo-7719"], ["LK-04", "DeMo-2048"], ["LK-05", "  DEMO-3982  "], ["LK-12", "DEMO-2048", true]]) {
    await search(page, value, { press });
    try { await page.waitForSelector(".bill-main", { timeout: 6000 }); ok(id, /\/bill\/DEMO-\d{4}$/.test(page.url()), page.url(), page); }
    catch { ok(id, false, `typing ${JSON.stringify(value)} did not open a bill; url ${page.url()}`, page); }
  }
  // LK-06..09: bad input
  const bad = [["LK-06", ""], ["LK-07", "     "], ["LK-08", "🏠💸"], ["LK-09", "X".repeat(600)], ["LK-13", "<img src=x onerror=window.__xss=1>"], ["LK-13", "<script>window.__xss=1</script>"]];
  for (const [id, value] of bad) {
    await search(page, value);
    await sleep(300);
    const err = await page.locator("#lookup-error").count();
    const stayed = (await page.locator(".landing-shell").count()) === 1 && page.url().replace(/\/$/, "") === base;
    ok(id, err === 1 && stayed, `value ${JSON.stringify(value.slice(0, 20))}: error=${err} stayed=${stayed} url=${page.url()}`, page);
    if (id === "LK-09") {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(id, over <= 0, `600-char input made the page ${over}px too wide`, page);
      await search(mobile, value); await sleep(300);
      const overM = await mobile.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(id, overM <= 0, `600-char input made the 390px page ${overM}px too wide`, mobile);
    }
    if (id === "LK-13") {
      const xss = await page.evaluate(() => ({ flag: window.__xss, injected: !!document.querySelector("img[src='x'], .landing-shell script") }));
      ok(id, !xss.flag && !xss.injected, JSON.stringify(xss), page);
    }
  }
  // LK-10 error clears on typing
  await search(page, "NOPE"); await page.waitForSelector("#lookup-error");
  await page.type("#property-id", "X");
  await sleep(200);
  ok("LK-10", (await page.locator("#lookup-error").count()) === 0, "error still visible after typing", page);
  // LK-11
  await page.goto(base + "/"); await page.waitForSelector(".lookup-subrow .text-button");
  await page.click(".lookup-subrow .text-button");
  try { await page.waitForSelector(".bill-main", { timeout: 6000 }); ok("LK-11", true); } catch { ok("LK-11", false, "no bill after clicking the sample button", page); }
  // LK-14 field size
  await mobile.goto(base + "/"); await mobile.waitForSelector("#property-id");
  const fs = await mobile.$eval("#property-id", (e) => parseFloat(getComputedStyle(e).fontSize));
  ok("LK-14", fs >= 16, `input font-size is ${fs}px (iOS zooms the page below 16px)`, mobile);
  // LK-15 sample cards
  await page.goto(base + "/"); await page.waitForSelector("a.sample-card");
  const hrefs = await page.$$eval("a.sample-card", (as) => as.map((a) => a.getAttribute("href")));
  ok("LK-15", hrefs.join() === "/bill/DEMO-2048,/bill/DEMO-7719,/bill/DEMO-3982", hrefs.join());
  await page.focus("a.sample-card"); await page.keyboard.press("Enter");
  try { await page.waitForSelector(".bill-main", { timeout: 6000 }); ok("LK-15", /DEMO-2048$/.test(page.url()), page.url(), page); } catch { ok("LK-15", false, "Enter on a focused card did not open the bill", page); }
  // new tab via middle-click must not navigate the current tab
  await page.goto(base + "/"); await page.waitForSelector("a.sample-card");
  const [popup] = await Promise.all([page.context().waitForEvent("page", { timeout: 4000 }).catch(() => null), page.click("a.sample-card >> nth=1", { button: "middle" })]);
  await sleep(500);
  ok("LK-15", page.url().replace(/\/$/, "") === base && popup && /DEMO-7719$/.test(popup.url()), `middle-click: current ${page.url()}, popup ${popup && popup.url()}`, page);
  if (popup) await popup.close();

  // LK-16 landing visible before JavaScript runs
  for (const [label, opts] of [["JS off", { js: false }]]) {
    const p = await openPage(browser, { width: 390, height: 844, ...opts });
    await p.goto(base + "/"); await sleep(1000); // the CSS entrance animation needs ~0.6s
    const vis = await p.evaluate(() => {
      const el = document.querySelector(".landing-hero h1");
      if (!el) return { found: false };
      let o = 1; for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
      return { found: true, opacity: o };
    });
    ok("LK-16", vis.found && vis.opacity > 0.9, `${label}: landing headline opacity ${vis.opacity}`, p);
    await p.ctx.close();
  }
  {
    const p = await openPage(browser, { width: 390, height: 844 });
    const cdp = await p.ctx.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await p.goto(base + "/", { waitUntil: "domcontentloaded" });
    await sleep(1000); // scripts are still downloading on this connection; the CSS animation must not depend on them
    const vis = await p.evaluate(() => {
      const el = document.querySelector(".landing-hero h1");
      let o = 1; for (let n = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
      return { opacity: o, scriptsRan: typeof window.next !== "undefined" };
    });
    ok("LK-16", vis.opacity > 0.9, `slow device at DOMContentLoaded: landing headline opacity ${vis.opacity}`, p);
    await p.ctx.close();
  }
  for (const p of [page, mobile]) await p.ctx.close();
};
