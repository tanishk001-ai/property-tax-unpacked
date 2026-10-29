// Builds the pass/fail table for QA_REPORT.md from TEST_PLAN.md (case list) and
// results/*.json.  node qa/report.cjs  ->  prints markdown to stdout.
const fs = require("fs");
const path = require("path");
const plan = fs.readFileSync(path.join(__dirname, "TEST_PLAN.md"), "utf8");
const cases = [];
let feature = "";
for (const line of plan.split("\n")) {
  const h = line.match(/^## (.+)/); if (h) feature = h[1];
  const m = line.match(/^- \*\*([A-Z]{2}-\d{2})\*\* (.+)$/); if (m) cases.push({ id: m[1], feature, text: m[2].replace(/\s*\((auto|manual)[^)]*\)\s*$/i, "") });
}
const load = (f) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "results", f), "utf8")).results; } catch { return null; } };
const cols = [["Before fixes (prod build)", "prod-local-baseline.json"], ["After fixes (prod build)", "prod-local.json"], ["After fixes (dev, strict mode)", "dev.json"], ["Vercel preview", "preview.json"], ["Live site (after merge)", "live.json"]];
const data = cols.map(([, f]) => load(f));
const manual = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, "manual-results.json"), "utf8")); } catch { return {}; } })();
const cell = (r) => (!r ? "·" : r.pass ? "✅" : "❌");
const out = [];
out.push("| Case | What was checked | " + cols.map((c) => c[0]).join(" | ") + " | Manual |");
out.push("|---|---|" + cols.map(() => "---").join("|") + "|---|");
for (const c of cases) {
  const cells = data.map((d) => cell(d && d[c.id]));
  const man = manual[c.id] ? `${manual[c.id].pass ? "✅" : "❌"} ${manual[c.id].note}` : "";
  out.push(`| ${c.id} | ${c.text.replace(/\|/g, "\\|")} | ${cells.join(" | ")} | ${man.replace(/\|/g, "\\|")} |`);
}
console.log(out.join("\n"));
const unknownIds = new Set(); for (const d of data) if (d) for (const id of Object.keys(d)) if (!cases.find((c) => c.id === id) && !id.startsWith("SUITE") && id !== "RB-03") unknownIds.add(id);
if (unknownIds.size) console.error("ids in results but not in the plan: " + [...unknownIds].join(", "));
