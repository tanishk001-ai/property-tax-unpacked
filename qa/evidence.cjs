// Captures side-by-side evidence of the main bugs. node qa/evidence.cjs <baseUrl> <before|after>
const fs = require("fs"); const path = require("path");
const { pw, openPage, sleep, rawGet } = require("./lib.cjs");
const base = process.argv[2], label = process.argv[3];
const out = path.join(__dirname, "screenshots", label); fs.mkdirSync(out, { recursive: true });
const evid = path.join(__dirname, "evidence"); fs.mkdirSync(evid, { recursive: true });
(async () => {
  const browser = await pw.chromium.launch();
  // 1. landing, first paint without JavaScript (what a slow connection shows before the scripts arrive)
  { const p = await openPage(browser, { width: 390, height: 844, js: false }); await p.goto(base + "/"); await sleep(1200); await p.screenshot({ path: path.join(out, "landing-without-javascript-390.png") }); await p.ctx.close(); }
  // 2. receipt closed with the X
  { const p = await openPage(browser, { width: 390, height: 844 }); await p.goto(base + "/bill/DEMO-7719"); await p.waitForSelector(".bill-main"); await sleep(400);
    await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); await sleep(500);
    await p.screenshot({ path: path.join(out, "receipt-before-closing-390.png") });
    await p.click(".receipt-content .modal-close"); await sleep(900);
    await p.screenshot({ path: path.join(out, "bill-after-closing-receipt-with-X-390.png") });
    // 3. breakdown after paying
    await p.goto(base + "/bill/DEMO-7719"); await p.waitForSelector(".bill-main"); await p.click(".bottom-right .button-primary"); await p.waitForSelector(".pay-modes"); await p.click(".modal-content .button-primary"); await p.waitForSelector(".receipt-rows"); await p.click(".receipt-content .button-dark"); await sleep(900);
    await p.click(".summary-action .button-dark"); await p.waitForSelector(".breakdown-main"); await sleep(600);
    await p.screenshot({ path: path.join(out, "breakdown-after-paying-390.png") });
    await p.ctx.close(); }
  // 4. dispute note typed, then language toggled
  { const p = await openPage(browser, { width: 1000, height: 800 }); await p.goto(base + "/bill/DEMO-3982"); await p.waitForSelector(".bill-main"); await sleep(400);
    await p.click(".bottom-actions > .bottom-secondary"); await p.waitForSelector(".dispute-form"); await p.fill("#dispute-reason", "My own note: the shop closed in March.");
    await p.evaluate(() => document.querySelector(".lang-toggle button:last-child").click()); await sleep(700);
    await p.screenshot({ path: path.join(out, "dispute-note-after-language-toggle.png") }); await p.ctx.close(); }
  // 5. an address that is not a page
  for (const lang of ["en", "hi"]) { const p = await openPage(browser, { width: 390, height: 844, lang }); await p.goto(base + "/bill/DEMO-7719/extra"); await sleep(1200); await p.screenshot({ path: path.join(out, `not-found-page-${lang}-390.png`) }); await p.ctx.close(); }
  await browser.close();
  // 6. what a link preview crawler sees
  const html = (await rawGet(base, "/bill/DEMO-7719")).body;
  const head = (html.match(/<head>[\s\S]*?<\/head>/) || [""])[0].replace(/<script[\s\S]*?<\/script>/g, "").replace(/<link rel="(?:preload|stylesheet)"[^>]*>/g, "").replace(/></g, ">\n<");
  fs.writeFileSync(path.join(evid, `head-of-bill-page-${label}.html`), head + "\n");
  const fav = await rawGet(base, "/favicon.ico");
  fs.writeFileSync(path.join(evid, `favicon-${label}.txt`), `GET /favicon.ico -> ${fav.status}\n`);
})();
