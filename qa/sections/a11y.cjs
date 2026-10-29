// AX-*: keyboard, focus, dialog semantics, axe-core, contrast, target size.
const fs = require("fs");
const path = require("path");
const { openPage, sleep } = require("../lib.cjs");
const { ids } = require("../expected.cjs");

const AXE = path.join(__dirname, "..", "..", "node_modules", "axe-core", "axe.min.js");
const modalGone = (p) => p.waitForSelector(".modal-layer", { state: "detached", timeout: 5000 });
const describe = (p) => p.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return "body"; return `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]}#${e.id || ""} "${(e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 26)}"`; });
async function tabTo(p, test, max = 70) {
  for (let i = 1; i <= max; i++) {
    await p.keyboard.press("Tab");
    if (await p.evaluate(test)) return i;
  }
  return null;
}
const inDialog = (p) => p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));

async function axeScan(p, label, notes, ok, id = "AX-06") {
  await p.addScriptTag({ path: AXE });
  const r = await p.evaluate(async () => {
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
    return { violations: res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.failureSummary || "").split("\n")[1]) })), incomplete: res.incomplete.map((v) => v.id) };
  });
  const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const minor = r.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
  await ok(id, serious.length === 0, `${label}: ` + serious.map((v) => `${v.id} (${v.impact}): ${v.nodes.join(" | ")}`).join("\n"), p);
  if (minor.length) notes.push(`${label}: ${minor.map((v) => `${v.id}/${v.impact}: ${v.nodes[0]}`).join("; ")}`);
}

