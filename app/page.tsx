"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import propertyFixtures from "./data/properties.json";

type Rebate = { id: string; title: string; percent: number; reason: string };
type Penalty = { startDate: string; rate: number; months: number; reason: string } | null;
type HistoryEntry = { fy: string; amount: number; status: string };
type PayMode = "UPI" | "Card" | "Net Banking";
type PaymentResult = { reference: string; amount: number; mode: PayMode; timestamp: string; fy: string };
type Property = {
  id: string;
  label: string;
  tone: "clear" | "rebate" | "penalty";
  address: string;
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
// base tax + two earmarked cesses. `base` is the remainder so the three parts
// always sum to exactly coreTax — this changes no calculation, only presentation.
function cessSplit(amounts: ReturnType<typeof calc>) {
  const library = Math.round(amounts.occupancyValue * 0.01);
  const health = Math.round(amounts.occupancyValue * 0.01);
  const base = amounts.coreTax - library - health;
  return { base, library, health };
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
  return (
    <aside className={`prototype-note ${compact ? "prototype-note-compact" : ""}`} aria-label="Prototype disclosure">
      <Icon name="shield" />
      <p><strong>Independent hackathon prototype.</strong> <a className="prototype-note-link" href="/terms">Full terms</a>. This is not a government product and is not affiliated with any municipal body or tax portal. All property data, calculations, cess splits and payment history are mock and synthetic. Payment is simulated; the payment-method choice is cosmetic and no transaction occurs. Any receipt or QR code generated here is a demonstration only and is not valid proof of payment. Bill explanations and dispute intake work today; municipal verification is mocked.</p>
    </aside>
  );
}

function Lookup({ onChoose }: { onChoose: (property: Property) => void }) {
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
      setError("Try one of the sample IDs shown below.");
    }
  }

  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Unpacked">
        <div className="brand"><span>Unpacked</span></div>
        <span className="nav-caption">Property bill, explained</span>
      </nav>
      <section className="landing-hero" aria-labelledby="landing-title">
        <motion.div initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="eyebrow"><span className="eyebrow-dot" />For Sampurna Nagar · demo</motion.div>
        <motion.h1 id="landing-title" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.05 }}>Know what your property tax bill is made of.</motion.h1>
        <motion.p initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.1 }}>See each input, rule, rebate and penalty in plain language—before you decide what to do.</motion.p>

        <motion.form onSubmit={submit} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.15 }} className="lookup-card">
          <label htmlFor="property-id">Property ID</label>
          <div className="lookup-controls">
            <input id="property-id" value={value} onChange={(event) => { setValue(event.target.value.toUpperCase()); setError(""); }} placeholder="e.g. DEMO-7719" autoCapitalize="characters" aria-describedby={error ? "lookup-error" : undefined} />
            <button className="button button-primary" type="submit">View bill <Arrow /></button>
          </div>
          <div className="lookup-subrow">
            <button className="text-button" type="button" onClick={() => onChoose(properties[1])}>Try a sample property <Arrow /></button>
            {error ? <span id="lookup-error" className="form-error" role="alert">{error}</span> : <span>Use the sample IDs below</span>}
          </div>
        </motion.form>
      </section>

      <section className="sample-section" aria-labelledby="samples-title">
        <div className="section-kicker"><span>Explore the journey</span><h2 id="samples-title">Three bills. Three very different answers.</h2></div>
        <div className="sample-grid">
          {properties.map((property, index) => (
            <motion.button key={property.id} className={`sample-card sample-${property.tone}`} type="button" onClick={() => onChoose(property)} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.2 + index * 0.06 }}>
              <span className="sample-index">0{index + 1}</span>
              <span className="sample-copy"><strong>{property.label}</strong><small>{property.id}</small></span>
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
  return (
    <header className="app-header">
      <div className="page-width header-inner">
        <div className="header-nav">
          <button type="button" className="back-button" onClick={onBack} aria-label={screen === "breakdown" ? "Back to bill summary" : "Back to all properties"}><Arrow direction="left" />Back</button>
          <button type="button" className="brand brand-button" onClick={onHome} aria-label="Back to property lookup"><span>Unpacked</span></button>
        </div>
        <div className="property-pill"><span className="pill-label">Property</span><strong>{property.id}</strong><span className="pill-separator" /><span className="pill-view">{screen === "bill" ? "Bill" : "Explanation"}</span></div>
      </div>
    </header>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return <div className="property-stat"><dt>{label}</dt><dd>{children}</dd></div>;
}

function BillSummary({ property, onExplain, onPay, onDispute, onBack, paid, lastPayment }: { property: Property; onExplain: () => void; onPay: () => void; onDispute: () => void; onBack: () => void; paid: boolean; lastPayment: PaymentResult | null }) {
  const amounts = useMemo(() => calc(property), [property]);
  const hasSaving = amounts.unclaimed.length > 0;
  const savingTotal = amounts.unclaimed.reduce((total, rebate) => total + rebate.amount, 0);
  const isOverdue = property.penalty !== null;
  const currentStatus = paid ? "Paid (simulated)" : isOverdue ? "Overdue" : "Due";
  const historyRows = [
    { fy: "2025–26", amount: paid ? (lastPayment?.amount ?? amounts.due) : amounts.due, status: currentStatus, current: true },
    ...property.history.map((entry) => ({ ...entry, current: false })),
  ];

  return (
    <>
      <Header property={property} onHome={() => window.location.reload()} onBack={onBack} screen="bill" />
      <main className="bill-main page-width">
        <div className="breadcrumb"><button onClick={() => window.location.reload()} type="button">All properties</button><Arrow /> <span>Bill summary</span></div>
        <section className="bill-hero" aria-labelledby="bill-title">
          <div className="bill-context">
            <div className={`status-badge ${paid ? "status-paid" : isOverdue ? "status-overdue" : hasSaving ? "status-saving" : "status-due"}`}>
              {paid ? <Icon name="check" /> : isOverdue ? <Icon name="warning" /> : hasSaving ? <Icon name="spark" /> : <span className="status-dot" />}
              {paid ? (hasSaving ? "Payment simulated · rebate still unclaimed" : "Payment simulated") : property.status}
            </div>
            <p className="address">{property.address}</p>
            <h1 id="bill-title">Your 2025–26 property tax bill</h1>
          </div>
          <div className="amount-panel">
            <span>{paid ? "Paid (simulated)" : "Amount due"}</span>
            <strong>{rupees(amounts.due)}</strong>
            <small>{paid ? (lastPayment ? <>Simulated via {lastPayment.mode} · <b>{lastPayment.reference}</b></> : "No real payment was processed.") : <>Due by <b>{property.dueDate}</b></>}</small>
          </div>
        </section>

        {hasSaving && <section className="insight-banner saving-banner"><Icon name="info" /><div><strong>{paid ? "You may have paid more than you needed to." : "You may be paying more than you need to."}</strong><span>{paid ? <>A rebate could have saved {rupees(savingTotal)}—you can still file the declaration for future bills.</> : <>We found a rebate that could save {rupees(savingTotal)}.</>}</span></div><button className="text-button" type="button" onClick={onExplain}>See it <Arrow /></button></section>}
        {isOverdue && !paid && <section className="insight-banner warning-banner"><Icon name="warning" /><div><strong>A late-payment charge is included.</strong><span>See exactly how the {rupees(amounts.penaltyAmount)} penalty was calculated.</span></div><button className="text-button" type="button" onClick={onExplain}>Understand it <Arrow /></button></section>}

        <section className="summary-grid" aria-label="Bill summary details">
          <div className="summary-card summary-info"><span className="summary-card-label">Bill details</span><dl><Stat label="Bill period">1 Apr 2025 – 31 Mar 2026</Stat><Stat label="Issued on">{property.billDate}</Stat><Stat label="Due date">{property.dueDate}</Stat><Stat label="Property use">{property.usage}</Stat></dl></div>
          <div className="summary-card summary-action"><span className="summary-card-label">Before you pay</span><h2>Understand every rupee first.</h2><p>See the exact property details, calculation rules, rebates and any late fee that created this amount.</p><button className="button button-dark button-large" type="button" onClick={onExplain}>Why this amount? <Arrow /></button></div>
        </section>

        <section className="payment-history" aria-labelledby="history-title">
          <div className="history-head"><h2 id="history-title">Payment history</h2><span>Property {property.id} · last {property.history.length + 1} years</span></div>
          <ol className="history-list">
            {historyRows.map((row) => {
              const state = row.status.toLowerCase().startsWith("paid") ? "paid" : row.status.toLowerCase() === "overdue" ? "overdue" : "pending";
              return (
                <li key={row.fy} className={`history-row ${row.current ? "is-current" : ""}`}>
                  <span className="history-fy">{row.fy}{row.current && <em>Current</em>}</span>
                  <span className="history-amount">{rupees(row.amount)}</span>
                  <span className={`history-status status-${state}`}>{row.status}</span>
                </li>
              );
            })}
          </ol>
          <p className="muted-copy">Synthetic record for this prototype — the portal has no connection to a real municipal ledger.</p>
        </section>
      </main>
      <BottomActions onExplain={onExplain} onPay={onPay} onDispute={onDispute} paid={paid} />
      <footer className="page-footer page-width"><PrototypeNote compact /></footer>
    </>
  );
}

function CalculationLine({ line, open, onToggle, onQuestion }: { line: Line; open: boolean; onToggle: () => void; onQuestion: () => void }) {
  const reduced = useReducedMotion();
  return (
    <div className={`calc-line ${line.attention ? `calc-${line.attention}` : ""} ${open ? "is-open" : ""}`}>
      <button type="button" className="calc-trigger" onClick={onToggle} aria-expanded={open} aria-controls={`${line.id}-detail`}>
        <span className="calc-copy"><strong>{line.label}</strong><span>{line.helper}</span></span>
        <span className="calc-value"><b className={line.sign === "minus" ? "value-minus" : line.sign === "plus" ? "value-plus" : ""}>{line.sign === "minus" ? "−" : line.sign === "plus" ? "+" : ""}{rupees(line.amount)}</b><span className="chevron"><Icon name="chevron" /></span></span>
      </button>
      <AnimatePresence initial={false}>
        {open && <motion.div id={`${line.id}-detail`} className="calc-detail" initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={reduced ? { opacity: 1 } : { height: "auto", opacity: 1 }} exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }} transition={reduced ? { duration: 0.12 } : spring} style={{ transformOrigin: "top" }}>
          <div className="calc-detail-inner"><div>{line.detail}</div><button type="button" className="question-button" onClick={onQuestion}>Question this line <Arrow /></button></div>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

function DetailCard({ title, children, tone }: { title: string; children: ReactNode; tone?: "saving" | "warning" }) {
  return <section className={`detail-card ${tone ? `detail-${tone}` : ""}`}><div className="detail-card-title">{tone === "saving" ? <Icon name="info" /> : tone === "warning" ? <Icon name="warning" /> : <Icon name="receipt" />}<h3>{title}</h3></div>{children}</section>;
}

function Breakdown({ property, onBack, onPay, onDispute }: { property: Property; onBack: () => void; onPay: () => void; onDispute: (line?: string) => void }) {
  const amounts = useMemo(() => calc(property), [property]);
  const cess = useMemo(() => cessSplit(amounts), [amounts]);
  const [openLine, setOpenLine] = useState<string | null>(null);
  const ratePct = (property.taxRate * 100).toFixed(0);
  const formulaLines: Line[] = [
    { id: "area", label: "Built-up area", amount: amounts.areaValue, helper: `${property.builtUpArea} m² × ${rupees(property.uav)}/m²/month × 12 months`, detail: <p>Your recorded built-up area is <b>{property.builtUpArea} square metres</b>. The zone’s published unit-area value is {rupees(property.uav)} per square metre per month. Together, they produce an annual assessed value of {rupees(amounts.areaValue)} before property-specific factors.</p> },
    { id: "usage", label: `${property.usage} use factor`, amount: amounts.usageValue, helper: `Assessed value × ${property.usageFactor.toFixed(2)}`, detail: <p>The use factor adjusts the rate for how the property is used. <b>{property.usage}</b> in this prototype uses a factor of {property.usageFactor.toFixed(2)}, so the assessed value is {rupees(amounts.usageValue)}.</p> },
    { id: "age", label: `${property.age}-year building age factor`, amount: amounts.ageValue, helper: `Adjusted value × ${property.ageFactor.toFixed(2)}`, detail: <p>Buildings in the <b>{property.age}-year-old</b> bracket receive a {Math.round((1 - property.ageFactor) * 100)}% depreciation adjustment. The age factor is {property.ageFactor.toFixed(2)}, producing {rupees(amounts.ageValue)}. This reduces the assessed value because the building is not new.</p> },
    { id: "occupancy", label: `${property.occupancy} factor`, amount: amounts.occupancyValue, helper: `Adjusted value × ${property.occupancyFactor.toFixed(2)}`, detail: <p>The record says this property is <b>{property.occupancy.toLowerCase()}</b>. The matching occupancy factor is {property.occupancyFactor.toFixed(2)}, giving a final assessed value of {rupees(amounts.occupancyValue)}.</p> },
    { id: "base-tax", label: "Base property tax", amount: cess.base, helper: `Core municipal tax on ${rupees(amounts.occupancyValue)} assessed value`, detail: <p>The core municipal property tax on your final assessed value of {rupees(amounts.occupancyValue)}. A real bill folds this into one {ratePct}% headline rate; here it is that rate <b>minus</b> the two earmarked cesses below — not an extra charge. It comes to <b>{rupees(cess.base)}</b>.</p> },
    { id: "library-cess", label: "Library cess", amount: cess.library, helper: "≈1% of assessed value", detail: <p>A fixed levy funding public libraries in your ward — applied to every property regardless of usage. Municipal bills bundle it into the headline tax rate and never itemise it; this prototype shows it on its own line: <b>{rupees(cess.library)}</b>.</p> },
    { id: "health-cess", label: "Health cess", amount: cess.health, helper: "≈1% of assessed value", detail: <p>A fixed levy funding municipal primary health centres and sanitation drives — also applied to every property regardless of usage, and also hidden inside the headline rate on a real bill: <b>{rupees(cess.health)}</b>. Base property tax plus both cesses equals your {rupees(amounts.coreTax)} annual property tax.</p> },
  ];
  const summaryLines: Line[] = [
    ...(property.penalty ? [{ id: "penalty", label: "Late-payment charge", amount: amounts.penaltyAmount, sign: "plus" as const, helper: `${property.penalty.rate}% per month for ${property.penalty.months} months`, attention: "warning" as const, detail: <p>{property.penalty.reason} From <b>{property.penalty.startDate}</b>, a {property.penalty.rate}% monthly charge applies to the unpaid bill after rebates ({rupees(amounts.beforePenalty)}). After {property.penalty.months} months, it has accumulated to <b>{rupees(amounts.penaltyAmount)}</b>.</p> }] : []),
    { id: "total", label: "Amount due", amount: amounts.due, sign: "equals" as const, helper: "Tax after applied rebates and charges", detail: <p>This is the amount shown on your bill: the annual tax, less rebates already applied, plus any late-payment charge. It does not include the potential savings shown separately below.</p> },
  ];
  const toggle = (id: string) => setOpenLine((current) => current === id ? null : id);

  return (
    <>
      <Header property={property} onHome={() => window.location.reload()} onBack={onBack} screen="breakdown" />
      <main className="breakdown-main page-width">
        <div className="breadcrumb"><button onClick={onBack} type="button">Bill summary</button><Arrow /> <span>Why this amount?</span></div>
        <section className="explain-intro"><div><span className="eyebrow"><span className="eyebrow-dot" />Your bill, unpacked</span><h1>Here’s how {rupees(amounts.due)} was calculated.</h1><p>Tap any line to see the rule behind it. If an input looks wrong, you can question that exact line.</p></div><div className="explain-total"><span>Amount due</span><strong>{rupees(amounts.due)}</strong><small>Due {property.dueDate}</small></div></section>

        <section className="record-section" aria-labelledby="record-title"><div className="section-heading"><span>01</span><div><h2 id="record-title">Property details used</h2><p>These are the facts the calculation starts with.</p></div></div><dl className="facts-grid"><Stat label="Built-up area">{property.builtUpArea} m²</Stat><Stat label="Zone">{property.zone}</Stat><Stat label="Usage">{property.usage}</Stat><Stat label="Building age">{property.age} years</Stat><Stat label="Occupancy">{property.occupancy}</Stat><Stat label="Owner category">{property.ownerCategory}</Stat></dl></section>

        <section className="calculation-section" aria-labelledby="calculation-title"><div className="section-heading"><span>02</span><div><h2 id="calculation-title">Base calculation</h2><p>We use a unit-area value method—the local value of each square metre, adjusted for the property.</p></div></div><div className="formula-card"><div className="formula-caption">Annual assessed value</div><div className="formula-text"><span>area</span><i>×</i><span>unit-area value</span><i>×</i><span>use</span><i>×</i><span>age</span><i>×</i><span>occupancy</span></div><p>Then the annual tax rate is applied. Here is each step.</p></div><div className="calculation-list">{formulaLines.map((line) => <CalculationLine key={line.id} line={line} open={openLine === line.id} onToggle={() => toggle(line.id)} onQuestion={() => onDispute(line.label)} />)}</div><p className="muted-copy">Base property tax, library cess and health cess are a split of the single {ratePct}% municipal rate — a real bill shows only the combined figure. Together they equal your annual property tax of {rupees(amounts.coreTax)}, before any rebate or late-payment charge.</p></section>

        <section className="calculation-section" aria-labelledby="adjustments-title"><div className="section-heading"><span>03</span><div><h2 id="adjustments-title">Rebates and charges</h2><p>Items that change the base tax into the amount currently due.</p></div></div>
          {amounts.applied.length > 0 ? <DetailCard title="Already applied"><div className="mini-list">{amounts.applied.map((rebate) => <div key={rebate.id}><span><Icon name="check" />{rebate.title}</span><b>−{rupees(rebate.amount)}</b></div>)}</div></DetailCard> : <DetailCard title="No rebates applied"><p className="muted-copy">There are no deductions recorded on this bill.</p></DetailCard>}
          {amounts.unclaimed.length > 0 && <DetailCard title="You may still be eligible" tone="saving"><p className="muted-copy">These savings are not included in your bill because the supporting declaration is not recorded.</p>{amounts.unclaimed.map((rebate) => <div className="unclaimed-row" key={rebate.id}><div><strong>{rebate.title}</strong><span>{rebate.reason}</span></div><b>Could save {rupees(rebate.amount)}</b></div>)}</DetailCard>}
          <div className="calculation-list adjustment-lines">{summaryLines.map((line) => <CalculationLine key={line.id} line={line} open={openLine === line.id} onToggle={() => toggle(line.id)} onQuestion={() => onDispute(line.label)} />)}</div>
        </section>
        <section className="next-step"><div><span className="eyebrow"><span className="eyebrow-dot" />You are in control</span><h2>Does something not look right?</h2><p>Choose the line you want reviewed. Your dispute starts with the relevant bill detail already attached.</p></div><button className="button button-outline" onClick={() => onDispute()} type="button">Raise a dispute <Arrow /></button></section>
      </main>
      <BottomActions onExplain={() => window.scrollTo({ top: 0, behavior: "smooth" })} onPay={onPay} onDispute={() => onDispute()} />
      <footer className="page-footer page-width"><PrototypeNote compact /></footer>
    </>
  );
}

function BottomActions({ onExplain, onPay, onDispute, paid = false }: { onExplain: () => void; onPay: () => void; onDispute: () => void; paid?: boolean }) {
  return <div className="bottom-wrap"><div className="bottom-actions page-width"><button className="bottom-secondary" type="button" onClick={onDispute}>Raise a dispute</button><div className="bottom-right"><button className="bottom-secondary desktop-only" type="button" onClick={onExplain}>Why this amount?</button>{paid ? <span className="paid-label"><Icon name="check" />Payment simulated</span> : <button className="button button-primary" type="button" onClick={onPay}>Pay bill (mock) <Arrow /></button>}</div></div></div>;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const reduced = useReducedMotion();
  return <motion.div className="modal-layer" role="presentation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduced ? { duration: 0.12 } : spring} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.section role="dialog" aria-modal="true" className="modal-card" initial={reduced ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }} transition={reduced ? { duration: 0.12 } : spring}>{children}</motion.section></motion.div>;
}

const PAY_MODES: PayMode[] = ["UPI", "Card", "Net Banking"];

function PaymentModal({ property, onClose, onPaid }: { property: Property; onClose: () => void; onPaid: (result: PaymentResult) => void }) {
  const amounts = calc(property);
  const [mode, setMode] = useState<PayMode>("UPI");
  const [receipt, setReceipt] = useState<PaymentResult | null>(null);

  function simulate() {
    setReceipt({
      reference: `RCT-${property.id.slice(-4)}-260829`,
      amount: amounts.due,
      mode,
      fy: "2025–26",
      timestamp: new Date().toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) + " IST",
    });
  }

  return (
    <Modal onClose={onClose}>
      {receipt ? (
        <div className="modal-content receipt-content">
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close receipt"><Icon name="close" /></button>
          <div className="success-icon"><Icon name="check" /></div>
          <span className="eyebrow"><span className="eyebrow-dot" />Simulation complete</span>
          <h2>Simulated via {receipt.mode}.</h2>
          <p>No money moved and no payment gateway was contacted.</p>
          <div className="receipt-card">
            <div className="receipt-qr"><QRCodeSVG value={receipt.reference} size={116} level="M" bgColor="#f7f8f5" fgColor="#17231e" title={`Receipt ${receipt.reference}`} /><small>Encodes the receipt number only</small></div>
            <dl className="receipt-rows">
              <div><dt>Receipt number</dt><dd>{receipt.reference}</dd></div>
              <div><dt>Financial year</dt><dd>{receipt.fy}</dd></div>
              <div><dt>Property ID</dt><dd>{property.id}</dd></div>
              <div><dt>Amount paid</dt><dd>{rupees(receipt.amount)}</dd></div>
              <div><dt>Payment mode</dt><dd>{receipt.mode}</dd></div>
              <div><dt>Timestamp</dt><dd>{receipt.timestamp}</dd></div>
            </dl>
          </div>
          <p className="receipt-disclaimer"><Icon name="shield" /> Mock receipt — for prototype demonstration only, not valid proof of payment.</p>
          <button className="button button-dark button-full" onClick={() => onPaid(receipt)} type="button">Return to bill <Arrow /></button>
        </div>
      ) : (
        <div className="modal-content">
          <button className="modal-close" onClick={onClose} type="button" aria-label="Close payment"><Icon name="close" /></button>
          <span className="eyebrow"><span className="eyebrow-dot" />Mock payment</span>
          <h2>Confirm simulated payment</h2>
          <p>You are about to simulate payment of the amount due. This will not open a bank page or process a transaction.</p>
          <div className="payment-amount"><span>Amount to simulate</span><strong>{rupees(amounts.due)}</strong></div>
          <fieldset className="pay-modes">
            <legend>Payment method</legend>
            {PAY_MODES.map((m) => (
              <label key={m} className={`pay-mode ${mode === m ? "is-selected" : ""}`}>
                <input type="radio" name="pay-mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span>{m}</span>
              </label>
            ))}
          </fieldset>
          <button className="button button-primary button-full" onClick={simulate} type="button">Simulate payment <Arrow /></button>
          <button className="modal-cancel" onClick={onClose} type="button">Cancel</button>
        </div>
      )}
    </Modal>
  );
}

function DisputeModal({ property, initialLine, resetKey, onClose }: { property: Property; initialLine?: string; resetKey: number; onClose: () => void }) {
  const [line, setLine] = useState(initialLine ?? "Annual property tax");
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [seenReset, setSeenReset] = useState(resetKey);
  if (resetKey !== seenReset) {
    setSeenReset(resetKey);
    setLine(initialLine ?? "Annual property tax");
    setSubmitted(false);
    setCopied(false);
  }
  const reference = `DPT-${property.id.slice(-4)}-260829`;
  const lines = ["Built-up area", `${property.usage} use factor`, `${property.age}-year building age factor`, `${property.occupancy} factor`, "Base property tax", "Library cess", "Health cess", "Annual property tax", "Applied rebate", "Late-payment charge", "Amount due"];
  const reason = `I would like the ${line.toLowerCase()} on property ${property.id} to be reviewed. I believe the information or rule used may be incorrect.`;
  return <Modal onClose={onClose}>{submitted ? <div className="modal-content dispute-confirmation"><button className="modal-close" onClick={onClose} type="button" aria-label="Close confirmation"><Icon name="close" /></button><div className="success-icon"><Icon name="check" /></div><span className="eyebrow"><span className="eyebrow-dot" />Dispute recorded</span><h2>Your review request is ready.</h2><p>We have attached the exact bill line you chose: <b>{line}</b>.</p><div className="reference-box"><span>Reference number</span><strong>{reference}</strong><button onClick={() => { navigator.clipboard?.writeText(reference); setCopied(true); }} type="button"><Icon name="copy" />{copied ? "Copied" : "Copy"}</button></div><div className="timeline"><div><b>Within 2 working days</b><span>A record-check team reviews the property detail and rule.</span></div><div><b>Within 7 working days</b><span>You receive the mocked outcome and any corrected bill.</span></div></div><button className="button button-dark button-full" onClick={onClose} type="button">Done <Arrow /></button></div> : <form className="modal-content dispute-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><button className="modal-close" onClick={onClose} type="button" aria-label="Close dispute"><Icon name="close" /></button><span className="eyebrow"><span className="eyebrow-dot" />Raise a dispute</span><h2>Start with the line you’re questioning.</h2><p>Your request is pre-filled so a reviewer knows exactly what to check.</p><label htmlFor="dispute-line">Bill line to review</label><select id="dispute-line" value={line} onChange={(event) => setLine(event.target.value)}>{lines.map((item) => <option key={item}>{item}</option>)}</select><label htmlFor="dispute-reason">What should be checked</label><textarea id="dispute-reason" key={line} defaultValue={reason} rows={4} /><div className="dispute-attachment"><Icon name="receipt" /><span><b>Attached automatically</b><small>Property ID, selected line, and this bill’s calculation context.</small></span></div><button className="button button-primary button-full" type="submit">Submit review request <Arrow /></button><p className="form-footnote">Prototype only—no request is sent to a municipal office.</p></form>}</Modal>;
}

export default function Home() {
  const [property, setProperty] = useState<Property | null>(null);
  const [screen, setScreen] = useState<"bill" | "breakdown">("bill");
  const [modal, setModal] = useState<"payment" | "dispute" | null>(null);
  const [disputeLine, setDisputeLine] = useState<string | undefined>();
  const [disputeKey, setDisputeKey] = useState(0);
  const [paid, setPaid] = useState(false);
  const [lastPayment, setLastPayment] = useState<PaymentResult | null>(null);

  function selectProperty(next: Property) { setProperty(next); setScreen("bill"); setPaid(false); setLastPayment(null); setModal(null); }
  function openDispute(line?: string) { setDisputeLine(line); setDisputeKey((n) => n + 1); setModal("dispute"); }

  if (!property) return <Lookup onChoose={selectProperty} />;
  return <div className="app-shell">{screen === "bill" ? <BillSummary property={property} paid={paid} lastPayment={lastPayment} onExplain={() => setScreen("breakdown")} onPay={() => setModal("payment")} onDispute={() => openDispute()} onBack={() => window.location.reload()} /> : <Breakdown property={property} onBack={() => setScreen("bill")} onPay={() => setModal("payment")} onDispute={openDispute} />}<AnimatePresence>{modal === "payment" && <PaymentModal property={property} onClose={() => setModal(null)} onPaid={(result) => { setModal(null); setPaid(true); setLastPayment(result); setScreen("bill"); }} />}{modal === "dispute" && <DisputeModal property={property} initialLine={disputeLine} resetKey={disputeKey} onClose={() => setModal(null)} />}</AnimatePresence></div>;
}
