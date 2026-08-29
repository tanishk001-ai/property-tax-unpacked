"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import propertyFixtures from "./data/properties.json";
import { useI18n, LangToggle, type Lang } from "./i18n";
import { formatDateLocalised, translateData, type StrKey } from "./strings";

type TFn = (key: StrKey, ...args: (string | number)[]) => string;

function payModeLabel(t: TFn, mode: PayMode): string {
  if (mode === "UPI") return t("pay.mode.UPI");
  if (mode === "Card") return t("pay.mode.Card");
  return t("pay.mode.Net Banking");
}

// Stable identifiers for the "Question this line" dispute flow. The visible
// label is resolved per-language from the id, so switching language never
// leaves a dispute in a mixed state.
type DisputeId =
  | "built-up-area" | "use-factor" | "age-factor" | "occupancy-factor"
  | "base-tax" | "library-cess" | "health-cess" | "swm-cess"
  | "annual-tax" | "applied-rebate" | "late-charge" | "amount-due";

const DISPUTE_IDS: DisputeId[] = [
  "built-up-area", "use-factor", "age-factor", "occupancy-factor",
  "base-tax", "library-cess", "health-cess", "swm-cess",
  "annual-tax", "applied-rebate", "late-charge", "amount-due",
];

function disputeLabel(t: TFn, lang: Lang, property: Property, id: DisputeId): string {
  switch (id) {
    case "built-up-area": return t("line.builtUpArea");
    case "use-factor": return t("line.useFactor", translateData(lang, property.usage));
    case "age-factor": return t("line.ageFactor", property.age);
    case "occupancy-factor": return t("line.occupancyFactor", translateData(lang, property.occupancy));
    case "base-tax": return t("line.baseTax");
    case "library-cess": return t("line.libraryCess");
    case "health-cess": return t("line.healthCess");
    case "swm-cess": return t("line.swmCess");
    case "annual-tax": return t("line.annualPropertyTax");
    case "applied-rebate": return t("line.appliedRebate");
    case "late-charge": return t("line.latePaymentCharge");
    case "amount-due": return t("line.amountDue");
  }
}

type Rebate = { id: string; title: string; percent: number; reason: string };
type Penalty = { startDate: string; rate: number; months: number; reason: string } | null;
type HistoryEntry = { fy: string; amount: number; status: string };
type PayMode = "UPI" | "Card" | "Net Banking";
type PaymentResult = { reference: string; amount: number; mode: PayMode; timestamp: string; fy: string };
type Address = { houseNo: string; street: string; locality: string; ward: string; city: string; pincode: string };
type Relation = "S/O" | "D/O" | "W/O";
type Property = {
  id: string;
  label: string;
  tone: "clear" | "rebate" | "penalty";
  address: Address;
  khataNumber: string;
  surveyNumber: string;
  ward: string;
  guidelineRate: number;
  ownerName: string;
  relation: Relation;
  relationName: string;
  zone: string;
  usage: string;
  occupancy: string;
  ownerCategory: string;
  builtUpArea: number;
  uav: number;
  usageFactor: number;
  age: number;
  ageFactor: number;
  occupancyFactor: number;
  taxRate: number;
  appliedRebates: Rebate[];
  unclaimedRebates: Rebate[];
  penalty: Penalty;
  dueDate: string;
  status: string;
  billDate: string;
  history: HistoryEntry[];
};

type Line = {
  id: string;
  label: string;
  amount: number;
  sign?: "plus" | "minus" | "equals";
  helper: string;
  detail: ReactNode;
  attention?: "saving" | "warning";
  disputeId?: DisputeId;
};

const properties = propertyFixtures as Property[];
const spring = { type: "spring" as const, bounce: 0, duration: 0.4 };
const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function rupees(value: number) {
  return money.format(Math.round(value));
}

const RELATION_HI: Record<Relation, string> = { "S/O": "पुत्र", "D/O": "पुत्री", "W/O": "पत्नी" };

function formatAddress(lang: Lang, a: Address) {
  const d = (v: string) => translateData(lang, v);
  return `${a.houseNo}, ${d(a.street)}, ${d(a.locality)}, ${d(a.city)} — ${a.pincode}`;
}

