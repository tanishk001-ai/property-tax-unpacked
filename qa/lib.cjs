// Shared helpers for the QA suite. Playwright is not an app dependency: point
// PLAYWRIGHT_PATH at an installed copy (or have `playwright` resolvable).
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const pw = require(process.env.PLAYWRIGHT_PATH || "playwright");

const RESULTS_DIR = path.join(__dirname, "results");
const SHOT_DIR = path.join(__dirname, "screenshots");
// the analytics script is /_vercel/insights/script.js in dev and /<hash>/script.js on Vercel
const ANALYTICS_URL = /va\.vercel-scripts\.com|_vercel\/insights|\/[0-9a-f]{12,}\/(script\.js|view|event|session)/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function createRecorder(envName, outFile) {
  const results = {};
  let shotN = 0;
  async function ok(id, pass, detail, page) {
    const r = (results[id] = results[id] || { pass: true, details: [], checks: 0 });
    r.checks += 1;
    if (!pass) {
      r.pass = false;
      r.details.push(String(detail ?? "failed"));
      if (page) {
        try {
          shotN += 1;
          const sub = /baseline/.test(envName) ? "before" : "after";
          const file = `${sub}/${envName}-${id}-${shotN}.png`;
          fs.mkdirSync(path.join(SHOT_DIR, sub), { recursive: true });
          await page.screenshot({ path: path.join(SHOT_DIR, file), fullPage: false });
          r.screenshots = (r.screenshots || []).concat(file);
        } catch { /* page may be gone */ }
      }
    }
    console.log(`${pass ? "PASS" : "FAIL"}  ${id}${pass ? "" : "  — " + String(detail ?? "").split("\n")[0].slice(0, 220)}`);
  }
  function note(id, text) { const r = (results[id] = results[id] || { pass: true, details: [], checks: 0 }); r.notes = (r.notes || []).concat(text); }
  function save() { fs.writeFileSync(outFile || path.join(RESULTS_DIR, `${envName}.json`), JSON.stringify({ env: envName, at: new Date().toISOString(), results }, null, 1)); }
  return { ok, note, save, results };
}

// A browser page with the problems we care about collected on page.problems and
// analytics calls captured on window.__va (unless captureVa is false).
async function openPage(browser, opts = {}) {
  const { width = 1366, height = 768, lang = "en", js = true, blockStorage = false, colorScheme, reducedMotion, mobile = width <= 768, blockAnalytics = false, captureVa = true, clipboard, realAnalytics = false } = opts;
  const ctx = await browser.newContext({
    viewport: { width, height },
    javaScriptEnabled: js,
    isMobile: mobile && js, hasTouch: mobile && js, deviceScaleFactor: mobile ? 2 : 1,
    colorScheme, reducedMotion,
    permissions: clipboard === "allow" ? ["clipboard-read", "clipboard-write"] : undefined,
  });
  if (js) {
    await ctx.addInitScript(({ l, blockStorage: bs, captureVa: cv, clip }) => {
      if (bs) {
        const deny = () => { throw new DOMException("denied", "SecurityError"); };
        Object.defineProperty(window, "localStorage", { get: deny, configurable: true });
        Object.defineProperty(window, "sessionStorage", { get: deny, configurable: true });
      } else if (l) {
        try { localStorage.setItem("unpacked.lang", l); } catch {}
      }
      if (cv) { window.__va = []; window.va = (...a) => { window.__va.push(a); }; }
      if (clip === "missing" || clip === "none") { Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true }); }
      if (clip === "reject") { Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")) }, configurable: true }); }
      if (clip === "missing" || clip === "reject" || clip === "none") {
        // spy on the legacy copy route; "none" makes it fail too
        const real = document.execCommand.bind(document);
        window.__copied = null;
        document.execCommand = (cmd, ...a) => { if (cmd === "copy") { window.__copied = document.activeElement && "value" in document.activeElement ? document.activeElement.value : String(getSelection()); return clip !== "none"; } return real(cmd, ...a); };
      }
    }, { l: lang, blockStorage, captureVa, clip: clipboard });
  }
  if (realAnalytics) { /* let the real analytics script load */ }
  else if (blockAnalytics) await ctx.route(ANALYTICS_URL, (r) => r.abort("blockedbyclient"));
  else await ctx.route(ANALYTICS_URL, (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  const page = await ctx.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on("requestfailed", (r) => {
    const aborted = /ERR_ABORTED/.test(r.failure()?.errorText || "");
    if (/vercel/.test(r.url()) && blockAnalytics) return;
    if (aborted && /_rsc=/.test(r.url())) return; // router prefetch cancelled by a navigation
    problems.push("requestfailed: " + r.url() + " " + (r.failure()?.errorText || ""));
  });
  page.on("response", (r) => { if (r.status() >= 500) problems.push(`http ${r.status()}: ${r.url()}`); });
  page.problems = problems;
  page.ctx = ctx;
  return page;
}

// Raw HTTP GET that sends the path exactly as given (fetch() would normalise %2e%2e).
function rawGet(base, rawPath, headers = {}) {
  const u = new URL(base);
  const lib = u.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request({ host: u.hostname, port: u.port || undefined, path: rawPath, method: "GET", headers: { "user-agent": "qa-suite", accept: "text/html", ...headers } }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => { const buf = Buffer.concat(chunks); resolve({ status: res.statusCode, location: res.headers.location, headers: res.headers, body: buf.toString("utf8"), buf }); });
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("timeout")));
    req.end();
  });
}

// Follows redirects by hand, returns the chain of [status, path].
async function followChain(base, rawPath, max = 6) {
  const chain = []; let p = rawPath; let res;
  for (let i = 0; i < max; i++) {
    res = await rawGet(base, p);
    chain.push([res.status, p]);
    if (res.status >= 300 && res.status < 400 && res.location) { const l = new URL(res.location, base); p = l.pathname + l.search; continue; }
    break;
  }
  return { chain, final: res, hops: chain.length - 1, finalPath: p };
}

const text = async (page, sel) => (await page.locator(sel).first().textContent())?.replace(/\s+/g, " ").trim() ?? "";
const rupeeTokens = (s) => (s.match(/₹\s?[\d,]+(?:\.\d+)?/g) || []).map((x) => Number(x.replace(/[₹\s,]/g, "")));
const eventsOf = (page) => page.evaluate(() => (window.__va || []).filter((e) => e[0] === "event").map((e) => ({ name: e[1].name, data: e[1].data })));

module.exports = { ANALYTICS_URL, pw, sleep, createRecorder, openPage, rawGet, followChain, text, rupeeTokens, eventsOf, RESULTS_DIR, SHOT_DIR };
