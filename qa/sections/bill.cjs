// BL-*, BD-*, NM-*: every number on the bill and the breakdown, in both languages.
const { openPage, sleep, text, rupeeTokens } = require("../lib.cjs");
const { expected, inr, ids } = require("../expected.cjs");

const STATUS = { "DEMO-2048": "Due", "DEMO-7719": "Due · possible saving found", "DEMO-3982": "Overdue" };

module.exports = async function bill({ browser, base, rec }) {
  const { ok } = rec;
  const page = await openPage(browser, { width: 1366, height: 900 });
  const amountOf = (s) => rupeeTokens(s)[0];

  for (const id of ids) {
    const e = expected[id];
    const n = id === "DEMO-2048" ? "BL-01" : id === "DEMO-7719" ? "BL-02" : "BL-03";
    await page.goto(`${base}/bill/${id}`); await page.waitForSelector(".bill-main");
    // BL-01..03 headline
    const headline = amountOf(await text(page, ".amount-panel strong"));
    ok(n, headline === e.due, `${id} shows ${inr(headline)}, expected ${inr(e.due)}`, page);
    ok(n, (await text(page, ".amount-panel span")).toLowerCase().includes("amount due"), "amount label", page);
    ok("BL-11", (await text(page, "#bill-title")).includes(e.raw.fy), await text(page, "#bill-title"), page);
    // BL-04..06 banners
    const saving = page.locator(".saving-banner"), warning = page.locator(".warning-banner");
    ok("BL-04", (await saving.count()) === (e.saving > 0 ? 1 : 0), `${id}: saving banner count ${await saving.count()}`, page);
    if (e.saving > 0) ok("BL-04", amountOf(await saving.textContent()) === e.saving, `banner says ${await saving.textContent()}, expected ${inr(e.saving)}`, page);
    ok("BL-05", (await warning.count()) === (e.hasPenalty ? 1 : 0), `${id}: warning banner count ${await warning.count()}`, page);
    if (e.hasPenalty) ok("BL-05", amountOf(await warning.textContent()) === e.penalty, `banner says ${await warning.textContent()}, expected ${inr(e.penalty)}`, page);
    if (id === "DEMO-2048") ok("BL-06", (await saving.count()) === 0 && (await warning.count()) === 0, "clean bill has a banner", page);
    // BL-07 badge
    ok("BL-07", (await text(page, ".status-badge")) === STATUS[id], `${id} badge "${await text(page, ".status-badge")}"`, page);
    // BL-08 history
    const rows = await page.$$eval(".history-row", (rs) => rs.map((r) => ({ fy: r.querySelector(".history-fy").textContent, amount: r.querySelector(".history-amount").textContent, status: r.querySelector(".history-status").textContent })));
    ok("BL-08", rows.length === 4, `rows ${rows.length}`, page);
    ok("BL-08", rows[0] && rupeeTokens(rows[0].amount)[0] === e.due && /Current/.test(rows[0].fy) && rows[0].fy.startsWith(e.raw.fy), JSON.stringify(rows[0]), page);
    ok("BL-08", rows.slice(1).every((r, i) => rupeeTokens(r.amount)[0] === e.history[i].amount && r.fy.startsWith(e.history[i].fy) && r.status === "Paid"), JSON.stringify(rows.slice(1)), page);
    const years = rows.map((r) => parseInt(r.fy, 10));
    ok("BL-08", years.every((y, i) => i === 0 || y < years[i - 1]), "years not descending " + years, page);
    ok("BL-08", rows[0].status === (e.hasPenalty ? "Overdue" : "Due"), `current status ${rows[0].status}`, page);
    // BL-10 dates (English)
    const dd = await page.$$eval(".summary-info .property-stat", (els) => els.map((d) => d.textContent.replace(/\s+/g, " ").trim()));
    const joined = dd.join(" | ");
    ok("BL-10", joined.includes(`${e.raw.periodStart}`) && joined.includes(e.raw.periodEnd) && joined.includes(e.raw.billDate) && joined.includes(e.raw.dueDate), joined, page);
    // BL-09 grouping + NM-04 whole page scan
    const body = await page.innerText("body");
    const toks = rupeeTokens(body);
    const rawToks = body.match(/₹\s?[\d,]+(?:\.\d+)?/g) || [];
    ok("BL-09", rawToks.every((t, i) => t.replace(/\s/g, "") === inr(toks[i])), "badly grouped: " + rawToks.filter((t, i) => t.replace(/\s/g, "") !== inr(toks[i])).join(" "), page);
    ok("NM-04", toks.every((v) => e.allowed.has(v)), `${id} bill shows unexpected amounts: ${[...new Set(toks.filter((v) => !e.allowed.has(v)))].map(inr).join(" ")}`, page);

    // ---- breakdown ----
    await page.goto(`${base}/bill/${id}/breakdown`); await page.waitForSelector(".breakdown-main");
    ok("BD-03", amountOf(await text(page, ".explain-total strong")) === e.due && amountOf(await text(page, ".explain-intro h1")) === e.due, `${await text(page, ".explain-total strong")} / ${await text(page, ".explain-intro h1")}`, page);
    const lists = await page.$$eval(".calculation-list", (ls) => ls.map((l) => [...l.querySelectorAll(".calc-line")].map((c) => ({ label: c.querySelector(".calc-copy strong").textContent, helper: c.querySelector(".calc-copy span").textContent, value: c.querySelector(".calc-value b").textContent }))));
    const formula = lists[0], summary = lists[1];
    ok("BD-01", formula.length === 5, `formula lines ${formula.length}`, page);
    formula.forEach((l, i) => ok("BD-01", rupeeTokens(l.value)[0] === e.lines[i], `${id} line "${l.label}" shows ${l.value}, expected ${inr(e.lines[i])}`, page));
    const total = summary[summary.length - 1];
    ok("BD-02", rupeeTokens(total.value)[0] === e.due, `total line ${total.value}`, page);
    ok("BD-02", summary.length === (e.hasPenalty ? 2 : 1), `summary lines ${summary.length}`, page);
    if (e.hasPenalty) ok("BD-02", rupeeTokens(summary[0].value)[0] === e.penalty && summary[0].value.startsWith("+"), `penalty line ${summary[0].value}`, page);
    // lines visibly add up: tax − applied rebates (+ penalty) = total, using what is on screen
    const applied = (await page.$$eval(".mini-list b", (bs) => bs.map((b) => b.textContent))).map((t) => rupeeTokens(t)[0]);
    ok("BD-02", JSON.stringify(applied) === JSON.stringify(e.applied.map((r) => r.amount)), `applied rebates on screen ${applied}, expected ${e.applied.map((r) => r.amount)}`, page);
    const shownTax = rupeeTokens(formula[4].value)[0], shownPen = e.hasPenalty ? rupeeTokens(summary[0].value)[0] : 0, shownTotal = rupeeTokens(total.value)[0];
    ok("BD-02", shownTax - applied.reduce((a, b) => a + b, 0) + shownPen === shownTotal, `on-screen lines do not add up: ${shownTax} − ${applied.join("+")} + ${shownPen} ≠ ${shownTotal}`, page);
    // BD-06 unclaimed
    const unclaimed = (await page.$$eval(".unclaimed-row b", (bs) => bs.map((b) => b.textContent))).map((t) => rupeeTokens(t)[0]);
    ok("BD-06", JSON.stringify(unclaimed) === JSON.stringify(e.unclaimed.map((r) => r.amount)), `could-save rows ${unclaimed}`, page);
    // BD-07 record
    const rec7 = await page.$$eval(".record-row", (rs) => rs.map((r) => r.textContent.replace(/\s+/g, " ")));
    const r = e.raw;
    ok("BD-07", rec7.join("|").includes(r.khataNumber) && rec7.join("|").includes(r.surveyNumber) && rec7.join("|").includes(r.ward) && rec7.join("|").includes(r.ownerName) && rec7.join("|").includes(r.relationName) && rec7.join("|").includes(inr(r.guidelineRate)), rec7.join(" | "), page);
    // BD-08 factors shown cleanly
    const bodyB = await page.innerText("body");
    ok("BD-08", !/\d\.\d{4,}/.test(bodyB) && !/NaN|undefined|\[object/.test(bodyB), (bodyB.match(/\d\.\d{4,}|NaN|undefined|\[object/g) || []).join(","), page);
    const helpers = formula.map((l) => l.helper).join(" | ");
    ok("BD-08", helpers.includes(r.ageFactor.toFixed(2)) && helpers.includes(r.usageFactor.toFixed(2)) && helpers.includes(String(Math.round(r.taxRate * 100)) + "%"), helpers, page);
    // BD-04 expand / collapse + BD-05 detail quotes the line amount
    const triggers = page.locator(".calc-trigger");
    const nTrig = await triggers.count();
    ok("BD-04", nTrig === formula.length + summary.length, `${nTrig} triggers`, page);
    for (let i = 0; i < nTrig; i++) {
      const t = triggers.nth(i);
      ok("BD-04", (await t.getAttribute("aria-expanded")) === "false", "starts expanded", page);
      await t.click(); await sleep(500);
      const open = (await t.getAttribute("aria-expanded")) === "true";
      const details = await page.locator(".calc-detail").count();
      ok("BD-04", open && details === 1, `line ${i}: aria-expanded=${open}, open details=${details}`, page);
      const detailText = await page.locator(".calc-detail").first().textContent();
      const lineValue = (formula.concat(summary))[i];
      const label = lineValue.label;
      if (!/Amount due/.test(label)) ok("BD-05", detailText.includes(lineValue.value.replace(/^[+−]/, "")), `"${label}" shows ${lineValue.value} but its detail says: ${detailText.slice(0, 140)}`, page);
      if (i > 0 && i < nTrig - 1) { /* opening the next one closes this one: covered by details===1 */ }
    }
    await triggers.nth(nTrig - 1).click(); await sleep(500);
    ok("BD-04", (await triggers.nth(nTrig - 1).getAttribute("aria-expanded")) === "false" && (await page.locator(".calc-detail").count()) === 0, "collapse did not close the line", page);
    // NM-04 on breakdown, both languages
    for (const lang of ["en", "hi"]) {
      const p2 = await openPage(browser, { width: 1366, height: 900, lang });
      for (const screen of ["", "/breakdown"]) {
        await p2.goto(`${base}/bill/${id}${screen}`); await p2.waitForSelector(screen ? ".breakdown-main" : ".bill-main"); await sleep(300);
        const b2 = await p2.innerText("body");
        const t2 = rupeeTokens(b2), raw2 = b2.match(/₹\s?[\d,]+(?:\.\d+)?/g) || [];
        ok("NM-04", t2.every((v) => e.allowed.has(v)) && raw2.every((t, i) => t.replace(/\s/g, "") === inr(t2[i])), `${lang} ${id}${screen}: ${[...new Set(t2.filter((v) => !e.allowed.has(v)))].map(inr).join(" ")}`, p2);
      }
      await p2.ctx.close();
    }
  }
  // hand-checked anchors for the report (NM-01..03)
  ok("NM-01", expected["DEMO-2048"].due === 10487 && expected["DEMO-2048"].tax === 12338 && expected["DEMO-2048"].rebateTotal === 1851, "expected.cjs disagrees with the hand calculation");
  ok("NM-02", expected["DEMO-7719"].due === 16311 && expected["DEMO-7719"].lines[0] === 158976 && expected["DEMO-7719"].saving === 2718, "expected.cjs disagrees with the hand calculation");
  ok("NM-03", expected["DEMO-3982"].due === 22790 && expected["DEMO-3982"].penalty === 1085 && expected["DEMO-3982"].lines[2] === 155034, "expected.cjs disagrees with the hand calculation");
  ok("BL-01", page.problems.length === 0, page.problems.join(" | "));
  await page.ctx.close();
};