function calc(property: Property) {
  const areaValue = property.builtUpArea * property.uav * 12;
  const usageValue = areaValue * property.usageFactor;
  const ageValue = usageValue * property.ageFactor;
  const occupancyValue = ageValue * property.occupancyFactor;
  const coreTax = Math.round(occupancyValue * property.taxRate);
  const applied = property.appliedRebates.map((rebate) => ({
    ...rebate,
    amount: Math.round(coreTax * (rebate.percent / 100)),
  }));
  const rebateTotal = applied.reduce((total, rebate) => total + rebate.amount, 0);
  const beforePenalty = coreTax - rebateTotal;
  const penaltyAmount = property.penalty
    ? Math.round(beforePenalty * (property.penalty.rate / 100) * property.penalty.months)
    : 0;
  const unclaimed = property.unclaimedRebates.map((rebate) => ({
    ...rebate,
    amount: Math.round(coreTax * (rebate.percent / 100)),
  }));

  return { areaValue, usageValue, ageValue, occupancyValue, coreTax, applied, rebateTotal, beforePenalty, penaltyAmount, unclaimed, due: beforePenalty + penaltyAmount };
}

// Display-only decomposition of the existing annual property tax (coreTax) into
// base tax + three earmarked cesses. `base` is the remainder so the four parts
// always sum to exactly coreTax — this changes no calculation, only presentation.
function cessSplit(amounts: ReturnType<typeof calc>) {
  const library = Math.round(amounts.occupancyValue * 0.01);
  const health = Math.round(amounts.occupancyValue * 0.01);
  const swm = Math.round(amounts.occupancyValue * 0.015); // Solid Waste Management cess ≈ 1.5%
  const base = amounts.coreTax - library - health - swm;
  return { base, library, health, swm };
}

function Arrow({ direction = "right" }: { direction?: "right" | "down" | "up" | "left" }) {
  const rotation = direction === "down" ? 90 : direction === "up" ? -90 : direction === "left" ? 180 : 0;
  return <span aria-hidden="true" className="inline-flex h-[1.15em] w-[1.15em] items-center justify-center" style={{ transform: `rotate(${rotation}deg)` }}>→</span>;
}

function Icon({ name, className = "" }: { name: "check" | "spark" | "warning" | "chevron" | "close" | "shield" | "receipt" | "copy" | "info"; className?: string }) {
  const props = { className: `h-[1.1em] w-[1.1em] ${className}`, fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
  if (name === "check") return <svg {...props}><path d="m5 12 4.2 4.2L19.5 6" /></svg>;
  if (name === "spark") return <svg {...props}><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>;
  if (name === "warning") return <svg {...props}><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v4.5" /><path d="M12 17h.01" /></svg>;
  if (name === "chevron") return <svg {...props}><path d="m8 10 4 4 4-4" /></svg>;
  if (name === "close") return <svg {...props}><path d="m6 6 12 12M18 6 6 18" /></svg>;
  if (name === "shield") return <svg {...props}><path d="M12 3 19 6v5c0 4.5-3 7.8-7 10-4-2.2-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "receipt") return <svg {...props}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></svg>;
  if (name === "info") return <svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 7.6h.01" /></svg>;
  return <svg {...props}><rect x="8" y="8" width="11" height="11" rx="1" /><path d="M16 8V5H5v11h3" /></svg>;
}

function PrototypeNote({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <aside className={`prototype-note ${compact ? "prototype-note-compact" : ""}`} aria-label="Prototype disclosure">
      <Icon name="shield" />
      <p><strong>{t("note.lead")}</strong> <a className="prototype-note-link" href="/terms">{t("note.fullTerms")}</a> · <a className="prototype-note-link" href="/faq">{t("note.faq")}</a>. {t("note.body")}</p>
    </aside>
  );
}

function Lookup({ onChoose }: { onChoose: (property: Property) => void }) {
  const { t, lang } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const reduced = useReducedMotion();

  function submit(event: FormEvent) {
    event.preventDefault();
    const match = properties.find((property) => property.id.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      setError("");
      onChoose(match);
    } else {
      setError(t("lookup.error"));
    }
  }

  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Unpacked">
        <div className="brand"><span>Unpacked</span></div>
        <div className="landing-nav-right">
          <span className="nav-caption">{t("brand.tagline")}</span>
          <LangToggle />
        </div>
      </nav>
      <section className="landing-hero" aria-labelledby="landing-title">
        <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="eyebrow"><span className="eyebrow-dot" />{t("landing.eyebrow")}</motion.div>
        <motion.h1 id="landing-title" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>{t("landing.title")}</motion.h1>
        <motion.p initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>{t("landing.sub")}</motion.p>

        <motion.form onSubmit={submit} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }} className="lookup-card">
          <label htmlFor="property-id">{t("lookup.label")}</label>
          <div className="lookup-controls">
            <input id="property-id" value={value} onChange={(event) => { setValue(event.target.value.toUpperCase()); setError(""); }} placeholder={t("lookup.placeholder")} autoCapitalize="characters" aria-describedby={error ? "lookup-error" : undefined} />
            <button className="button button-primary" type="submit">{t("lookup.viewBill")} <Arrow /></button>
          </div>
          <div className="lookup-subrow">
            <button className="text-button" type="button" onClick={() => onChoose(properties[1])}>{t("lookup.trySample")} <Arrow /></button>
            {error ? <span id="lookup-error" className="form-error" role="alert">{error}</span> : <span>{t("lookup.hint")}</span>}
          </div>
        </motion.form>
      </section>

      <section className="sample-section" aria-labelledby="samples-title">
        <div className="section-kicker"><span>{t("samples.kicker")}</span><h2 id="samples-title">{t("samples.title")}</h2></div>
        <div className="sample-grid">
          {properties.map((property, index) => (
            <motion.button key={property.id} className={`sample-card sample-${property.tone}`} type="button" onClick={() => onChoose(property)} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 + index * 0.06 }}>
              <span className="sample-index">0{index + 1}</span>
              <span className="sample-copy"><strong>{translateData(lang, property.label)}</strong><small>{property.id}</small></span>
              <Arrow />
            </motion.button>
          ))}
        </div>
      </section>
      <PrototypeNote />
    </main>
  );
}

