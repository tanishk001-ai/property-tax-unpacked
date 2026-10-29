// WK-*: the same journey in WebKit with an iPhone profile.
const { pw, sleep } = require("../lib.cjs");
const { expected, ids } = require("../expected.cjs");

module.exports = async function webkit({ base, rec }) {
  const { ok } = rec;
  let browser;
  try { browser = await pw.webkit.launch(); } catch (e) { await ok("WK-01", false, "WebKit unavailable: " + String(e).split("\n")[0]); return; }
  const device = pw.devices["iPhone 13"];
  const open = async (lang) => {
    const ctx = await browser.newContext({ ...device });
    await ctx.addInitScript((l) => { try { localStorage.setItem("unpacked.lang", l); } catch {} window.__va = []; window.va = (...a) => window.__va.push(a); }, lang);
    await ctx.route(/va\.vercel-scripts\.com|_vercel\/insights/, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
    const page = await ctx.newPage(); const problems = [];
    page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") problems.push("console.error: " + m.text()); });
    page.problems = problems; page.ctx = ctx; return page;
  };
  const shot = async (p, name) => { try { await p.screenshot({ path: `${__dirname}/../screenshots/after/${name}.png` }); } catch {} };
  const p = await open("en");
  await p.goto(base + "/"); await p.waitForSelector(".landing-shell"); await sleep(900);
  ok("WK-01", (await p.locator("a.sample-card").count()) === 3, "landing cards", p);
  for (const id of ids) for (const sfx of ["", "/breakdown"]) {
    await p.goto(`${base}/bill/${id}${sfx}`); await p.waitForSelector(sfx ? ".breakdown-main" : ".bill-main"); await sleep(400);
    const body = await p.innerText("body");
    ok("WK-01", body.includes("₹" + expected[id].due.toLocaleString("en-IN")) , `${id}${sfx}: amount not shown`, p);
  }
  ok("WK-01", p.problems.length === 0, p.problems.join(" | "), p);
  // WK-02 journey
  await p.goto(base + "/"); await p.waitForSelector(".landing-shell");
  await p.click('a.sample-card[href$="DEMO-7719"]'); await p.waitForSelector(".bill-main");
  await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main");
  await p.locator(".calc-trigger").nth(4).click(); await sleep(600);
  await p.locator(".calc-line.is-open .question-button").click(); await p.waitForSelector(".dispute-form");
  ok("WK-02", (await p.inputValue("#dispute-line")) === "annual-tax", "dispute line", p);
  await shot(p, "ok-webkit-dispute-390");
  await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong");
  ok("WK-02", /^DPT-7719-\d{6}-[A-Z0-9]{4}$/.test((await p.textContent(".reference-box strong")).trim()), "dispute ref", p);
  await p.click(".dispute-confirmation .button-dark"); await p.waitForSelector(".modal-layer", { state: "detached" });
  await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes");
  await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows");
  await shot(p, "ok-webkit-receipt-390");
  await p.keyboard.press("Escape"); await sleep(700);
  ok("WK-02", /paid/i.test(await p.innerText(".amount-panel")), "payment not recorded after Escape", p);
  await p.click(".lang-toggle button:last-child"); await sleep(500);
  ok("WK-02", /[ऀ-ॿ]/.test(await p.innerText("#bill-title")), "Hindi toggle", p);
  ok("WK-02", p.problems.length === 0, p.problems.join(" | "), p);
  await p.ctx.close();
  // WK-03 layout
  for (const lang of ["en", "hi"]) {
    const q = await open(lang);
    for (const id of ids) for (const [sfx, sel] of [["", ".bill-main"], ["/breakdown", ".breakdown-main"]]) {
      await q.goto(`${base}/bill/${id}${sfx}`); await q.waitForSelector(sel); await sleep(500);
      const r = await q.evaluate(async () => {
        const out = { overflow: document.documentElement.scrollWidth - window.innerWidth };
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }); await new Promise((r) => setTimeout(r, 400));
        const foot = document.querySelector(".page-footer"), bar = document.querySelector(".bottom-wrap");
        out.footerOverlap = Math.round(foot.getBoundingClientRect().bottom - bar.getBoundingClientRect().top);
        return out;
      });
      ok("WK-03", r.overflow <= 0 && r.footerOverlap <= 0, `${lang} ${id}${sfx}: ${JSON.stringify(r)}`, q);
    }
    if (lang === "hi") { await q.goto(base + "/bill/DEMO-3982"); await q.waitForSelector(".bill-main"); await sleep(700); await shot(q, "ok-webkit-bill-hi-390"); }
    await q.ctx.close();
  }
  await browser.close();
};
