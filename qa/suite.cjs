// QA suite entry point.  node qa/suite.cjs <baseUrl> <envName> [--only=RT,LK,...]
// PLAYWRIGHT_PATH must point at an installed Playwright package.
const { pw, createRecorder } = require("./lib.cjs");
const base = process.argv[2] || "http://localhost:3102";
const env = process.argv[3] || "prod-local";
const only = (process.argv.find((a) => a.startsWith("--only=")) || "").replace("--only=", "").split(",").filter(Boolean);
const out = (process.argv.find((a) => a.startsWith("--out=")) || "").replace("--out=", "") || undefined;
const SECTIONS = ["routing", "lookup", "bill", "modals", "lang", "layout", "a11y", "robust", "share", "webkit", "demotag"];

(async () => {
  const rec = createRecorder(env, out);
  const browser = await pw.chromium.launch();
  for (const name of SECTIONS) {
    if (only.length && !only.includes(name)) continue;
    console.log(`\n=== ${name} (${env}: ${base}) ===`);
    try { await require(`./sections/${name}.cjs`)({ browser, base, env, rec }); }
    catch (e) { console.log(`ERROR in section ${name}: ${e.stack || e}`); await rec.ok(`SUITE-${name}`, false, String(e.stack || e)); }
    rec.save();
  }
  await browser.close();
  rec.save();
  const all = Object.entries(rec.results);
  const failed = all.filter(([, r]) => !r.pass);
  console.log(`\n${all.length - failed.length}/${all.length} case ids passed on ${env}`);
  if (failed.length) console.log("FAILED: " + failed.map(([id]) => id).join(", "));
  process.exit(0);
})();