function Header({ property, onHome, onBack, screen }: { property: Property; onHome: () => void; onBack: () => void; screen: "bill" | "breakdown" }) {
  const { t } = useI18n();
  return (
    <header className="app-header">
      <div className="page-width header-inner">
        <div className="header-nav">
          <button type="button" className="back-button" onClick={onBack} aria-label={screen === "breakdown" ? t("nav.backToBill") : t("nav.backToProperties")}><Arrow direction="left" />{t("nav.back")}</button>
          <button type="button" className="brand brand-button" onClick={onHome} aria-label={t("nav.backToLookup")}><span>Unpacked</span></button>
        </div>
        <div className="header-right">
          <div className="property-pill"><span className="pill-label">{t("pill.property")}</span><strong>{property.id}</strong><span className="pill-separator" /><span className="pill-view">{screen === "bill" ? t("pill.bill") : t("pill.explanation")}</span></div>
          <LangToggle compact />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return <div className="property-stat"><dt>{label}</dt><dd>{children}</dd></div>;
}

function BillSummary({ property, onExplain, onPay, onDispute, onBack, paid, lastPayment }: { property: Property; onExplain: () => void; onPay: () => void; onDispute: () => void; onBack: () => void; paid: boolean; lastPayment: PaymentResult | null }) {
  const { t, lang } = useI18n();
  const amounts = useMemo(() => calc(property), [property]);
  const hasSaving = amounts.unclaimed.length > 0;
  const savingTotal = amounts.unclaimed.reduce((total, rebate) => total + rebate.amount, 0);
  const isOverdue = property.penalty !== null;
  const currentStatusKey = paid ? "Paid (simulated)" : isOverdue ? "Overdue" : "Due";
  const historyRows = [
    { fy: "2025–26", amount: paid ? (lastPayment?.amount ?? amounts.due) : amounts.due, statusKey: currentStatusKey, current: true },
    ...property.history.map((entry) => ({ fy: entry.fy, amount: entry.amount, statusKey: entry.status, current: false })),
  ];

  return (
    <>
      <Header property={property} onHome={() => window.location.reload()} onBack={onBack} screen="bill" />
      <main className="bill-main page-width">
        <div className="breadcrumb"><button onClick={() => window.location.reload()} type="button">{t("crumb.allProperties")}</button><Arrow /> <span>{t("crumb.billSummary")}</span></div>
        <section className="bill-hero" aria-labelledby="bill-title">
          <div className="bill-context">
            <div className={`status-badge ${paid ? "status-paid" : isOverdue ? "status-overdue" : hasSaving ? "status-saving" : "status-due"}`}>
              {paid ? <Icon name="check" /> : isOverdue ? <Icon name="warning" /> : hasSaving ? <Icon name="spark" /> : <span className="status-dot" />}
              {paid ? (hasSaving ? t("bill.status.paidRebate") : t("bill.status.paid")) : translateData(lang, property.status)}
            </div>
            <p className="address">{formatAddress(lang, property.address)}</p>
            <h1 id="bill-title">{t("bill.title")}</h1>
          </div>
          <div className="amount-panel">
            <span>{paid ? t("bill.paidSimulated") : t("bill.amountDue")}</span>
            <strong>{rupees(amounts.due)}</strong>
            <small>{paid ? (lastPayment ? <>{t("bill.simulatedVia", payModeLabel(t, lastPayment.mode))}<b>{lastPayment.reference}</b></> : t("bill.noRealPayment")) : t("bill.dueByFull", formatDateLocalised(lang, property.dueDate))}</small>
          </div>
        </section>

        {hasSaving && <section className="insight-banner saving-banner"><Icon name="info" /><div><strong>{paid ? t("bill.saving.titlePaid") : t("bill.saving.titleUnpaid")}</strong><span>{paid ? t("bill.saving.bodyPaid", rupees(savingTotal)) : t("bill.saving.bodyUnpaid", rupees(savingTotal))}</span></div><button className="text-button" type="button" onClick={onExplain}>{t("bill.saving.seeIt")} <Arrow /></button></section>}
        {isOverdue && !paid && <section className="insight-banner warning-banner"><Icon name="warning" /><div><strong>{t("bill.warn.title")}</strong><span>{t("bill.warn.body", rupees(amounts.penaltyAmount))}</span></div><button className="text-button" type="button" onClick={onExplain}>{t("bill.warn.understand")} <Arrow /></button></section>}

        <section className="summary-grid" aria-label="Bill summary details">
          <div className="summary-card summary-info"><span className="summary-card-label">{t("bill.details")}</span><dl><Stat label={t("bill.period")}>{t("bill.periodValue")}</Stat><Stat label={t("bill.issuedOn")}>{formatDateLocalised(lang, property.billDate)}</Stat><Stat label={t("bill.dueDate")}>{formatDateLocalised(lang, property.dueDate)}</Stat><Stat label={t("bill.propertyUse")}>{translateData(lang, property.usage)}</Stat></dl></div>
          <div className="summary-card summary-action"><span className="summary-card-label">{t("bill.beforeYouPay")}</span><h2>{t("bill.understandEveryRupee")}</h2><p>{t("bill.understandBody")}</p><button className="button button-dark button-large" type="button" onClick={onExplain}>{t("bill.whyThisAmount")} <Arrow /></button></div>
        </section>

        <section className="payment-history" aria-labelledby="history-title">
          <div className="history-head"><h2 id="history-title">{t("history.title")}</h2><span>{t("history.meta", property.id, property.history.length + 1)}</span></div>
          <ol className="history-list">
            {historyRows.map((row) => {
              const state = row.statusKey.toLowerCase().startsWith("paid") ? "paid" : row.statusKey.toLowerCase() === "overdue" ? "overdue" : "pending";
              const statusLabel = row.statusKey === "Paid (simulated)" ? t("history.status.paidSim") : translateData(lang, row.statusKey);
              return (
                <li key={row.fy} className={`history-row ${row.current ? "is-current" : ""}`}>
                  <span className="history-fy">{row.fy}{row.current && <em>{t("history.current")}</em>}</span>
                  <span className="history-amount">{rupees(row.amount)}</span>
                  <span className={`history-status status-${state}`}>{statusLabel}</span>
                </li>
              );
            })}
          </ol>
          <p className="muted-copy">{t("history.note")}</p>
        </section>
      </main>
      <BottomActions onExplain={onExplain} onPay={onPay} onDispute={onDispute} paid={paid} />
      <footer className="page-footer page-width"><PrototypeNote compact /></footer>
    </>
  );
}

function CalculationLine({ line, open, onToggle, onQuestion }: { line: Line; open: boolean; onToggle: () => void; onQuestion: () => void }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  return (
    <div className={`calc-line ${line.attention ? `calc-${line.attention}` : ""} ${open ? "is-open" : ""}`}>
      <button type="button" className="calc-trigger" onClick={onToggle} aria-expanded={open} aria-controls={`${line.id}-detail`}>
        <span className="calc-copy"><strong>{line.label}</strong><span>{line.helper}</span></span>
        <span className="calc-value"><b className={line.sign === "minus" ? "value-minus" : line.sign === "plus" ? "value-plus" : ""}>{line.sign === "minus" ? "−" : line.sign === "plus" ? "+" : ""}{rupees(line.amount)}</b><span className="chevron"><Icon name="chevron" /></span></span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div id={`${line.id}-detail`} className="calc-detail" initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }} exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={reduced ? { duration: 0.12 } : spring} style={{ transformOrigin: "top" }}>
          <div className="calc-detail-inner"><div>{line.detail}</div><button type="button" className="question-button" onClick={onQuestion}>{t("calc.questionThisLine")} <Arrow /></button></div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

function DetailCard({ title, children, tone }: { title: string; children: ReactNode; tone?: "saving" | "warning" }) {
  return <section className={`detail-card ${tone ? `detail-${tone}` : ""}`}><div className="detail-card-title">{tone === "saving" ? <Icon name="info" /> : tone === "warning" ? <Icon name="warning" /> : <Icon name="receipt" />}<h3>{title}</h3></div>{children}</section>;
}

function Breakdown({ property, onBack, onPay, onDispute }: { property: Property; onBack: () => void; onPay: () => void; onDispute: (line?: DisputeId) => void }) {
  const { t, lang } = useI18n();
  const amounts = useMemo(() => calc(property), [property]);
  const cess = useMemo(() => cessSplit(amounts), [amounts]);
  const [openLine, setOpenLine] = useState<string | null>(null);
  const ratePct = (property.taxRate * 100).toFixed(0);
  const usageT = translateData(lang, property.usage);
  const occT = translateData(lang, property.occupancy);
  const areaV = rupees(amounts.areaValue);
  const occV = rupees(amounts.occupancyValue);
  const formulaLines: Line[] = [
    { id: "area", disputeId: "built-up-area", label: t("line.builtUpArea"), amount: amounts.areaValue, helper: t("help.area", property.builtUpArea, rupees(property.uav)), detail: <p>{t("det.area", property.builtUpArea, rupees(property.uav), areaV)}</p> },
    { id: "usage", disputeId: "use-factor", label: t("line.useFactor", usageT), amount: amounts.usageValue, helper: t("help.useFactor", property.usageFactor.toFixed(2)), detail: <p>{t("det.useFactor", usageT, property.usageFactor.toFixed(2), rupees(amounts.usageValue))}</p> },
    { id: "age", disputeId: "age-factor", label: t("line.ageFactor", property.age), amount: amounts.ageValue, helper: t("help.ageFactor", property.ageFactor.toFixed(2)), detail: <p>{t("det.ageFactor", property.age, Math.round((1 - property.ageFactor) * 100), property.ageFactor.toFixed(2), rupees(amounts.ageValue))}</p> },
    { id: "occupancy", disputeId: "occupancy-factor", label: t("line.occupancyFactor", occT), amount: amounts.occupancyValue, helper: t("help.occupancyFactor", property.occupancyFactor.toFixed(2)), detail: <p>{t("det.occupancyFactor", occT, property.occupancyFactor.toFixed(2), occV)}</p> },
    { id: "base-tax", disputeId: "base-tax", label: t("line.baseTax"), amount: cess.base, helper: t("help.baseTax", occV), detail: <p>{t("det.baseTax", occV, ratePct, rupees(cess.base))}</p> },
    { id: "library-cess", disputeId: "library-cess", label: t("line.libraryCess"), amount: cess.library, helper: t("help.cess1pct"), detail: <p>{t("det.libraryCess", rupees(cess.library))}</p> },
    { id: "health-cess", disputeId: "health-cess", label: t("line.healthCess"), amount: cess.health, helper: t("help.cess1pct"), detail: <p>{t("det.healthCess", rupees(cess.health), rupees(amounts.coreTax))}</p> },
    { id: "swm-cess", disputeId: "swm-cess", label: t("line.swmCess"), amount: cess.swm, helper: t("help.cessSwm"), detail: <p>{t("det.swmCess", rupees(cess.swm), rupees(amounts.coreTax))}</p> },
  ];
  const summaryLines: Line[] = [
    ...(property.penalty ? [{ id: "penalty", disputeId: "late-charge" as const, label: t("line.latePaymentCharge"), amount: amounts.penaltyAmount, sign: "plus" as const, helper: t("help.penalty", property.penalty.rate, property.penalty.months), attention: "warning" as const, detail: <p>{t("det.penalty", translateData(lang, property.penalty.reason), formatDateLocalised(lang, property.penalty.startDate), property.penalty.rate, rupees(amounts.beforePenalty), property.penalty.months, rupees(amounts.penaltyAmount))}</p> }] : []),
    { id: "total", disputeId: "amount-due", label: t("line.amountDue"), amount: amounts.due, sign: "equals" as const, helper: t("help.totalDue"), detail: <p>{t("det.total")}</p> },
  ];
  const toggle = (id: string) => setOpenLine((current) => current === id ? null : id);

  return (
    <>
      <Header property={property} onHome={() => window.location.reload()} onBack={onBack} screen="breakdown" />
      <main className="breakdown-main page-width">
        <div className="breadcrumb"><button onClick={onBack} type="button">{t("crumb.billSummary")}</button><Arrow /> <span>{t("crumb.whyThisAmount")}</span></div>
        <section className="explain-intro"><div><span className="eyebrow"><span className="eyebrow-dot" />{t("bd.eyebrow")}</span><h1>{t("bd.h1", rupees(amounts.due))}</h1><p>{t("bd.intro")}</p></div><div className="explain-total"><span>{t("bill.amountDue")}</span><strong>{rupees(amounts.due)}</strong><small>{t("bd.due", formatDateLocalised(lang, property.dueDate))}</small></div></section>

        <section className="record-section" aria-labelledby="record-title">
          <div className="section-heading"><span>01</span><div><h2 id="record-title">{t("rec.title")}</h2><p>{t("rec.sub")}</p></div></div>
          <dl className="record-list">
            <div className="record-row"><dt>Khata number</dt><dd>{property.khataNumber}</dd></div>
            <div className="record-row"><dt>Survey number</dt><dd>{property.surveyNumber}</dd></div>
            <div className="record-row"><dt>Ward <span className="record-hi" lang="hi">वार्ड</span></dt><dd>{property.ward}</dd></div>
            <div className="record-row"><dt>Owner name <span className="record-hi" lang="hi">स्वामी का नाम</span></dt><dd>{property.ownerName}<em>{RELATION_HI[property.relation]} {property.relation} {property.relationName}</em></dd></div>
            <div className="record-row"><dt>Government guideline rate <span className="record-hi" lang="hi">गाइडलाइन दर</span></dt><dd>{rupees(property.guidelineRate)}/m²<em>A separate valuation reference published by the state — it does not affect this bill&apos;s calculation.</em></dd></div>
          </dl>
          <dl className="facts-grid"><Stat label={t("rec.builtUpArea")}>{property.builtUpArea} m²</Stat><Stat label={t("rec.zone")}>{translateData(lang, property.zone)}</Stat><Stat label={t("rec.usage")}>{usageT}</Stat><Stat label={t("rec.buildingAge")}>{t("rec.years", property.age)}</Stat><Stat label={t("rec.occupancy")}>{occT}</Stat><Stat label={t("rec.ownerCategory")}>{translateData(lang, property.ownerCategory)}</Stat></dl>
        </section>

        <section className="calculation-section" aria-labelledby="calculation-title"><div className="section-heading"><span>02</span><div><h2 id="calculation-title">{t("calc.title")}</h2><p>{t("calc.method")}</p></div></div><div className="formula-card"><div className="formula-caption">{t("calc.formulaCaption")}</div><div className="formula-text"><span>{t("calc.f.area")}</span><i>×</i><span>{t("calc.f.uav")}</span><i>×</i><span>{t("calc.f.use")}</span><i>×</i><span>{t("calc.f.age")}</span><i>×</i><span>{t("calc.f.occupancy")}</span></div><p>{t("calc.thenRate")}</p></div><div className="calculation-list">{formulaLines.map((line) => <CalculationLine key={line.id} line={line} open={openLine === line.id} onToggle={() => toggle(line.id)} onQuestion={() => line.disputeId && onDispute(line.disputeId)} />)}</div><p className="muted-copy">{t("calc.cessNote", ratePct, rupees(amounts.coreTax))}</p></section>

        <section className="calculation-section" aria-labelledby="adjustments-title"><div className="section-heading"><span>03</span><div><h2 id="adjustments-title">{t("adj.title")}</h2><p>{t("adj.sub")}</p></div></div>
          {amounts.applied.length > 0 ? <DetailCard title={t("adj.alreadyApplied")}><div className="mini-list">{amounts.applied.map((rebate) => <div key={rebate.id}><span><Icon name="check" />{translateData(lang, rebate.title)}</span><b>−{rupees(rebate.amount)}</b></div>)}</div></DetailCard> : <DetailCard title={t("adj.noRebates")}><p className="muted-copy">{t("adj.noRebatesBody")}</p></DetailCard>}
          {amounts.unclaimed.length > 0 && <DetailCard title={t("adj.stillEligible")} tone="saving"><p className="muted-copy">{t("adj.stillEligibleBody")}</p>{amounts.unclaimed.map((rebate) => <div className="unclaimed-row" key={rebate.id}><div><strong>{translateData(lang, rebate.title)}</strong><span>{translateData(lang, rebate.reason)}</span></div><b>{t("adj.couldSave", rupees(rebate.amount))}</b></div>)}</DetailCard>}
          <div className="calculation-list adjustment-lines">{summaryLines.map((line) => <CalculationLine key={line.id} line={line} open={openLine === line.id} onToggle={() => toggle(line.id)} onQuestion={() => line.disputeId && onDispute(line.disputeId)} />)}</div>
        </section>
        <section className="next-step"><div><span className="eyebrow"><span className="eyebrow-dot" />{t("next.eyebrow")}</span><h2>{t("next.h2")}</h2><p>{t("next.body")}</p></div><button className="button button-outline" onClick={() => onDispute()} type="button">{t("action.raiseDispute")} <Arrow /></button></section>
      </main>
      <BottomActions onExplain={() => window.scrollTo({ top: 0, behavior: "smooth" })} onPay={onPay} onDispute={() => onDispute()} />
      <footer className="page-footer page-width"><PrototypeNote compact /></footer>
    </>
  );
}

function BottomActions({ onExplain, onPay, onDispute, paid = false }: { onExplain: () => void; onPay: () => void; onDispute: () => void; paid?: boolean }) {
  const { t } = useI18n();
  return <div className="bottom-wrap"><div className="bottom-actions page-width"><button className="bottom-secondary" type="button" onClick={onDispute}>{t("action.raiseDispute")}</button><div className="bottom-right"><button className="bottom-secondary desktop-only" type="button" onClick={onExplain}>{t("bill.whyThisAmount")}</button>{paid ? <span className="paid-label"><Icon name="check" />{t("action.paymentSimulated")}</span> : <button className="button button-primary" type="button" onClick={onPay}>{t("action.payBill")} <Arrow /></button>}</div></div></div>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const reduced = useReducedMotion();
  return <motion.div className="modal-layer" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduced ? { duration: 0.12 } : spring} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.section role="dialog" aria-modal="true" className="modal-card" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }} transition={reduced ? { duration: 0.12 } : spring}>{children}</motion.section></motion.div>;
}

