// DP-*, PY-*, NV-*, AN-*, RB-05: dispute modal, payment and receipt, navigation, analytics.
const { openPage, sleep, text, rupeeTokens, eventsOf } = require("../lib.cjs");
const { expected, inr, ids } = require("../expected.cjs");

const modalGone = (page) => page.waitForSelector(".modal-layer", { state: "detached", timeout: 5000 });
const ymd = () => { const d = new Date(); return String(d.getFullYear() % 100).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0"); };
const go = async (page, base, path, sel) => { await page.goto(base + path); await page.waitForSelector(sel); await sleep(250); };
const openBill = (p, base, id) => go(p, base, `/bill/${id}`, ".bill-main");
const openBreakdown = (p, base, id) => go(p, base, `/bill/${id}/breakdown`, ".breakdown-main");
const payButton = (p) => p.locator(".bottom-right .button-primary");
const disputeButton = (p) => p.locator(".bottom-actions > .bottom-secondary");
async function pay(p, modeIndex = 0) {
  await payButton(p).click(); await p.waitForSelector(".pay-modes");
  await p.locator(".pay-mode").nth(modeIndex).click();
  await p.locator(".modal-content .button-primary").click();
  await p.waitForSelector(".receipt-rows");
}
const receiptRows = (p) => p.$$eval(".receipt-rows > div", (rs) => rs.map((r) => ({ k: r.querySelector("dt").textContent, v: r.querySelector("dd").textContent })));
const isPaid = async (p) => /Paid \(simulated\)/.test(await text(p, ".amount-panel span"));
const waitOr = async (p, sel, ms = 6000) => { try { await p.waitForSelector(sel, { timeout: ms }); return true; } catch { return false; } };
const closeReceiptViaReturn = async (p) => { await p.click(".receipt-content .button-dark"); await modalGone(p); };

module.exports = async function modals({ browser, base, env, rec }) {
  const { ok, note } = rec;
  const isDev = /dev/.test(env);

  // ================= dispute =================
  {
    const p = await openPage(browser, { width: 1366, height: 900, clipboard: "allow" });
    for (const id of ids) {
      const e = expected[id];
      await openBreakdown(p, base, id);
      const want = ["built-up-area", "use-factor", "age-factor", "occupancy-factor", "annual-tax", ...(e.hasPenalty ? ["late-charge"] : []), "amount-due"];
      const triggers = p.locator(".calc-trigger");
      const n = await triggers.count();
      ok("DP-01", n === want.length, `${id}: ${n} lines, expected ${want.length}`, p);
      // go through the lines in a shuffled order so "close, then open a different line" is exercised (DP-02)
      const order = [...Array(n).keys()].sort((a, b) => ((a * 7) % n) - ((b * 7) % n));
      for (const i of order) {
        const label = (await triggers.nth(i).locator(".calc-copy strong").textContent()).trim();
        await triggers.nth(i).click(); await sleep(450);
        await p.locator(".calc-line.is-open .question-button").click();
        await p.waitForSelector(".dispute-form");
        const val = await p.inputValue("#dispute-line");
        const shown = (await p.$eval("#dispute-line", (s) => s.options[s.selectedIndex].textContent)).trim();
        ok("DP-01", val === want[i] && shown === label, `${id} line "${label}" opened dispute for ${val} ("${shown}")`, p);
        ok("DP-02", val === want[i], `after closing a different line, "${label}" opened ${val}`, p);
        const reason = await p.inputValue("#dispute-reason");
        ok("DP-01", reason.toLowerCase().includes(label.toLowerCase()) && reason.includes(id), `reason text: ${reason.slice(0, 90)}`, p);
        await p.click(".dispute-form .modal-close"); await modalGone(p);
      }
    }
    // DP-03 generic
    await openBreakdown(p, base, "DEMO-7719");
    await p.click(".next-step .button-outline"); await p.waitForSelector(".dispute-form");
    ok("DP-03", (await p.inputValue("#dispute-line")) === "annual-tax", await p.inputValue("#dispute-line"), p);
    await p.click(".dispute-form .modal-close"); await modalGone(p);
    await openBill(p, base, "DEMO-3982");
    await disputeButton(p).click(); await p.waitForSelector(".dispute-form");
    ok("DP-03", (await p.inputValue("#dispute-line")) === "annual-tax", "bill-page dispute button: " + await p.inputValue("#dispute-line"), p);
    ok("DP-13", (await p.locator("#dispute-line option").count()) === 8, "options " + await p.locator("#dispute-line option").count(), p);

    // DP-04/05/12
    const refs = [];
    for (let round = 0; round < 2; round++) {
      if (!(await p.locator(".dispute-form").count())) { await disputeButton(p).click(); await p.waitForSelector(".dispute-form"); }
      await p.click(".dispute-form button[type=submit]");
      await p.waitForSelector(".reference-box strong");
      const a = await text(p, ".reference-box strong"); await sleep(600); const b = await text(p, ".reference-box strong");
      refs.push(a);
      ok("DP-04", new RegExp(`^DPT-3982-${ymd()}-[A-Z0-9]{4}$`).test(a) && a === b, `${a} / ${b}`, p);
      if (round === 0) {
        await p.click(".dispute-confirmation .button-dark"); await modalGone(p);
        await disputeButton(p).click(); await p.waitForSelector(".dispute-form");
        ok("DP-12", (await p.locator(".reference-box").count()) === 0 && (await p.inputValue("#dispute-line")) === "annual-tax", "reopened modal is not fresh", p);
      }
    }
    ok("DP-05", refs[0] !== refs[1], refs.join(" vs "), p);
    // DP-07 copy with clipboard
    await p.click(".reference-box button"); await sleep(300);
    const clip = await p.evaluate(() => navigator.clipboard.readText()).catch((err) => "ERR " + err.message);
    ok("DP-07", clip === refs[1] && /Copied/.test(await text(p, ".reference-box button")), `clipboard "${clip}" button "${await text(p, ".reference-box button")}"`, p);
    await p.ctx.close();
  }
  // DP-08 clipboard unavailable / rejecting / nothing works
  for (const mode of ["missing", "reject", "none"]) {
    const p = await openPage(browser, { width: 1366, height: 900, clipboard: mode });
    await openBill(p, base, "DEMO-2048");
    await disputeButton(p).click(); await p.waitForSelector(".dispute-form");
    await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong");
    const ref = await text(p, ".reference-box strong");
    await p.click(".reference-box button"); await sleep(500);
    const label = await text(p, ".reference-box button");
    const copied = await p.evaluate(() => window.__copied);
    if (mode === "none") ok("DP-08", !/Copied/.test(label) && (await p.locator(".copy-failed").count()) === 1, `nothing could copy, yet the button says "${label}"`, p);
    else ok("DP-08", /Copied/.test(label) && copied === ref, `clipboard ${mode}: label "${label}", legacy copy received "${copied}" (reference ${ref})`, p);
    ok("DP-08", !p.problems.some((x) => /pageerror/.test(x)), `clipboard ${mode}: ${p.problems.join(" | ")}`, p);
    await p.ctx.close();
  }
  // DP-06 typed text survives a language toggle, DP-09/10/11 close behaviour, DP-13 selection survives
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    await openBreakdown(p, base, "DEMO-7719");
    const trigger = p.locator(".calc-trigger").nth(2);
    await trigger.click(); await sleep(450);
    const qbtn = p.locator(".calc-line.is-open .question-button");
    await qbtn.focus(); await qbtn.press("Enter");
    await p.waitForSelector(".dispute-form");
    // DP-11 focus moves into the dialog
    const inside = await p.evaluate(() => !!document.activeElement && !!document.activeElement.closest('[role="dialog"]'));
    ok("DP-11", inside, "focus did not move into the dialog on open", p);
    await p.fill("#dispute-reason", "My own note: the age bracket looks wrong.");
    await p.evaluate(() => document.querySelector(".lang-toggle button:last-child").click()); await sleep(400);
    ok("DP-06", (await p.inputValue("#dispute-reason")) === "My own note: the age bracket looks wrong.", `after EN→HI the note is: ${await p.inputValue("#dispute-reason")}`, p);
    ok("DP-13", (await p.inputValue("#dispute-line")) === "age-factor", "selected line changed on toggle: " + await p.inputValue("#dispute-line"), p);
    const optText = await p.$$eval("#dispute-line option", (o) => o.map((x) => x.textContent).join(" "));
    ok("DP-13", !/[A-Za-z]{4,}/.test(optText.replace(/m²/g, "")), "Hindi dispute options contain English: " + optText, p);
    await p.evaluate(() => document.querySelector(".lang-toggle button:first-child").click()); await sleep(300);
    // DP-09 Escape
    await p.keyboard.press("Escape"); await sleep(500);
    ok("DP-09", (await p.locator(".modal-layer").count()) === 0, "Escape did not close the dispute modal", p);
    // DP-11 focus returns
    const back = await p.evaluate(() => document.activeElement && (document.activeElement.className + " | " + document.activeElement.textContent.slice(0, 30)));
    ok("DP-11", /question-button/.test(back || ""), `after closing, focus is on: ${back}`, p);
    if (await p.locator(".modal-layer").count()) { await p.click(".modal-close"); await modalGone(p); }
    // DP-10 backdrop vs inside
    await disputeButton(p).click(); await p.waitForSelector(".dispute-form");
    await p.click(".dispute-form h2"); await sleep(300);
    ok("DP-10", (await p.locator(".modal-layer").count()) === 1, "clicking inside the modal closed it", p);
    await p.mouse.click(8, 8); await sleep(600);
    ok("DP-10", (await p.locator(".modal-layer").count()) === 0, "clicking the backdrop did not close the modal", p);
    ok("RB-03", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }

  // ================= payment =================
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    const modeNames = ["UPI", "Card", "Net Banking"];
    for (let m = 0; m < 3; m++) {
      const id = ids[m];
      await openBill(p, base, id);
      await pay(p, m);
      const rows = await receiptRows(p);
      const get = (i) => rows[i]?.v ?? "";
      ok("PY-01", get(4) === modeNames[m] && /Simulated via/.test(await text(p, ".receipt-content h2")) && (await text(p, ".receipt-content h2")).includes(modeNames[m]), `mode row "${get(4)}", title "${await text(p, ".receipt-content h2")}"`, p);
      // PY-02
      const e = expected[id];
      const today = new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
      ok("PY-02", get(1) === e.raw.fy && get(2) === id && rupeeTokens(get(3))[0] === e.due && get(5).includes("IST") && get(5).includes(today.replace(/^0/, "")), JSON.stringify(rows), p);
      // PY-03
      const a = get(0); await sleep(500); const b = (await receiptRows(p))[0].v;
      ok("PY-03", new RegExp(`^RCT-${id.slice(-4)}-${ymd()}-[A-Z0-9]{4}$`).test(a) && a === b, `${a} / ${b}`, p);
      // PY-04
      const qr = await p.evaluate(() => { const s = document.querySelector(".receipt-qr svg"); return s ? { paths: s.querySelectorAll("path,rect").length, title: s.querySelector("title")?.textContent || "" } : null; });
      ok("PY-04", qr && qr.paths > 1 && qr.title.includes(a), JSON.stringify(qr), p);
      // decode the picture itself (needs jsqr + pngjs; set QA_TOOLS to a folder that has them)
      try {
        const tools = process.env.QA_TOOLS; if (!tools) throw new Error("QA_TOOLS not set");
        const jsQR = require(require.resolve("jsqr", { paths: [tools] })); const { PNG } = require(require.resolve("pngjs", { paths: [tools] }));
        const png = PNG.sync.read(await p.locator(".receipt-qr svg").screenshot({ scale: "css" }));
        // add a quiet zone so the decoder can find the finder patterns
        const pad = 24, W = png.width + pad * 2, H = png.height + pad * 2, data = new Uint8ClampedArray(W * H * 4).fill(255);
        for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) for (let c = 0; c < 4; c++) data[((y + pad) * W + x + pad) * 4 + c] = png.data[(y * png.width + x) * 4 + c];
        const dec = jsQR(data, W, H);
        ok("PY-04", !!dec && dec.data === a, `QR decodes to "${dec && dec.data}", receipt says "${a}"`, p);
      } catch (err) { note("PY-04", "QR decode skipped: " + err.message); }
      await closeReceiptViaReturn(p);
    }
    // PY-07 paid state agrees everywhere (use each property)
    for (const id of ids) {
      const e = expected[id];
      await openBill(p, base, id); await pay(p, 0);
      const ref = (await receiptRows(p))[0].v;
      await closeReceiptViaReturn(p);
      const st = {
        badge: await text(p, ".status-badge"), label: await text(p, ".amount-panel span"), amount: rupeeTokens(await text(p, ".amount-panel strong"))[0],
        sub: await text(p, ".amount-panel small"),
        hist: await p.$eval(".history-row.is-current", (r) => ({ amount: r.querySelector(".history-amount").textContent, status: r.querySelector(".history-status").textContent })),
        bar: await p.locator(".bottom-right").textContent(), payBtn: await payButton(p).count(), warn: await p.locator(".warning-banner").count(),
        saving: await p.locator(".saving-banner").count() ? await text(p, ".saving-banner strong") : "",
      };
      const msg = JSON.stringify(st);
      ok("PY-07", /Payment simulated/.test(st.badge) && !/Overdue/.test(st.badge), "badge: " + msg, p);
      ok("PY-07", /Paid \(simulated\)/.test(st.label) && st.amount === e.due, "label/amount: " + msg, p);
      ok("PY-07", st.sub.includes(ref) && /Simulated via UPI/.test(st.sub), "subline: " + msg, p);
      ok("PY-07", rupeeTokens(st.hist.amount)[0] === e.due && /Paid \(simulated\)/.test(st.hist.status), "history: " + msg, p);
      ok("PY-07", st.payBtn === 0 && /Payment simulated/.test(st.bar) && st.warn === 0, "bar/banners: " + msg, p);
      if (id === "DEMO-7719") ok("PY-07", /paid more/.test(st.saving), "saving banner: " + msg, p);
      // PY-09: breakdown after paying
      await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main");
      const barB = await p.locator(".bottom-right").textContent();
      ok("PY-09", (await p.locator(".bottom-right .button-primary").count()) === 0 && /Payment simulated/.test(barB), `breakdown after paying still offers to pay: bar says "${barB}"`, p);
      ok("PY-09", rupeeTokens(await text(p, ".explain-total strong"))[0] === e.due, "amount on breakdown", p);
    }
    // PY-08 pay from breakdown
    await openBreakdown(p, base, "DEMO-7719");
    await pay(p, 1); await closeReceiptViaReturn(p);
    await p.waitForSelector(".bill-main");
    ok("PY-08", /\/bill\/DEMO-7719$/.test(p.url()) && await isPaid(p), `url ${p.url()}`, p);
    // PY-10 / PY-11: another property is not paid; navigating home then to the same one starts fresh
    await p.goBack(); await p.waitForSelector(".breakdown-main");
    await p.goForward(); await p.waitForSelector(".bill-main");
    ok("PY-11", await isPaid(p), "paid state lost after browser back/forward within the session", p);
    await p.click(".brand-button"); await p.waitForSelector(".landing-shell");
    await p.click('a.sample-card[href$="DEMO-2048"]'); await p.waitForSelector(".bill-main");
    ok("PY-10", !(await isPaid(p)) && (await payButton(p).count()) === 1, "other property shows as paid: " + await text(p, ".status-badge"), p);
    // PY-12 two receipts differ (paid 7719 above, now 2048)
    await pay(p, 0); const r2 = (await receiptRows(p))[0].v; await closeReceiptViaReturn(p);
    await p.click(".brand-button"); await p.waitForSelector(".landing-shell");
    await p.click('a.sample-card[href$="DEMO-3982"]'); await p.waitForSelector(".bill-main");
    await pay(p, 2); const r3 = (await receiptRows(p))[0].v; await closeReceiptViaReturn(p);
    ok("PY-12", r2 !== r3 && r2.startsWith("RCT-2048") && r3.startsWith("RCT-3982"), `${r2} vs ${r3}`, p);
    // PY-13 cancel
    await openBill(p, base, "DEMO-2048");
    await payButton(p).click(); await p.waitForSelector(".pay-modes"); await p.click(".modal-cancel"); await modalGone(p);
    ok("PY-13", (await payButton(p).count()) === 1 && !(await isPaid(p)), "cancel left the bill paid", p);
    ok("RB-03", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // PY-05 / PY-06: closing the receipt without "Return to bill"
  for (const [id, how] of [["PY-05", "x"], ["PY-06", "escape"], ["PY-05", "backdrop"]]) {
    const p = await openPage(browser, { width: 1366, height: 900 });
    await openBill(p, base, "DEMO-2048"); await pay(p, 0);
    if (how === "x") await p.click(".receipt-content .modal-close");
    else if (how === "escape") await p.keyboard.press("Escape");
    else await p.mouse.click(8, 8);
    await sleep(700);
    const paid = (await isPaid(p)) && (await payButton(p).count()) === 0;
    ok(id, paid, `closed the receipt with ${how}: the receipt was shown ("Simulation complete") but the bill is ${paid ? "paid" : "still unpaid and offers Pay bill again"}`, p);
    await p.ctx.close();
  }
  // PY-15 two tabs
  {
    const p1 = await openPage(browser, { width: 1366, height: 900 });
    const p2 = await p1.ctx.newPage();
    await openBill(p1, base, "DEMO-7719"); await p2.goto(base + "/bill/DEMO-7719"); await p2.waitForSelector(".bill-main");
    await pay(p1, 0); await closeReceiptViaReturn(p1); await sleep(800);
    ok("PY-15", !(await isPaid(p2)) && (await isPaid(p1)), "tab 2: " + await text(p2, ".status-badge"), p2);
    await pay(p2, 0); const r = (await receiptRows(p2))[0].v;
    ok("PY-15", /^RCT-7719-/.test(r), r, p2);
    await p1.ctx.close();
  }
  // PY-16 toggling language while a payment modal / receipt is open
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    await openBill(p, base, "DEMO-3982");
    await payButton(p).click(); await p.waitForSelector(".pay-modes");
    await p.locator(".pay-mode").nth(1).click();
    await p.evaluate(() => document.querySelector(".lang-toggle button:last-child").click()); await sleep(400);
    ok("PY-16", (await p.locator(".pay-modes").count()) === 1 && (await p.locator(".pay-mode input").nth(1).isChecked()), "payment modal reset or closed on toggle", p);
    await p.locator(".modal-content .button-primary").click(); await p.waitForSelector(".receipt-rows");
    const before = await receiptRows(p);
    await p.evaluate(() => document.querySelector(".lang-toggle button:first-child").click()); await sleep(400);
    const after = await receiptRows(p);
    ok("PY-16", before[0].v === after[0].v && before[5].v !== after[5].v, `reference changed or timestamp not localised: ${before[0].v}/${after[0].v}; ${before[5].v} -> ${after[5].v}`, p);
    ok("PY-16", (await text(p, ".receipt-content h2")).includes("Card"), await text(p, ".receipt-content h2"), p);
    await p.ctx.close();
  }

  // ================= navigation =================
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    const at = (suffix) => p.url() === base + suffix;
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell");
    await p.evaluate(() => { window.__marker = "same-document"; });
    // NV-01 in-app buttons
    await p.click('a.sample-card[href$="DEMO-7719"]'); await p.waitForSelector(".bill-main");
    const s1 = at("/bill/DEMO-7719");
    await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main");
    const s2 = at("/bill/DEMO-7719/breakdown");
    await p.click(".back-button"); await p.waitForSelector(".bill-main");
    const s3 = at("/bill/DEMO-7719");
    await p.click(".back-button"); await p.waitForSelector(".landing-shell");
    const s4 = at("/") || p.url() === base;
    await p.goForward(); const f1 = await waitOr(p, ".bill-main");
    const s5 = f1 && at("/bill/DEMO-7719");
    await p.goForward(); const f2 = await waitOr(p, ".breakdown-main");
    const s6 = f2 && at("/bill/DEMO-7719/breakdown");
    ok("NV-01", s1 && s2 && s3 && s4 && s5 && s6, JSON.stringify({ s1, s2, s3, s4, s5, s6, url: p.url() }), p);
    // NV-02 browser buttons only, on a fresh history
    await p.goto(base + "/"); await p.waitForSelector(".landing-shell");
    await p.click('a.sample-card[href$="DEMO-7719"]'); await p.waitForSelector(".bill-main");
    await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main");
    await p.evaluate(() => { window.__marker = "same-document"; });
    await p.goBack(); const b1 = (await waitOr(p, ".bill-main")) && at("/bill/DEMO-7719");
    await p.goBack(); const b2 = (await waitOr(p, ".landing-shell")) && p.url().replace(/\/$/, "") === base;
    await p.goForward(); const b3 = (await waitOr(p, ".bill-main")) && at("/bill/DEMO-7719");
    await p.goForward(); const b4 = (await waitOr(p, ".breakdown-main")) && at("/bill/DEMO-7719/breakdown");
    ok("NV-02", b1 && b2 && b3 && b4, `b1 ${b1} b2 ${b2} b3 ${b3} b4 ${b4} url ${p.url()}`, p);
    // NV-03 brand and breadcrumb
    await p.click(".brand-button"); await p.waitForSelector(".landing-shell"); const h1 = p.url().replace(/\/$/, "") === base;
    await p.click('a.sample-card[href$="DEMO-2048"]'); await p.waitForSelector(".bill-main");
    await p.click(".breadcrumb button"); await p.waitForSelector(".landing-shell");
    ok("NV-03", h1 && p.url().replace(/\/$/, "") === base, p.url(), p);
    // NV-05 scroll resets
    await p.click('a.sample-card[href$="DEMO-3982"]'); await p.waitForSelector(".bill-main");
    await p.evaluate(() => window.scrollTo({ top: 700, behavior: "instant" })); await sleep(200);
    await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main"); await sleep(500);
    ok("NV-05", (await p.evaluate(() => window.scrollY)) === 0, "scrollY after navigating: " + await p.evaluate(() => window.scrollY), p);
    // NV-08 no reload
    ok("NV-08", (await p.evaluate(() => window.__marker)) === "same-document", "the document was reloaded during in-app navigation", p);
    // NV-06 browser back with modal open
    await p.goBack(); await p.waitForSelector(".bill-main");
    await payButton(p).click(); await p.waitForSelector(".pay-modes");
    await p.goBack(); await p.waitForSelector(".landing-shell"); await sleep(400);
    const stuck1 = await p.locator(".modal-layer").count();
    await p.goForward(); await p.waitForSelector(".bill-main"); await sleep(400);
    ok("NV-06", stuck1 === 0 && (await p.locator(".modal-layer").count()) === 0, `modal visible after back (${stuck1}) or after forward`, p);
    await p.ctx.close();
    // NV-04 cold deep link
    const q = await openPage(browser, { width: 1366, height: 900 });
    await q.goto(base + "/bill/DEMO-7719/breakdown"); await q.waitForSelector(".breakdown-main");
    await q.click(".back-button"); await q.waitForSelector(".bill-main"); const c1 = q.url() === base + "/bill/DEMO-7719";
    await q.click(".back-button"); await q.waitForSelector(".landing-shell"); const c2 = q.url().replace(/\/$/, "") === base;
    ok("NV-04", c1 && c2, `c1 ${c1} c2 ${c2} ${q.url()}`, q);
    // breakdown -> brand/home straight to landing
    await q.goto(base + "/bill/DEMO-2048/breakdown"); await q.waitForSelector(".breakdown-main"); await q.click(".brand-button"); await q.waitForSelector(".landing-shell");
    ok("NV-04", q.url().replace(/\/$/, "") === base, q.url(), q);
    // NV-07 FAQ/terms back
    await q.goto(base + "/"); await q.waitForSelector(".landing-shell");
    await q.click('.prototype-note-link[href="/faq"]'); await q.waitForSelector(".faq-list"); await sleep(1500);
    await q.click(".terms-back"); await q.waitForSelector(".landing-shell");
    ok("NV-07", q.url().replace(/\/$/, "") === base, "faq back: " + q.url(), q);
    await q.goto(base + "/terms"); await q.waitForSelector(".terms-page h1"); await sleep(1500); await q.click(".terms-back"); await q.waitForSelector(".landing-shell");
    ok("NV-07", q.url().replace(/\/$/, "") === base, "terms back with no history: " + q.url(), q);
    await q.ctx.close();
  }

  // ================= analytics =================
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    const seen = [];
    p.on("request", (r) => { if (r.method() === "POST" || r.postData()) seen.push([r.method(), r.url(), r.postData()]); });
    const allEvents = async () => await eventsOf(p);
    const since = async (from) => (await allEvents()).slice(from);
    const count = async () => (await allEvents()).length;
    const names = (evs) => evs.map((e) => e.name);
    const expectOnce = async (id, label, from, name, extra) => {
      const evs = await since(from);
      const mine = evs.filter((e) => e.name === name);
      ok(id, mine.length === 1 && (!extra || extra(mine[0].data)) && evs.length === 1, `${label}: expected exactly one ${name}, got ${JSON.stringify(names(evs))} ${JSON.stringify(mine.map((m) => m.data))}`, p);
    };
    // deep link (AN-03)
    await p.goto(base + "/bill/DEMO-7719/breakdown"); await p.waitForSelector(".breakdown-main"); await sleep(600);
    let evs = await allEvents();
    ok("AN-03", names(evs).join() === "property_opened,breakdown_opened" && evs[0].data.source === "deeplink" && evs[0].data.id === "DEMO-7719", JSON.stringify(evs), p);
    ok("AN-01", names(evs).filter((n) => n === "property_opened").length === 1, "deeplink double fire " + JSON.stringify(evs), p);
    // expand a line
    let n0 = await count();
    await p.locator(".calc-trigger").nth(1).click(); await sleep(300);
    await expectOnce("AN-01", "expand line", n0, "line_expanded", (d) => d.id === "DEMO-7719" && d.line === "usage");
    n0 = await count(); await p.locator(".calc-trigger").nth(1).click(); await sleep(300);
    ok("AN-01", (await since(n0)).length === 0, "collapsing fired " + JSON.stringify(await since(n0)), p);
    // question this line
    await p.locator(".calc-trigger").nth(4).click(); await sleep(400);
    n0 = await count(); await p.locator(".calc-line.is-open .question-button").click(); await p.waitForSelector(".dispute-form"); await sleep(300);
    await expectOnce("AN-01", "question line", n0, "question_line_clicked", (d) => d.line === "annual-tax");
    // dispute submitted with free text that must not leave the browser (AN-04)
    await p.fill("#dispute-reason", "PRIVATE-NOTE-12345 my phone is 9876543210");
    n0 = await count(); await p.click(".dispute-form button[type=submit]"); await p.waitForSelector(".reference-box strong"); await sleep(300);
    await expectOnce("AN-01", "dispute submit", n0, "dispute_submitted", (d) => d.line === "annual-tax");
    const ref = await text(p, ".reference-box strong");
    await p.click(".dispute-confirmation .button-dark"); await modalGone(p);
    // payment
    n0 = await count(); await payButton(p).click(); await p.waitForSelector(".pay-modes"); await p.locator(".pay-mode").nth(2).click();
    ok("AN-01", (await since(n0)).length === 0, "opening the payment modal fired " + JSON.stringify(await since(n0)), p);
    await p.locator(".modal-content .button-primary").click(); await p.waitForSelector(".receipt-rows"); await sleep(300);
    await expectOnce("AN-01", "payment", n0, "payment_simulated", (d) => d.mode === "Net Banking" && d.id === "DEMO-7719");
    const rref = (await receiptRows(p))[0].v;
    await closeReceiptViaReturn(p);
    // language
    n0 = await count(); await p.click(".lang-toggle button:last-child"); await sleep(300);
    await expectOnce("AN-01", "language", n0, "language_switched", (d) => d.to === "hi");
    n0 = await count(); await p.click(".lang-toggle button:last-child"); await sleep(300);
    ok("AN-01", (await since(n0)).length === 0, "choosing the already-active language fired an event", p);
    // browser back/forward fire nothing (AN-03); landing -> sample -> property_opened(sample)
    n0 = await count(); await p.goBack(); await sleep(500); await p.goForward(); await sleep(500);
    ok("AN-03", (await since(n0)).length === 0, "back/forward fired " + JSON.stringify(await since(n0)), p);
    await p.click(".brand-button"); await p.waitForSelector(".landing-shell");
    n0 = await count(); await p.click('a.sample-card[href$="DEMO-3982"]'); await p.waitForSelector(".bill-main"); await sleep(400);
    await expectOnce("AN-01", "sample open", n0, "property_opened", (d) => d.source === "sample" && d.id === "DEMO-3982");
    await p.click(".brand-button"); await p.waitForSelector(".landing-shell");
    n0 = await count(); await p.fill("#property-id", "demo-2048"); await p.press("#property-id", "Enter"); await p.waitForSelector(".bill-main"); await sleep(400);
    await expectOnce("AN-01", "search open", n0, "property_opened", (d) => d.source === "search" && d.id === "DEMO-2048");
    n0 = await count(); await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main"); await sleep(400);
    await expectOnce("AN-01", "breakdown open", n0, "breakdown_opened", (d) => d.id === "DEMO-2048");
    // AN-02 payload hygiene
    const all = await allEvents();
    const clean = all.every((e) => {
      const ks = Object.keys(e.data);
      const okKeys = { property_opened: ["id", "source"], breakdown_opened: ["id"], line_expanded: ["id", "line"], question_line_clicked: ["id", "line"], dispute_submitted: ["id", "line"], payment_simulated: ["id", "mode"], language_switched: ["to"] }[e.name];
      return okKeys && ks.length === okKeys.length && ks.every((k) => okKeys.includes(k)) && Object.values(e.data).every((v) => /^(DEMO-\d{4}|sample|search|deeplink|en|hi|UPI|Card|Net Banking|[a-z-]+)$/.test(v));
    });
    const blob = JSON.stringify(all);
    ok("AN-02", clean && !blob.includes(ref) && !blob.includes(rref) && !/PRIVATE-NOTE|9876543210/.test(blob), blob.slice(0, 400), p);
    // AN-04
    const leaked = seen.filter(([, url, body]) => /PRIVATE-NOTE|9876543210/.test((url || "") + (body || "")));
    ok("AN-04", leaked.length === 0 && seen.every(([, url]) => url.startsWith(base)), JSON.stringify(seen.filter(([, url]) => !url.startsWith(base)).map((s) => s[1])), p);
    note("AN-04", `${seen.length} POST/body requests observed, all to ${base}`);
    ok("RB-03", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // RB-05 double clicks
  {
    const p = await openPage(browser, { width: 1366, height: 900 });
    await openBill(p, base, "DEMO-7719");
    await payButton(p).click(); await p.waitForSelector(".pay-modes");
    await p.locator(".modal-content .button-primary").dblclick(); await sleep(600);
    let evs = (await eventsOf(p)).filter((e) => e.name === "payment_simulated");
    ok("RB-05", evs.length === 1, `double-click on Simulate payment fired ${evs.length} payment events`, p);
    await p.keyboard.press("Escape"); 
    await openBill(p, base, "DEMO-7719");
    await disputeButton(p).click(); await p.waitForSelector(".dispute-form");
    await p.locator(".dispute-form button[type=submit]").dblclick(); await sleep(600);
    evs = (await eventsOf(p)).filter((e) => e.name === "dispute_submitted");
    ok("RB-05", evs.length === 1, `double-click on Submit fired ${evs.length} dispute events`, p);
    ok("RB-05", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }
  void isDev; void inr;
};
