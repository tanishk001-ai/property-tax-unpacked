// LG-*, FQ-*: language toggle, persistence, Hindi coverage, FAQ and terms.
const { openPage, sleep, text } = require("../lib.cjs");
const { ids } = require("../expected.cjs");

const LATIN_ALLOW = new Set(["Unpacked", "UPI", "QR", "EN"]);
const STRIP = [/DEMO-\d{4}/g, /KH-\d{4}\/\d+/g, /(RCT|DPT)-\d{4}-\d{6}-[A-Z0-9]{4}/g, /\b\d+\/\d+[A-Z]?\b/g];
const DEVANAGARI = /[ऀ-ॿ]/;

async function scan(page) {
  const lines = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const el = n.parentElement; if (!el || el.closest("script,style,noscript")) continue;
      const st = getComputedStyle(el); if (st.display === "none" || st.visibility === "hidden") continue;
      const t = n.textContent.trim(); if (t) out.push(t);
    }
    document.querySelectorAll("[aria-label],[title],[placeholder],[alt]").forEach((el) => ["aria-label", "title", "placeholder", "alt"].forEach((a) => { const v = el.getAttribute(a); if (v) out.push("@" + a + ": " + v); }));
    document.querySelectorAll("svg title").forEach((t) => out.push("@svg title: " + t.textContent));
    document.querySelectorAll("option").forEach((o) => out.push(o.textContent));
    out.push("@document.title: " + document.title);
    return out;
  });
  const found = [];
  for (const l of lines) {
    let x = l.replace(/^@[\w .-]+: /, ""); for (const re of STRIP) x = x.replace(re, " ");
    const words = (x.match(/[A-Za-z][A-Za-z'’]+/g) || []).filter((w) => !LATIN_ALLOW.has(w));
    if (words.length) found.push(`${l.slice(0, 90)}  ⟶ ${words.join(",")}`);
  }
  return found;
}
const settle = (page) => page.waitForFunction(() => document.documentElement.lang === "hi" && DEVANAGARI_TITLE(), null, { timeout: 8000 }).catch(() => {});
// (the title helper is installed per page below)
const installHelpers = (page) => page.addInitScript(() => { window.DEVANAGARI_TITLE = () => /[ऀ-ॿ]/.test(document.title); });
const modalGone = (page) => page.waitForSelector(".modal-layer", { state: "detached", timeout: 5000 });

module.exports = async function lang({ browser, base, rec }) {
  const { ok, note } = rec;

  // ---- LG-01 toggle on every screen (+ LG-08) ----
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    const screens = [["/", ".landing-shell", "h1"], ["/bill/NOPE-1", ".landing-shell", "h1"], ["/bill/DEMO-7719", ".bill-main", "#bill-title"], ["/bill/DEMO-7719/breakdown", ".breakdown-main", ".explain-intro h1"], ["/faq", ".faq-list", "h1"], ["/terms", ".terms-page h1", "h1"]];
    for (const [path, sel, h] of screens) {
      await p.goto(base + path); await p.waitForSelector(sel); await sleep(700);
      await p.evaluate(() => { window.__marker = 1; });
      const en = await text(p, h);
      await p.click(".lang-toggle button:last-child"); await sleep(500);
      const hi = await text(p, h);
      const attr = await p.evaluate(() => document.documentElement.lang);
      ok("LG-01", DEVANAGARI.test(hi) && !DEVANAGARI.test(en.replace(/हिं/g, "")) && attr === "hi", `${path}: en "${en}" hi "${hi}" html lang ${attr}`, p);
      ok("LG-08", attr === "hi", `html lang ${attr} on ${path}`, p);
      await p.click(".lang-toggle button:first-child"); await sleep(500);
      const back = await text(p, h);
      ok("LG-01", back === en && (await p.evaluate(() => document.documentElement.lang)) === "en" && (await p.evaluate(() => window.__marker)) === 1 && p.url() === base + path, `${path}: back to EN gave "${back}"`, p);
    }
    // LG-03 expanded line stays expanded
    await p.goto(base + "/bill/DEMO-3982/breakdown"); await p.waitForSelector(".breakdown-main");
    await p.locator(".calc-trigger").nth(5).click(); await sleep(500);
    await p.click(".lang-toggle button:last-child"); await sleep(600);
    ok("LG-03", (await p.locator(".calc-trigger").nth(5).getAttribute("aria-expanded")) === "true" && (await p.locator(".calc-detail").count()) === 1, "expanded line collapsed after toggling the language", p);
    // LG-02 confirmation survives the toggle
    await p.goto(base + "/bill/DEMO-7719"); await p.waitForSelector(".bill-main");
    await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form");
    await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong");
    const ref = await text(p, ".reference-box strong");
    await p.evaluate(() => document.querySelector(".lang-toggle button:first-child").click()); await sleep(500);
    ok("LG-02", (await text(p, ".reference-box strong")) === ref && (await p.locator(".dispute-confirmation").count()) === 1, "confirmation changed after the toggle", p);
    ok("RB-03", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // ---- LG-04 persistence ----
  {
    const p = await openPage(browser, { width: 1366, height: 900, lang: null });
    await p.goto(base + "/bill/DEMO-2048"); await p.waitForSelector(".bill-main");
    await p.click(".lang-toggle button:last-child"); await sleep(400);
    await p.reload(); await p.waitForSelector(".bill-main"); await sleep(600);
    const a = DEVANAGARI.test(await text(p, "#bill-title")) && (await p.evaluate(() => document.documentElement.lang)) === "hi";
    await p.goto(base + "/bill/DEMO-3982/breakdown"); await p.waitForSelector(".breakdown-main"); await sleep(600);
    const b = DEVANAGARI.test(await text(p, ".explain-intro h1"));
    const p2 = await p.ctx.newPage(); await p2.goto(base + "/"); await p2.waitForSelector(".landing-shell"); await sleep(700);
    const c = DEVANAGARI.test(await text(p2, "h1"));
    ok("LG-04", a && b && c, `refresh ${a}, deep link ${b}, new tab ${c}`, p);
    await p.ctx.close();
  }
  // ---- LG-05 storage blocked ----
  for (const lng of ["en", "hi"]) {
    const p = await openPage(browser, { width: 390, height: 844, blockStorage: true, lang: lng });
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell"); await sleep(600);
    await p.click('a.sample-card[href$="DEMO-7719"]'); await p.waitForSelector(".bill-main");
    await p.click(".lang-toggle button:last-child"); await sleep(500);
    const hi = DEVANAGARI.test(await text(p, "#bill-title"));
    await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main");
    ok("LG-05", hi && (await p.locator(".breakdown-main").count()) === 1, "toggle or navigation failed with storage blocked", p);
    ok("LG-05", !p.problems.some((x) => /pageerror|SecurityError|denied/.test(x)), p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // ---- LG-10 how long does a Hindi reader see English? ----
  {
    const p = await openPage(browser, { width: 390, height: 844, lang: "hi" });
    await p.addInitScript(() => {
      window.__t = { en: null, hi: null };
      const check = () => { const h = document.querySelector("h1"); if (!h) return; const hasHi = /[ऀ-ॿ]/.test(h.textContent); if (!hasHi && window.__t.en === null) window.__t.en = Math.round(performance.now()); if (hasHi && window.__t.hi === null) window.__t.hi = Math.round(performance.now()); };
      new MutationObserver(check).observe(document, { childList: true, subtree: true, characterData: true });
      document.addEventListener("DOMContentLoaded", check);
    });
    await p.goto(base + "/bill/DEMO-7719"); await sleep(2500);
    const t = await p.evaluate(() => window.__t);
    note("LG-10", `Hindi reader, deep link: English headline first visible at ${t.en}ms, Hindi at ${t.hi}ms (fast local connection)`);
    ok("LG-10", t.hi !== null && t.hi - (t.en ?? 0) < 1500, JSON.stringify(t), p);
    await p.ctx.close();
  }
  // ---- LG-06 / LG-07 Hindi coverage at 390 and 1366 ----
  for (const vp of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    const p = await openPage(browser, { ...vp, lang: "hi" });
    await installHelpers(p);
    const leaks = [];
    const check = async (label) => { await settle(p); (await scan(p)).forEach((x) => leaks.push(`[${label}] ${x}`)); };
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell"); await sleep(900); await check("landing");
    await p.goto(base + "/bill/NOPE-1"); await p.waitForSelector("#lookup-error"); await check("unknown id");
    await p.goto(base + "/nope"); await sleep(600); await check("404 page"); p.problems.length = 0; // a 404 response is logged by the browser; expected here
    for (const id of ids) {
      await p.goto(base + "/bill/" + id); await p.waitForSelector(".bill-main"); await sleep(400); await check(`bill ${id}`);
      await p.goto(base + `/bill/${id}/breakdown`); await p.waitForSelector(".breakdown-main"); await sleep(300);
      const triggers = await p.$$(".calc-trigger");
      for (let i = 0; i < triggers.length; i++) { await triggers[i].click(); await sleep(450); await check(`breakdown ${id} line ${i}`); }
    }
    for (const id of ["DEMO-7719", "DEMO-3982"]) {
      await p.goto(base + "/bill/" + id); await p.waitForSelector(".bill-main"); await sleep(300);
      await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); await sleep(500); await check(`dispute form ${id}`);
      await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".dispute-confirmation"); await sleep(300); await check(`dispute confirmation ${id}`);
      await p.click(".dispute-confirmation .button-dark"); await modalGone(p);
      await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await sleep(500); await check(`payment modal ${id}`);
      await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); await sleep(300); await check(`receipt ${id}`);
      const ts = await text(p, ".receipt-rows > div:last-child dd");
      ok("LG-07", /^\d{1,2} \S+ \d{4}, \d{2}:\d{2} भारतीय समय$/.test(ts) && !/[A-Za-z]/.test(ts), `hi receipt timestamp "${ts}"`, p);
      await p.click(".receipt-content .button-dark"); await modalGone(p); await sleep(300); await check(`paid bill ${id}`);
    }
    await p.goto(base + "/faq"); await p.waitForSelector(".faq-list"); await sleep(300); await check("faq");
    ok("FQ-01", (await p.locator(".faq-item").count()) === 8, "hi faq items " + await p.locator(".faq-item").count(), p);
    await p.goto(base + "/terms"); await p.waitForSelector(".terms-page h1"); await sleep(300); await check("terms");
    const uniq = [...new Set(leaks)];
    ok("LG-06", uniq.length === 0, `@${vp.width}px: ` + uniq.slice(0, 10).join("\n"), p);
    ok("RB-03", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // ---- LG-07 dates in both languages; en receipt timestamp ----
  {
    const p = await openPage(browser, { width: 1366, height: 900, lang: "hi" });
    for (const id of ids) {
      await p.goto(base + "/bill/" + id); await p.waitForSelector(".bill-main"); await sleep(500);
      const dd = (await p.$$eval(".summary-info .property-stat dd", (e) => e.map((x) => x.textContent.trim()))).slice(0, 3).join(" | ");
      ok("BL-10", /(जनवरी|फ़रवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)/.test(dd) && !/[A-Za-z]/.test(dd), `hi dates: ${dd}`, p);
    }
    await p.ctx.close();
    const q = await openPage(browser, { width: 1366, height: 900 });
    await q.goto(base + "/bill/DEMO-2048"); await q.waitForSelector(".bill-main");
    await q.click(".bottom-right .button-primary"); await q.waitForSelector(".pay-modes"); await q.click(".modal-content .button-primary"); await q.waitForSelector(".receipt-rows");
    const ts = await text(q, ".receipt-rows > div:last-child dd");
    ok("LG-07", /^\d{2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} (am|pm) IST$/.test(ts), `en receipt timestamp "${ts}"`, q);
    await q.ctx.close();
  }
  // ---- FQ-01/02/03 ----
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    await p.goto(base + "/faq"); await p.waitForSelector(".faq-list");
    ok("FQ-01", (await p.locator(".faq-item").count()) === 8 && (await p.locator(".faq-q").count()) === 8 && (await p.locator(".faq-a").count()) === 8, "faq structure", p);
    await p.goto(base + "/terms"); await p.waitForSelector(".terms-page h1");
    ok("FQ-02", /prototype/i.test(await p.innerText("main")), "terms text", p);
    for (const path of ["/", "/bill/DEMO-7719", "/bill/DEMO-7719/breakdown", "/bill/NOPE"]) {
      await p.goto(base + path); await sleep(500);
      const t = (await p.locator(".prototype-note").allInnerTexts()).join(" ");
      ok("FQ-03", /hackathon prototype/i.test(t) && /not a government product/i.test(t), `${path}: ${t.slice(0, 80)}`, p);
    }
    for (const path of ["/", "/bill/DEMO-7719", "/bill/DEMO-3982/breakdown"]) {
      const noJs = await openPage(browser, { width: 390, height: 844, js: false });
      await noJs.goto(base + path);
      const t = (await noJs.locator(".prototype-note").allInnerTexts()).join(" ");
      ok("FQ-03", /hackathon prototype/i.test(t), `JS off ${path}: "${t.slice(0, 60)}"`, noJs);
      await noJs.ctx.close();
    }
    await p.ctx.close();
  }
};