const PAY_MODES: PayMode[] = ["UPI", "Card", "Net Banking"];

function PaymentModal({ property, onClose, onPaid }: { property: Property; onClose: () => void; onPaid: (result: PaymentResult) => void }) {
  const { t, lang } = useI18n();
  const amounts = calc(property);
  const [mode, setMode] = useState<PayMode>("UPI");
  const [receipt, setReceipt] = useState<PaymentResult | null>(null);

  function simulate() {
    setReceipt({
      reference: `RCT-${property.id.slice(-4)}-260829`,
      amount: amounts.due,
      mode,
      fy: "2025–26",
      timestamp: new Date().toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) + " IST",
    });
  }

  return (
    <Modal onClose={onClose}>
      {receipt ? (
        <div className="modal-content receipt-content">
          <button className="modal-close" onClick={onClose} type="button" aria-label={t("rcpt.close")}><Icon name="close" /></button>
          <div className="success-icon"><Icon name="check" /></div>
          <span className="eyebrow"><span className="eyebrow-dot" />{t("rcpt.eyebrow")}</span>
          <h2>{t("rcpt.title", payModeLabel(t, receipt.mode))}</h2>
          <p>{t("rcpt.body")}</p>
          <div className="receipt-card">
            <div className="receipt-qr"><QRCodeSVG value={receipt.reference} size={116} level="M" bgColor="#f7f8f5" fgColor="#17231e" title={`Receipt ${receipt.reference}`} /><small>{t("rcpt.qrNote")}</small></div>
            <dl className="receipt-rows">
              <div><dt>{t("rcpt.number")}</dt><dd>{receipt.reference}</dd></div>
              <div><dt>{t("rcpt.fy")}</dt><dd>{receipt.fy}</dd></div>
              <div><dt>{t("rcpt.propertyId")}</dt><dd>{property.id}</dd></div>
              <div><dt>{t("rcpt.amountPaid")}</dt><dd>{rupees(receipt.amount)}</dd></div>
              <div><dt>{t("rcpt.mode")}</dt><dd>{payModeLabel(t, receipt.mode)}</dd></div>
              <div><dt>{t("rcpt.timestamp")}</dt><dd>{receipt.timestamp}</dd></div>
            </dl>
          </div>
          <p className="receipt-disclaimer"><Icon name="shield" /> {t("rcpt.disclaimer")}</p>
          <button className="button button-dark button-full" onClick={() => onPaid(receipt)} type="button">{t("rcpt.returnToBill")} <Arrow /></button>
        </div>
      ) : (
        <div className="modal-content">
          <button className="modal-close" onClick={onClose} type="button" aria-label={t("pay.closePayment")}><Icon name="close" /></button>
          <span className="eyebrow"><span className="eyebrow-dot" />{t("pay.mockPayment")}</span>
          <h2>{t("pay.confirmTitle")}</h2>
          <p>{t("pay.confirmBody")}</p>
          <div className="payment-amount"><span>{t("pay.amountToSimulate")}</span><strong>{rupees(amounts.due)}</strong></div>
          <fieldset className="pay-modes">
            <legend>{t("pay.method")}</legend>
            {PAY_MODES.map((m) => (
              <label key={m} className={`pay-mode ${mode === m ? "is-selected" : ""}`}>
                <input type="radio" name="pay-mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span>{payModeLabel(t, m)}</span>
              </label>
            ))}
          </fieldset>
          <button className="button button-primary button-full" onClick={simulate} type="button">{t("pay.simulate")} <Arrow /></button>
          <button className="modal-cancel" onClick={onClose} type="button">{t("pay.cancel")}</button>
        </div>
      )}
    </Modal>
  );
}

