// Independent expected values for every demo bill.
//
// Written from the formula the UI describes, NOT from the app's calc(): exact
// rational arithmetic (BigInt), round half up, so floating point cannot hide or
// cause a mismatch. Input is only app/data/properties.json.
const data = require("../app/data/properties.json");

const dec = (v) => { // "0.95" -> {n: 95n, d: 100n}
  const s = String(v); const [i, f = ""] = s.split(".");
  return { n: BigInt(i + f), d: 10n ** BigInt(f.length) };
};
const mul = (a, b) => ({ n: a.n * b.n, d: a.d * b.d });
const int = (v) => ({ n: BigInt(v), d: 1n });
const roundHalfUp = (q) => Number((2n * q.n + q.d) / (2n * q.d));

function indian(n) { // 158976 -> "1,58,976"
  const s = String(Math.round(n)); if (s.length <= 3) return s;
  const last3 = s.slice(-3); let rest = s.slice(0, -3); const parts = [];
  while (rest.length > 2) { parts.unshift(rest.slice(-2)); rest = rest.slice(0, -2); }
  if (rest) parts.unshift(rest);
  return parts.join(",") + "," + last3;
}
const inr = (n) => "₹" + indian(n);

function expectedFor(p) {
  const area = mul(mul(int(p.builtUpArea), dec(p.uav)), int(12));
  const usage = mul(area, dec(p.usageFactor));
  const age = mul(usage, dec(p.ageFactor));
  const occ = mul(age, dec(p.occupancyFactor));
  const tax = roundHalfUp(mul(occ, dec(p.taxRate)));
  const pct = (percent) => roundHalfUp(mul(int(tax), { n: BigInt(percent), d: 100n }));
  const applied = p.appliedRebates.map((r) => ({ title: r.title, amount: pct(r.percent) }));
  const unclaimed = p.unclaimedRebates.map((r) => ({ title: r.title, amount: pct(r.percent) }));
  const rebateTotal = applied.reduce((s, r) => s + r.amount, 0);
  const beforePenalty = tax - rebateTotal;
  const penalty = p.penalty ? roundHalfUp(mul(int(beforePenalty), { n: BigInt(p.penalty.rate) * BigInt(p.penalty.months), d: 100n })) : 0;
  const due = beforePenalty + penalty;
  const lines = [roundHalfUp(area), roundHalfUp(usage), roundHalfUp(age), roundHalfUp(occ), tax];
  const saving = unclaimed.reduce((s, r) => s + r.amount, 0);
  // every rupee figure that may legitimately appear on any screen for this property
  const allowed = new Set([...lines, ...applied.map((r) => r.amount), ...unclaimed.map((r) => r.amount), rebateTotal, beforePenalty, penalty, due, saving, p.uav, p.guidelineRate, ...p.history.map((h) => h.amount)]);
  return { id: p.id, lines, tax, applied, unclaimed, rebateTotal, beforePenalty, penalty, due, saving, allowed, hasPenalty: !!p.penalty, history: p.history, raw: p };
}

const expected = Object.fromEntries(data.map((p) => [p.id, expectedFor(p)]));
module.exports = { expected, inr, indian, ids: data.map((p) => p.id), data };

if (require.main === module) {
  for (const e of Object.values(expected)) console.log(e.id, { lines: e.lines.map(inr), tax: inr(e.tax), applied: e.applied.map((r) => inr(r.amount)), unclaimed: e.unclaimed.map((r) => inr(r.amount)), penalty: inr(e.penalty), due: inr(e.due) });
}
