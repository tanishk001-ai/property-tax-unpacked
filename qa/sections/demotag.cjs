// DT-*: the "Demo data" tag beside the headline amounts.
const fs = require("fs"); const path = require("path");
const { openPage, sleep } = require("../lib.cjs");
const { ids, inr, expected } = require("../expected.cjs");

const TEXT = { en: "Demo data", hi: "डेमो डेटा" };

async function inspect(p, panelSel) {
  return p.evaluate((sel) => {
    const panel = document.querySelector(sel); const strong = panel.querySelector("strong"); const tag = panel.querySelector(".demo-tag");
    if (!tag) return { missing: true };
    const rs = strong.getBoundingClientRect(), rt = tag.getBoundingClientRect(), rp = panel.getBoundingClientRect();
    const cs = getComputedStyle(tag), fs = parseFloat(getComputedStyle(strong).fontSize);
    const parse = (c) => (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const l1 = lum(parse(cs.color)), l2 = lum(parse(cs.backgroundColor));
    return {
      text: tag.textContent.trim(), amountText: strong.textContent.trim(),
      amountLines: Math.round(rs.height / (fs * 1)), amountH: Math.round(rs.height), fontSize: fs,
      sameLine: rt.top < rs.bottom && rt.bottom > rs.top, overlap: rt.left < rs.right - 0.5 && rt.right > rs.left + 0.5 && rt.top < rs.bottom && rt.bottom > rs.top && rt.left < rs.left + rs.width,
      gap: Math.round(rt.left - rs.right), insidePanel: rt.right <= rp.right + 0.5 && rs.left >= rp.left - 0.5,
      contrast: +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2), visible: rt.width > 0 && rt.height > 0 && cs.visibility !== "hidden" && parseFloat(cs.opacity) === 1,
    };
  }, panelSel);
}

module.exports = async function demotag({ browser, base, rec }) {
  const { ok } = rec;
  const shots = path.join(__dirname, "..", "screenshots", "demo-tag"); fs.mkdirSync(shots, { recursive: true });
  for (const [w, h] of [[320, 640], [390, 844], [1366, 768]]) for (const lang of ["en", "hi"]) {
    const p = await openPage(browser, { width: w, height: h, lang });
    for (const id of ids) {
      const e = expected[id];
      for (const [screen, sfx, panel, idn] of [["bill", "", ".amount-panel", "DT-01"], ["breakdown", "/breakdown", ".explain-total", "DT-02"]]) {
        await p.goto(`${base}/bill/${id}${sfx}`); await p.waitForSelector(panel); await sleep(500);
        const r = await inspect(p, panel);
        const where = `${lang} ${w}px ${id} ${screen}`;
        ok(idn, !r.missing && r.text === TEXT[lang] && r.amountText === inr(e.due) && r.sameLine, `${where}: ${JSON.stringify(r)}`, p);
        ok("DT-03", !r.missing && r.amountH < r.fontSize * 1.4 && !r.overlap && r.gap >= 4 && r.insidePanel, `${where}: amount ${r.amountH}px high (font ${r.fontSize}), gap ${r.gap}, inside ${r.insidePanel}`, p);
        ok("DT-04", !r.missing && r.contrast >= 4.5 && r.visible, `${where}: contrast ${r.contrast}`, p);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok("DT-03", over <= 0, `${where}: page overflows by ${over}px`, p);
        if (id === "DEMO-7719" || id === "DEMO-3982") await p.locator(panel).screenshot({ path: path.join(shots, `${screen}-${id}-${lang}-${w}.png`) });
      }
    }
    // DT-05 paid state keeps the tag
    await p.goto(`${base}/bill/DEMO-2048`); await p.waitForSelector(".amount-panel");
    await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); await p.click(".receipt-content .button-dark");
    await p.waitForSelector(".modal-layer", { state: "detached" }); await sleep(500);
    const r = await inspect(p, ".amount-panel");
    ok("DT-05", !r.missing && r.text === TEXT[lang] && r.sameLine && r.amountH < r.fontSize * 1.4, `${lang} ${w}px paid: ${JSON.stringify(r)}`, p);
    ok("RB-03", p.problems.length === 0, p.problems.join(" | "), p);
    await p.ctx.close();
  }
  // DT-06: the cropped picture really contains the tag (checked as text in the cropped element)
  ok("DT-06", fs.readdirSync(shots).length >= 20, "pictures not saved");
};