function DisputeModal({ property, initialLine, resetKey, onClose }: { property: Property; initialLine?: DisputeId; resetKey: number; onClose: () => void }) {
  const { t, lang } = useI18n();
  const [lineId, setLineId] = useState<DisputeId>(initialLine ?? "annual-tax");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seenReset, setSeenReset] = useState(resetKey);
  if (resetKey !== seenReset) {
    setSeenReset(resetKey);
    setLineId(initialLine ?? "annual-tax");
    setSubmitted(false);
    setCopied(false);
  }
  const reference = `DPT-${property.id.slice(-4)}-260829`;
  const lineLabel = disputeLabel(t, lang, property, lineId);
  const reason = t("disp.reason", lineLabel, property.id);
  return <Modal onClose={onClose}>{submitted ? <div className="modal-content dispute-confirmation"><button className="modal-close" onClick={onClose} type="button" aria-label={t("disp.closeConfirmation")}><Icon name="close" /></button><div className="success-icon"><Icon name="check" /></div><span className="eyebrow"><span className="eyebrow-dot" />{t("disp.recorded")}</span><h2>{t("disp.ready")}</h2><p>{t("disp.attachedLine", lineLabel)}</p><div className="reference-box"><span>{t("disp.referenceNumber")}</span><strong>{reference}</strong><button onClick={() => { navigator.clipboard?.writeText(reference); setCopied(true); }} type="button"><Icon name="copy" />{copied ? t("disp.copied") : t("disp.copy")}</button></div><div className="timeline"><div><b>{t("disp.within2")}</b><span>{t("disp.within2Body")}</span></div><div><b>{t("disp.within7")}</b><span>{t("disp.within7Body")}</span></div></div><button className="button button-dark button-full" onClick={onClose} type="button">{t("disp.done")} <Arrow /></button></div> : <form className="modal-content dispute-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><button className="modal-close" onClick={onClose} type="button" aria-label={t("disp.close")}><Icon name="close" /></button><span className="eyebrow"><span className="eyebrow-dot" />{t("action.raiseDispute")}</span><h2>{t("disp.startTitle")}</h2><p>{t("disp.startBody")}</p><label htmlFor="dispute-line">{t("disp.lineToReview")}</label><select id="dispute-line" value={lineId} onChange={(event) => setLineId(event.target.value as DisputeId)}>{DISPUTE_IDS.map((id) => <option key={id} value={id}>{disputeLabel(t, lang, property, id)}</option>)}</select><label htmlFor="dispute-reason">{t("disp.whatChecked")}</label><textarea id="dispute-reason" key={`${lineId}-${lang}`} defaultValue={reason} rows={4} /><div className="dispute-attachment"><Icon name="receipt" /><span><b>{t("disp.attachedAuto")}</b><small>{t("disp.attachedAutoBody")}</small></span></div><button className="button button-primary button-full" type="submit">{t("disp.submit")} <Arrow /></button><p className="form-footnote">{t("disp.footnote")}</p></form>}</Modal>;
}

