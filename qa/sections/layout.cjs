// LY-*, LG-09: layouts across widths, languages, orientations, modals on short screens.
const { openPage, sleep, text } = require("../lib.cjs");
const { ids } = require("../expected.cjs");

const WIDTHS = [[320, 640], [360, 740], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]];
const modalGone = (page) => page.waitForSelector(".modal-layer", { state: "detached", timeout: 5000 });

// Everything that can go wrong with a fixed header/bar and page width, measured in the page.
async function measure(p, hasBar) {
  return p.evaluate(async (hasBarArg) => {
    const res = { overflowX: document.documentElement.scrollWidth - window.innerWidth, covered: [], clipped: [], beyond: [] };
    const total = document.documentElement.scrollHeight;
    const step = Math.max(200, window.innerHeight / 2);
    const interactive = [...document.querySelectorAll("a[href], button, input, select, textarea")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== "hidden"; });
    const inBar = (e) => !!e.closest(".bottom-wrap, .app-header, .modal-layer");
    // 1. every interactive element can be scrolled to a place where nothing sits on top of it
    for (const el of interactive) {
      if (inBar(el)) continue;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      await new Promise((r) => setTimeout(r, 20));
      const r = el.getBoundingClientRect();
      let hit = document.elementFromPoint(Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1), Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1));
      if (hit && !(el === hit || el.contains(hit) || hit.contains(el))) {
        // at the very bottom of the page the element may legitimately sit under the bar: that is the real bug we want to catch
        res.covered.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}" under ${hit.tagName.toLowerCase()}.${String(hit.className).split(" ")[0]}`);
      }
    }
    // 2. last content clears the bottom bar
    window.scrollTo({ top: total, behavior: "instant" }); await new Promise((r) => setTimeout(r, 120));
    const bar = document.querySelector(".bottom-wrap");
    if (hasBarArg && bar) {
      const lastBlock = document.querySelector(".page-footer") || document.querySelector("main");
      res.footerOverlap = Math.round(lastBlock.getBoundingClientRect().bottom - bar.getBoundingClientRect().top);
    } else {
      res.mainBelowViewport = Math.round(document.querySelector("main").getBoundingClientRect().bottom - window.innerHeight);
    }
    window.scrollTo({ top: 0, behavior: "instant" }); await new Promise((r) => setTimeout(r, 120));
    const header = document.querySelector(".app-header");
    if (header) { const h = header.getBoundingClientRect(); const first = document.querySelector("main").firstElementChild.getBoundingClientRect(); res.headerOverlap = Math.round(h.bottom - first.top); }
    // 3. clipped text in controls
    for (const el of document.querySelectorAll("button, .button, .property-pill, .status-badge, .lang-toggle, .history-status, .sample-card, .back-button, input")) {
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible") res.clipped.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${el.scrollWidth}>${el.clientWidth}`);
    }
    // 4. anything poking out of the viewport on the right
    for (const el of document.body.querySelectorAll("*")) {
      const st = getComputedStyle(el); if (st.position === "fixed" || st.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > window.innerWidth + 1 && !el.closest("svg") && !(el.closest(".formula-text"))) { res.beyond.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} right=${Math.round(r.right)}`); if (res.beyond.length > 4) break; }
    }
    return res;
  }, hasBar);
}
function problems(label, r) {
  const out = [];
  if (r.overflowX > 0) out.push(`${label}: horizontal overflow ${r.overflowX}px`);
  if (r.covered.length) out.push(`${label}: covered by sticky UI: ${r.covered.slice(0, 3).join("; ")}`);
  if (r.footerOverlap > 0) out.push(`${label}: bottom bar covers ${r.footerOverlap}px of the last content`);
  if (r.mainBelowViewport > 0) out.push(`${label}: content runs ${r.mainBelowViewport}px below the viewport`);
  if (r.headerOverlap > 0) out.push(`${label}: header covers the first block by ${r.headerOverlap}px`);
  if (r.clipped.length) out.push(`${label}: clipped text ${r.clipped.slice(0, 3).join("; ")}`);
  if (r.beyond.length) out.push(`${label}: elements beyond the right edge ${r.beyond.slice(0, 3).join("; ")}`);
  return out;
}

module.exports = async function layout({ browser, base, rec }) {
  const { ok } = rec;
  const screens = [["landing", "/", ".landing-shell", false], ["unknown id", "/bill/NOPE-1", ".landing-shell", false], ...ids.flatMap((id) => [[`bill ${id}`, `/bill/${id}`, ".bill-main", true], [`breakdown ${id}`, `/bill/${id}/breakdown`, ".breakdown-main", true]]), ["faq", "/faq", ".faq-list", false], ["terms", "/terms", ".terms-page h1", false]];

  // LY-01 widths × screens × languages (LG-09 = Hindi at 320)
  for (const [w, h] of WIDTHS) for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: w, height: h, lang });
    const issues = [];
    for (const [label, path, sel, bar] of screens) {
      await p.goto(base + path); await p.waitForSelector(sel); await sleep(500);
      if (/breakdown/.test(label)) { const t = p.locator(".calc-trigger"); await t.nth(0).click(); await sleep(450); } // layout with an open line too
      issues.push(...problems(`${label}`, await measure(p, bar)));
    }
    ok("LY-01", issues.length === 0, `${lang} @${w}×${h}\n` + issues.slice(0, 8).join("\n"), p);
    if (w === 320 && lang === "hi") ok("LG-09", issues.length === 0, issues.slice(0, 8).join("\n"), p);
    if (w === 320 && lang === "en") ok("LG-09", true);
    ok("RB-03", p.problems.length === 0, `${lang} @${w}: ` + p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // LY-02 phone landscape
  for (const [w, h] of [[640, 360], [844, 390], [736, 414]]) for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: w, height: h, lang, mobile: true });
    const issues = [];
    for (const [label, path, sel, bar] of screens.filter((s) => /landing|DEMO-3982|DEMO-7719|faq/.test(s[0]))) {
      await p.goto(base + path); await p.waitForSelector(sel); await sleep(500);
      issues.push(...problems(label, await measure(p, bar)));
    }
    ok("LY-02", issues.length === 0, `${lang} landscape ${w}×${h}\n` + issues.slice(0, 6).join("\n"), p);
    await p.ctx.close();
  }
  // LY-05 200% zoom of a 1366 desktop = 683×384 css px; and 400% of 1280 = 320
  for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: 683, height: 384, lang, mobile: false });
    const issues = [];
    for (const [label, path, sel, bar] of screens.filter((s) => /landing|bill DEMO-3982|breakdown DEMO-7719/.test(s[0]))) {
      await p.goto(base + path); await p.waitForSelector(sel); await sleep(500);
      issues.push(...problems(label, await measure(p, bar)));
    }
    ok("LY-05", issues.length === 0, `${lang} 200% zoom 683×384\n` + issues.slice(0, 6).join("\n"), p);
    await p.ctx.close();
  }
  // LY-03/04 modals on short screens
  for (const [w, h] of [[390, 568], [320, 568], [360, 480]]) for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: w, height: h, lang });
    await p.goto(base + "/bill/DEMO-7719"); await p.waitForSelector(".bill-main"); await sleep(500);
    const check = async (label) => {
      const r = await p.evaluate(async () => {
        const card = document.querySelector(".modal-card"); if (!card) return { missing: true };
        const out = { cardHeight: Math.round(card.getBoundingClientRect().height), vh: window.innerHeight, overflowX: card.scrollWidth - card.clientWidth };
        card.scrollTop = 0; await new Promise((r) => setTimeout(r, 60));
        const close = card.querySelector(".modal-close")?.getBoundingClientRect();
        out.closeVisibleAtTop = !!close && close.top >= 0 && close.bottom <= window.innerHeight && close.right <= window.innerWidth;
        card.scrollTop = card.scrollHeight; await new Promise((r) => setTimeout(r, 60));
        const btns = [...card.querySelectorAll("button.button, .modal-cancel, .button-full")];
        const last = btns[btns.length - 1]?.getBoundingClientRect();
        out.lastButtonVisibleAtBottom = !!last && last.top >= 0 && last.bottom <= window.innerHeight + 1;
        out.pageScrollWidth = document.documentElement.scrollWidth - window.innerWidth;
        return out;
      });
      const bad = r.missing || r.cardHeight > r.vh || !r.closeVisibleAtTop || !r.lastButtonVisibleAtBottom || r.overflowX > 0 || r.pageScrollWidth > 0;
      ok(lang === "hi" || w === 320 ? "LY-04" : "LY-03", !bad, `${lang} ${w}×${h} ${label}: ${JSON.stringify(r)}`, p);
    };
    await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); await sleep(500); await check("dispute form");
    await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong"); await sleep(400); await check("dispute confirmation");
    await p.click(".dispute-confirmation .button-dark"); await modalGone(p);
    await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await sleep(500); await check("payment");
    await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); await sleep(400); await check("receipt");
    await p.ctx.close();
  }
  // LY-06 reduced motion
  for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: 390, height: 844, lang, reducedMotion: "reduce" });
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell"); await sleep(1200);
    const o = await p.evaluate(() => { const el = document.querySelector(".landing-hero h1"); let v = 1; for (let n = el; n; n = n.parentElement) v *= parseFloat(getComputedStyle(n).opacity); const cards = [...document.querySelectorAll(".sample-card")].map((c) => parseFloat(getComputedStyle(c).opacity)); return { h1: v, cards }; });
    ok("LY-06", o.h1 > 0.95 && o.cards.every((x) => x > 0.95), JSON.stringify(o), p);
    await p.click('a.sample-card[href$="DEMO-7719"]'); await p.waitForSelector(".bill-main");
    await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); await sleep(600);
    const m = await p.evaluate(() => { const el = document.querySelector(".modal-card"); let v = 1; for (let n = el; n; n = n.parentElement) v *= parseFloat(getComputedStyle(n).opacity); return v; });
    ok("LY-06", m > 0.95, "modal opacity " + m, p);
    await p.ctx.close();
  }
  // LY-07 dark mode: nothing may become unreadable (the app is light-only, so it should stay legible)
  {
    const p = await openPage(browser, { width: 390, height: 844, colorScheme: "dark" });
    const lum = (rgb) => { const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const parse = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    for (const path of ["/", "/bill/DEMO-7719", "/bill/DEMO-7719/breakdown", "/faq"]) {
      await p.goto(base + path); await sleep(900);
      const c = await p.evaluate(() => { const cs = (e) => getComputedStyle(e); const sel = document.querySelector("input, h1"); return { body: [cs(document.body).color, cs(document.body).backgroundColor], html: cs(document.documentElement).backgroundColor, field: sel ? [cs(sel).color, cs(sel).backgroundColor] : null, scheme: cs(document.documentElement).colorScheme }; });
      const ratio = (a, b) => { const l1 = lum(parse(a)), l2 = lum(parse(b)); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
      const r = ratio(c.body[0], c.body[1].startsWith("rgba(0, 0, 0, 0)") ? c.html : c.body[1]);
      ok("LY-07", r >= 7, `${path}: body text/background contrast ${r.toFixed(1)} in OS dark mode (${JSON.stringify(c)})`, p);
    }
    await p.goto(base + "/bill/DEMO-7719"); await sleep(700);
    await p.screenshot({ path: __dirname + "/../screenshots/after/ok-dark-mode-bill-390.png" });
    await p.ctx.close();
  }
};