module.exports = async function a11y({ browser, base, rec }) {
  const { ok, note } = rec;

  // ---- AX-01 / AX-02 keyboard-only journey ----
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell"); await sleep(900);
    const stops = []; const noFocusRing = [];
    for (let i = 0; i < 14; i++) {
      await p.keyboard.press("Tab");
      const info = await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { d: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} "${(e.getAttribute("aria-label") || e.textContent || e.placeholder || "").trim().slice(0, 22)}"`, outline: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== "none", focusVisible: e.matches(":focus-visible") }; });
      stops.push(info.d);
      if (info.d.startsWith("body") || info.d.startsWith("nextjs-portal")) continue; // browser chrome / Next dev overlay
      if (!(info.outline || info.shadow)) noFocusRing.push(info.d);
    }
    note("AX-01", "landing tab order: " + stops.join(" → "));
    ok("AX-02", noFocusRing.length === 0, "no visible focus indicator on: " + noFocusRing.join(", "), p);
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell");
    let n = await tabTo(p, () => document.activeElement.matches('a.sample-card[href$="DEMO-7719"]'));
    ok("AX-01", n !== null, "sample card unreachable by keyboard", p);
    await p.keyboard.press("Enter"); await p.waitForSelector(".bill-main");
    n = await tabTo(p, () => document.activeElement.matches(".summary-action .button-dark"));
    ok("AX-01", n !== null, "'Why this amount?' unreachable by keyboard", p);
    await p.keyboard.press("Enter"); await p.waitForSelector(".breakdown-main");
    n = await tabTo(p, () => document.activeElement.matches(".calc-trigger"));
    ok("AX-01", n !== null, "calc line unreachable by keyboard", p);
    await p.keyboard.press("Space"); await sleep(500);
    ok("AX-05", (await p.evaluate(() => document.activeElement.getAttribute("aria-expanded"))) === "true", "Space did not expand the line", p);
    n = await tabTo(p, () => document.activeElement.matches(".question-button"));
    ok("AX-01", n !== null, "'Question this line' unreachable by keyboard", p);
    await p.keyboard.press("Enter"); await p.waitForSelector(".dispute-form");
    ok("AX-01", await inDialog(p), "after opening the dispute dialog with the keyboard, focus is on " + await describe(p), p);
    // the rest of the journey, keyboard only, from wherever focus is
    await p.keyboard.press("Escape"); await sleep(500);
    if (await p.locator(".modal-layer").count()) { await p.click(".modal-close"); await modalGone(p); }
    // payment with keyboard
    n = await tabTo(p, () => document.activeElement.matches(".bottom-right .button-primary"), 120);
    ok("AX-01", n !== null, "Pay button unreachable by keyboard from the breakdown", p);
    await p.keyboard.press("Enter"); await p.waitForSelector(".pay-modes");
    await p.keyboard.press("Tab").catch(() => {});
    const radioFocus = await tabTo(p, () => document.activeElement.matches('.pay-mode input'), 30);
    if (radioFocus !== null) { await p.keyboard.press("ArrowDown"); await sleep(100); }
    const sim = await tabTo(p, () => document.activeElement.matches(".modal-content .button-primary"), 30);
    ok("AX-01", sim !== null, "Simulate payment unreachable inside the payment dialog", p);
    await p.keyboard.press("Enter"); await p.waitForSelector(".receipt-rows");
    const ret = await tabTo(p, () => document.activeElement.matches(".receipt-content .button-dark"), 30);
    ok("AX-01", ret !== null, "Return to bill unreachable inside the receipt", p);
    await p.keyboard.press("Enter"); await modalGone(p);
    ok("AX-01", /\/bill\/DEMO-7719$/.test(p.url()) && /paid/i.test(await p.innerText(".amount-panel")), "keyboard-only payment did not finish: " + p.url(), p);
    await p.ctx.close();
  }
  // ---- AX-03 / AX-04 modals ----
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    const cases = [
      ["dispute form", async () => { await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); }, ".bottom-actions > .bottom-secondary", true],
      ["dispute confirmation", async () => { await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong"); }, ".bottom-actions > .bottom-secondary", true],
      ["payment", async () => { await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); }, ".bottom-right .button-primary", true],
      ["receipt", async () => { await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); }, ".bottom-right .button-primary", false],
    ];
    for (const [label, open, triggerSel, returns] of cases) {
      await p.goto(base + "/bill/DEMO-7719"); await p.waitForSelector(".bill-main"); await sleep(400);
      await p.focus(triggerSel);
      await open(); await sleep(300);
      // AX-04
      const dlg = await p.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const lab = d.getAttribute("aria-labelledby"); const name = d.getAttribute("aria-label") || (lab && document.getElementById(lab)?.textContent) || ""; return { modal: d.getAttribute("aria-modal"), name: name.trim() }; });
      ok("AX-04", !!dlg && dlg.modal === "true" && dlg.name.length > 2, `${label}: dialog semantics ${JSON.stringify(dlg)}`, p);
      let escaped = 0;
      for (let i = 0; i < 14; i++) { await p.keyboard.press("Tab"); if (!(await inDialog(p))) { escaped++; } }
      ok("AX-04", escaped === 0, `${label}: Tab left the dialog ${escaped} times (focus ended on ${await describe(p)})`, p);
      // AX-03
      await p.keyboard.press("Escape"); await sleep(600);
      const closed = (await p.locator(".modal-layer").count()) === 0;
      ok("AX-03", closed, `${label}: Escape did not close the dialog`, p);
      if (!closed) { await p.mouse.click(8, 8); await sleep(500); }
      if (returns) {
        const f = await describe(p);
        ok("AX-03", await p.evaluate((sel) => document.activeElement === document.querySelector(sel), triggerSel), `${label}: focus did not return to the trigger; it is on ${f}`, p);
      } else {
        const f = await describe(p);
        ok("AX-03", f !== "body", `${label}: after closing, focus is lost to <body>`, p);
      }
    }
    await p.ctx.close();
  }
  // ---- AX-05 names and states ----
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    for (const [path, sel] of [["/", ".landing-shell"], ["/bill/DEMO-7719", ".bill-main"], ["/bill/DEMO-7719/breakdown", ".breakdown-main"], ["/faq", ".faq-list"]]) {
      await p.goto(base + path); await p.waitForSelector(sel); await sleep(500);
      const unnamed = await p.evaluate(() => [...document.querySelectorAll("a[href], button, input, select, textarea")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0; }).filter((e) => { const label = e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.labels && e.labels.length) || e.textContent.trim() || e.getAttribute("title"); return !label; }).map((e) => e.outerHTML.slice(0, 80)));
      ok("AX-05", unnamed.length === 0, `${path}: unnamed controls ${unnamed.join(" ")}`, p);
      const tog = await p.evaluate(() => { const g = document.querySelector(".lang-toggle"); return { role: g.getAttribute("role"), label: g.getAttribute("aria-label"), pressed: [...g.querySelectorAll("button")].map((b) => b.getAttribute("aria-pressed")) }; });
      ok("AX-05", tog.role === "group" && !!tog.label && tog.pressed.join() === "true,false", JSON.stringify(tog), p);
    }
    // the Hindi toggle button: accessible name and language
    const hiBtn = await p.evaluate(() => { const b = document.querySelector(".lang-toggle button:last-child"); return { text: b.textContent, label: b.getAttribute("aria-label"), lang: b.getAttribute("lang") }; });
    ok("AX-05", !!hiBtn.label || !!hiBtn.lang, `Hindi toggle has no lang attribute or label: ${JSON.stringify(hiBtn)}`, p);
    // expandable lines: aria-expanded flips; aria-controls points at something real when expanded
    await p.goto(base + "/bill/DEMO-3982/breakdown"); await p.waitForSelector(".breakdown-main");
    const t = p.locator(".calc-trigger").nth(1);
    await t.click(); await sleep(500);
    const st = await t.evaluate((e) => ({ exp: e.getAttribute("aria-expanded"), target: !!document.getElementById(e.getAttribute("aria-controls")) }));
    ok("AX-05", st.exp === "true" && st.target, JSON.stringify(st), p);
    await p.ctx.close();
  }
  // ---- AX-06 axe on every screen / language / modal ----
  {
    const axeNotes = [];
    for (const lang of ["en", "hi"]) {
      const p = await openPage(browser, { width: 390, height: 844, lang });
      const screens = [["/", ".landing-shell"], ["/bill/NOPE-1", "#lookup-error"], ["/faq", ".faq-list"], ["/terms", ".terms-page h1"], ...ids.flatMap((id) => [[`/bill/${id}`, ".bill-main"], [`/bill/${id}/breakdown`, ".breakdown-main"]])];
      for (const [path, sel] of screens) {
        await p.goto(base + path); await p.waitForSelector(sel); await sleep(900);
        if (/breakdown/.test(path)) { await p.locator(".calc-trigger").first().click(); await sleep(500); }
        await axeScan(p, `${lang} ${path}`, axeNotes, ok);
      }
      await p.goto(base + "/bill/DEMO-7719"); await p.waitForSelector(".bill-main"); await sleep(500);
      await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); await sleep(500); await axeScan(p, `${lang} dispute form`, axeNotes, ok);
      await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong"); await sleep(300); await axeScan(p, `${lang} dispute confirmation`, axeNotes, ok);
      await p.click(".dispute-confirmation .button-dark"); await modalGone(p);
      await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await sleep(500); await axeScan(p, `${lang} payment modal`, axeNotes, ok);
      await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); await sleep(300); await axeScan(p, `${lang} receipt`, axeNotes, ok);
      await p.ctx.close();
    }
    note("AX-06", axeNotes.length ? "non-blocking axe findings (moderate/minor): " + [...new Set(axeNotes)].slice(0, 12).join(" || ") : "no moderate/minor axe findings");
  }
  // ---- AX-07 contrast (own measurement, handles alpha and gradients conservatively) ----
  {
    const p = await openPage(browser, { width: 390, height: 844 });
    const bad = new Map();
    for (const lang of ["en", "hi"]) {
      await p.ctx.addInitScript((l) => { try { localStorage.setItem("unpacked.lang", l); } catch {} }, lang);
      for (const [pth, sel, mut] of [["/", ".landing-shell"], ["/bill/DEMO-7719", ".bill-main"], ["/bill/DEMO-3982", ".bill-main"], ["/bill/DEMO-2048", ".bill-main"], ["/bill/DEMO-3982/breakdown", ".breakdown-main"], ["/bill/DEMO-7719/breakdown", ".breakdown-main"], ["/faq", ".faq-list"], ["/terms", ".terms-page h1"]]) {
        await p.goto(base + pth); await p.waitForSelector(sel); await sleep(1100);
        const found = await p.evaluate(() => {
          const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
          const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
          const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const paper = { r: 246, g: 244, b: 239, a: 1 };
          const bgOf = (el) => { const stack = []; for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); if (c && c.a > 0) stack.push(c); if (c && c.a >= 1) break; } let bg = paper; for (const c of stack.reverse()) bg = blend(c, bg); return bg; };
          const out = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walker.nextNode())) {
            const t = n.textContent.trim(); if (!t) continue;
            const el = n.parentElement; if (!el || el.closest("script,style,[hidden]")) continue;
            const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) continue;
            const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
            let eff = 1; for (let m = el; m; m = m.parentElement) eff *= parseFloat(getComputedStyle(m).opacity);
            const fg = parse(cs.color); if (!fg) continue;
            const bg = bgOf(el);
            const fgb = blend({ ...fg, a: fg.a * eff }, bg);
            const ratio = (Math.max(lum(fgb), lum(bg)) + 0.05) / (Math.min(lum(fgb), lum(bg)) + 0.05);
            const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
            const large = size >= 24 || (size >= 18.66 && bold);
            const need = large ? 3 : 4.5;
            if (ratio < need) out.push({ text: t.slice(0, 40), ratio: +ratio.toFixed(2), need, size, cls: String(el.className).split(" ")[0] || el.tagName.toLowerCase() });
          }
          return out;
        });
        for (const f of found) { const key = `${f.cls}|${f.text}`; if (!bad.has(key)) bad.set(key, { ...f, where: `${lang} ${pth}` }); }
      }
    }
    const list = [...bad.values()];
    ok("AX-07", list.length === 0, list.slice(0, 12).map((f) => `"${f.text}" ${f.ratio}:1 (needs ${f.need}) in .${f.cls} on ${f.where}`).join("\n") + (list.length > 12 ? `\n… ${list.length} in total` : ""), p);
    note("AX-07", `${list.length} text runs below WCAG AA by own measurement`);
    await p.ctx.close();
  }
  // ---- AX-08 target size ----
  {
    const p = await openPage(browser, { width: 390, height: 844 });
    const small = new Set();
    for (const [pth, sel] of [["/", ".landing-shell"], ["/bill/DEMO-7719", ".bill-main"], ["/bill/DEMO-7719/breakdown", ".breakdown-main"], ["/faq", ".faq-list"]]) {
      await p.goto(base + pth); await p.waitForSelector(sel); await sleep(700);
      const s = await p.evaluate(() => {
        const all = [...document.querySelectorAll("a[href], button, input, select, textarea")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const rects = all.map((e) => e.getBoundingClientRect());
        const out = [];
        all.forEach((e, i) => {
          const r = rects[i];
          if ((r.width >= 24 && r.height >= 24) || e.closest("p, li")) return;
          // WCAG 2.2 SC 2.5.8 exception: a 24px circle centred on the target must not touch another target
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const touches = rects.some((o, j) => j !== i && o.left < cx + 12 && o.right > cx - 12 && o.top < cy + 12 && o.bottom > cy - 12 && !(all[j].contains(e) || e.contains(all[j])));
          if (touches) out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} ${Math.round(r.width)}×${Math.round(r.height)} (24px circle touches a neighbour)`);
        });
        return out;
      });
      s.forEach((x) => small.add(`${pth}: ${x}`));
    }
    ok("AX-08", small.size === 0, [...small].join("; "), p);
    await p.ctx.close();
  }
  void fs;
};