export default function Home() {
  const [property, setProperty] = useState<Property | null>(null);
  const [screen, setScreen] = useState<"bill" | "breakdown">("bill");
  const [modal, setModal] = useState<"payment" | "dispute" | null>(null);
  const [disputeLine, setDisputeLine] = useState<DisputeId | undefined>();
  const [disputeKey, setDisputeKey] = useState(0);
  const [paid, setPaid] = useState(false);
  const [lastPayment, setLastPayment] = useState<PaymentResult | null>(null);

  function selectProperty(next: Property) { setProperty(next); setScreen("bill"); setPaid(false); setLastPayment(null); setModal(null); }
  function openDispute(line?: DisputeId) { setDisputeLine(line); setDisputeKey((n) => n + 1); setModal("dispute"); }

  if (!property) return <Lookup onChoose={selectProperty} />;
  return <div className="app-shell">{screen === "bill" ? <BillSummary property={property} paid={paid} lastPayment={lastPayment} onExplain={() => setScreen("breakdown")} onPay={() => setModal("payment")} onDispute={() => openDispute()} onBack={() => window.location.reload()} /> : <Breakdown property={property} onBack={() => setScreen("bill")} onPay={() => setModal("payment")} onDispute={openDispute} />}<AnimatePresence>{modal === "payment" && <PaymentModal property={property} onClose={() => setModal(null)} onPaid={(result) => { setModal(null); setPaid(true); setLastPayment(result); setScreen("bill"); }} />}{modal === "dispute" && <DisputeModal property={property} initialLine={disputeLine} resetKey={disputeKey} onClose={() => setModal(null)} />}</AnimatePresence></div>;
}
