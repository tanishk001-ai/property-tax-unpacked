// Lightweight bilingual string dictionary (EN / HI). No i18n library.
// Each entry is { en, hi }; values are plain strings or functions for
// interpolation. Currency/IDs/percentages stay as Arabic numerals in both
// languages — only surrounding words translate.
//
// Established Hindi terms reused across the app:
//   property tax → संपत्ति कर | amount due → देय राशि | due date → नियत तिथि
//   residential → आवासीय | assessed value → निर्धारित मूल्य | rebate → छूट
//   late-payment charge → विलंब शुल्क | dispute → आपत्ति | bill/receipt → बिल/रसीद
//   payment → भुगतान | ward → वार्ड | guideline rate → गाइडलाइन दर
//   S/O·D/O·W/O → पुत्र·पुत्री·पत्नी | owner name → स्वामी का नाम
//   SWM cess → ठोस अपशिष्ट प्रबंधन उपकर | library cess → पुस्तकालय उपकर
//   health cess → स्वास्थ्य उपकर

import type { Lang } from "./i18n";

type Fn = (...a: (string | number)[]) => string;
type Entry = { en: string | Fn; hi: string | Fn };

const MONTHS_HI: Record<string, string> = {
  January: "जनवरी", February: "फ़रवरी", March: "मार्च", April: "अप्रैल",
  May: "मई", June: "जून", July: "जुलाई", August: "अगस्त",
  September: "सितंबर", October: "अक्तूबर", November: "नवंबर", December: "दिसंबर",
};

// Reformat an English "DD Month YYYY" date for the given language (numerals kept).
export function formatDateLocalised(lang: Lang, s: string): string {
  if (lang === "en") return s;
  return s.replace(
    /January|February|March|April|May|June|July|August|September|October|November|December/g,
    (m) => MONTHS_HI[m] ?? m,
  );
}

// Translate a fixed data value (from properties.json) by looking it up by its
// English text. Unknown values pass through unchanged.
export function translateData(lang: Lang, value: string): string {
  const entry = (STR as Record<string, Entry>)[value];
  if (!entry) return value;
  const v = entry[lang];
  return typeof v === "function" ? value : v;
}

export const STR = {
  // ---- brand / chrome ----
  "brand.tagline": { en: "Property bill, explained", hi: "संपत्ति बिल, समझाया गया" },
  "nav.back": { en: "Back", hi: "वापस" },
  "nav.backToLookup": { en: "Back to property lookup", hi: "संपत्ति खोज पर वापस" },
  "nav.backToBill": { en: "Back to bill summary", hi: "बिल सारांश पर वापस" },
  "nav.backToProperties": { en: "Back to all properties", hi: "सभी संपत्तियों पर वापस" },
  "crumb.allProperties": { en: "All properties", hi: "सभी संपत्तियाँ" },
  "crumb.billSummary": { en: "Bill summary", hi: "बिल सारांश" },
  "crumb.whyThisAmount": { en: "Why this amount?", hi: "यह राशि क्यों?" },
  "pill.property": { en: "Property", hi: "संपत्ति" },
  "pill.bill": { en: "Bill", hi: "बिल" },
  "pill.explanation": { en: "Explanation", hi: "विवरण" },
  "lang.group": { en: "Language / भाषा", hi: "भाषा / Language" },

  // ---- landing / lookup ----
  "landing.eyebrow": { en: "For Sampurna Nagar · demo", hi: "संपूर्णा नगर के लिए · डेमो" },
  "landing.title": {
    en: "Know what your property tax bill is made of.",
    hi: "जानिए आपका संपत्ति कर बिल किन चीज़ों से बना है।",
  },
  "landing.sub": {
    en: "See each input, rule, rebate and penalty in plain language—before you decide what to do.",
    hi: "हर इनपुट, नियम, छूट और शुल्क को सरल भाषा में देखें—कुछ भी तय करने से पहले।",
  },
  "lookup.label": { en: "Property ID", hi: "संपत्ति आईडी" },
  "lookup.placeholder": { en: "e.g. DEMO-7719", hi: "जैसे DEMO-7719" },
  "lookup.viewBill": { en: "View bill", hi: "बिल देखें" },
  "lookup.trySample": { en: "Try a sample property", hi: "एक नमूना संपत्ति आज़माएँ" },
  "lookup.hint": { en: "Use the sample IDs below", hi: "नीचे दिए गए नमूना आईडी इस्तेमाल करें" },
  "lookup.error": {
    en: "Try one of the sample IDs shown below.",
    hi: "नीचे दिखाए गए किसी नमूना आईडी को आज़माएँ।",
  },
  "samples.kicker": { en: "Explore the journey", hi: "पूरा सफ़र देखें" },
  "samples.title": {
    en: "Three bills. Three very different answers.",
    hi: "तीन बिल। तीन बिलकुल अलग जवाब।",
  },

  // ---- property fixture data ----
  "A clear, paid-on-time bill": { en: "A clear, paid-on-time bill", hi: "एक साफ़, समय पर चुकाया गया बिल" },
  "A bill with a missed rebate": { en: "A bill with a missed rebate", hi: "एक छूटी हुई छूट वाला बिल" },
  "An overdue bill with a penalty": { en: "An overdue bill with a penalty", hi: "शुल्क सहित एक बकाया बिल" },
  // Address components — transliterated to Devanagari for the Hindi view.
  "Banyan Court": { en: "Banyan Court", hi: "बनियन कोर्ट" },
  "Lake Road": { en: "Lake Road", hi: "लेक रोड" },
  "Gulmohar Enclave": { en: "Gulmohar Enclave", hi: "गुलमोहर एन्क्लेव" },
  "Sector 8": { en: "Sector 8", hi: "सेक्टर 8" },
  "Neem Residency": { en: "Neem Residency", hi: "नीम रेज़िडेंसी" },
  "Market Ward": { en: "Market Ward", hi: "मार्केट वार्ड" },
  "Sampurna Nagar": { en: "Sampurna Nagar", hi: "संपूर्णा नगर" },
  "Central residential zone": { en: "Central residential zone", hi: "मध्य आवासीय क्षेत्र" },
  "North residential zone": { en: "North residential zone", hi: "उत्तर आवासीय क्षेत्र" },
  "Commercial corridor": { en: "Commercial corridor", hi: "वाणिज्यिक गलियारा" },
  "Residential": { en: "Residential", hi: "आवासीय" },
  "Small retail shop": { en: "Small retail shop", hi: "छोटी खुदरा दुकान" },
  // TODO(i18n): "Self-occupied" / "Owner-occupied" occupancy wording varies across
  // municipal forms (स्व-अधिभोगित / स्व-कब्ज़ा). Using स्व-अधिकृत / स्वामी-अधिकृत.
  "Self-occupied": { en: "Self-occupied", hi: "स्व-अधिकृत" },
  "Owner-occupied": { en: "Owner-occupied", hi: "स्वामी-अधिकृत" },
  "Resident owner": { en: "Resident owner", hi: "निवासी स्वामी" },
  "Senior citizen co-owner": { en: "Senior citizen co-owner", hi: "वरिष्ठ नागरिक सह-स्वामी" },
  "Due": { en: "Due", hi: "देय" },
  "Due · possible saving found": { en: "Due · possible saving found", hi: "देय · संभावित बचत मिली" },
  "Overdue": { en: "Overdue", hi: "बकाया" },
  "Paid": { en: "Paid", hi: "भुगतान किया" },
  "Self-occupied home rebate": { en: "Self-occupied home rebate", hi: "स्व-अधिकृत आवास छूट" },
  "Digital payment rebate": { en: "Digital payment rebate", hi: "डिजिटल भुगतान छूट" },
  "Senior citizen co-owner rebate": { en: "Senior citizen co-owner rebate", hi: "वरिष्ठ नागरिक सह-स्वामी छूट" },
  "The property is recorded as your primary self-occupied home.": {
    en: "The property is recorded as your primary self-occupied home.",
    hi: "यह संपत्ति आपके मुख्य स्व-अधिकृत आवास के रूप में दर्ज है।",
  },
  "Your bill was issued with the online-payment rebate already included.": {
    en: "Your bill was issued with the online-payment rebate already included.",
    hi: "आपका बिल ऑनलाइन-भुगतान छूट पहले से शामिल करके जारी किया गया था।",
  },
  "A co-owner is marked as 60+. The declaration is not on file, so this has not been deducted.": {
    en: "A co-owner is marked as 60+. The declaration is not on file, so this has not been deducted.",
    hi: "एक सह-स्वामी 60+ के रूप में चिह्नित है। घोषणा फ़ाइल में नहीं है, इसलिए यह घटाई नहीं गई है।",
  },
  "The 2025–26 bill remained unpaid after its 31 March 2026 due date.": {
    en: "The 2025–26 bill remained unpaid after its 31 March 2026 due date.",
    hi: "2025–26 का बिल अपनी 31 मार्च 2026 की नियत तिथि के बाद अदत्त रहा।",
  },

  // ---- bill summary ----
  "bill.status.paid": { en: "Payment simulated", hi: "भुगतान सिम्युलेटेड" },
  "bill.status.paidRebate": {
    en: "Payment simulated · rebate still unclaimed",
    hi: "भुगतान सिम्युलेटेड · छूट अब भी अदावाकृत",
  },
  "bill.title": { en: "Your 2025–26 property tax bill", hi: "आपका 2025–26 संपत्ति कर बिल" },
  "bill.amountDue": { en: "Amount due", hi: "देय राशि" },
  "bill.paidSimulated": { en: "Paid (simulated)", hi: "भुगतान (सिम्युलेटेड)" },
  "bill.noRealPayment": { en: "No real payment was processed.", hi: "कोई वास्तविक भुगतान नहीं हुआ।" },
  "bill.simulatedVia": { en: (m) => `Simulated via ${m} · `, hi: (m) => `${m} के ज़रिए सिम्युलेटेड · ` },
  "bill.dueBy": { en: (d) => `Due by `, hi: (d) => `` }, // date rendered separately; prefix only
  "bill.dueByFull": { en: (d) => `Due by ${d}`, hi: (d) => `${d} तक देय` },
  "bill.saving.titleUnpaid": {
    en: "You may be paying more than you need to.",
    hi: "आप शायद ज़रूरत से ज़्यादा चुका रहे हैं।",
  },
  "bill.saving.titlePaid": {
    en: "You may have paid more than you needed to.",
    hi: "आपने शायद ज़रूरत से ज़्यादा चुका दिया है।",
  },
  "bill.saving.bodyUnpaid": { en: (x) => `We found a rebate that could save ${x}.`, hi: (x) => `हमें एक छूट मिली जो ${x} बचा सकती है।` },
  "bill.saving.bodyPaid": {
    en: (x) => `A rebate could have saved ${x}—you can still file the declaration for future bills.`,
    hi: (x) => `एक छूट ${x} बचा सकती थी—आप आगे के बिलों के लिए अब भी घोषणा दाखिल कर सकते हैं।`,
  },
  "bill.saving.seeIt": { en: "See it", hi: "देखें" },
  "bill.warn.title": { en: "A late-payment charge is included.", hi: "एक विलंब शुल्क शामिल है।" },
  "bill.warn.body": { en: (x) => `See exactly how the ${x} penalty was calculated.`, hi: (x) => `देखें कि ${x} का शुल्क ठीक कैसे निकाला गया।` },
  "bill.warn.understand": { en: "Understand it", hi: "समझें" },
  "bill.details": { en: "Bill details", hi: "बिल विवरण" },
  "bill.period": { en: "Bill period", hi: "बिल अवधि" },
  "bill.periodValue": { en: "1 Apr 2025 – 31 Mar 2026", hi: "1 अप्रैल 2025 – 31 मार्च 2026" },
  "bill.issuedOn": { en: "Issued on", hi: "जारी तिथि" },
  "bill.dueDate": { en: "Due date", hi: "नियत तिथि" },
  "bill.propertyUse": { en: "Property use", hi: "संपत्ति का उपयोग" },
  "bill.beforeYouPay": { en: "Before you pay", hi: "भुगतान से पहले" },
  "bill.understandEveryRupee": { en: "Understand every rupee first.", hi: "पहले हर रुपया समझें।" },
  "bill.understandBody": {
    en: "See the exact property details, calculation rules, rebates and any late fee that created this amount.",
    hi: "वे सटीक संपत्ति विवरण, गणना नियम, छूट और कोई विलंब शुल्क देखें जिनसे यह राशि बनी।",
  },
  "bill.whyThisAmount": { en: "Why this amount?", hi: "यह राशि क्यों?" },

  // ---- payment history ----
  "history.title": { en: "Payment history", hi: "भुगतान इतिहास" },
  "history.meta": { en: (id, n) => `Property ${id} · last ${n} years`, hi: (id, n) => `संपत्ति ${id} · पिछले ${n} वर्ष` },
  "history.current": { en: "Current", hi: "मौजूदा" },
  "history.status.paidSim": { en: "Paid (simulated)", hi: "भुगतान (सिम्युलेटेड)" },
  "history.note": {
    en: "Synthetic record for this prototype — the portal has no connection to a real municipal ledger.",
    hi: "इस प्रोटोटाइप के लिए काल्पनिक रिकॉर्ड — इस पोर्टल का किसी वास्तविक नगरपालिका बही-खाते से कोई संबंध नहीं है।",
  },

  // ---- bottom actions ----
  "action.raiseDispute": { en: "Raise a dispute", hi: "आपत्ति दर्ज करें" },
  "action.payBill": { en: "Pay bill (mock)", hi: "बिल भुगतान करें (मॉक)" },
  "action.paymentSimulated": { en: "Payment simulated", hi: "भुगतान सिम्युलेटेड" },

  // ---- breakdown intro ----
  "bd.eyebrow": { en: "Your bill, unpacked", hi: "आपका बिल, खोलकर" },
  "bd.h1": { en: (x) => `Here’s how ${x} was calculated.`, hi: (x) => `${x} की गणना इस तरह हुई।` },
  "bd.intro": {
    en: "Tap any line to see the rule behind it. If an input looks wrong, you can question that exact line.",
    hi: "किसी भी पंक्ति पर टैप करके उसके पीछे का नियम देखें। यदि कोई इनपुट गलत लगे, तो आप उसी पंक्ति पर आपत्ति कर सकते हैं।",
  },
  "bd.due": { en: (d) => `Due ${d}`, hi: (d) => `देय ${d}` },

  // ---- section 01: record ----
  "rec.title": { en: "Property details used", hi: "उपयोग किए गए संपत्ति विवरण" },
  "rec.sub": {
    en: "The municipal record for this property, and the facts the calculation starts with.",
    hi: "इस संपत्ति का नगरपालिका रिकॉर्ड, और वे तथ्य जिनसे गणना शुरू होती है।",
  },
  "rec.builtUpArea": { en: "Built-up area", hi: "निर्मित क्षेत्र" },
  "rec.zone": { en: "Zone", hi: "क्षेत्र" },
  "rec.usage": { en: "Usage", hi: "उपयोग" },
  "rec.buildingAge": { en: "Building age", hi: "भवन की आयु" },
  "rec.years": { en: (n) => `${n} years`, hi: (n) => `${n} वर्ष` },
  "rec.occupancy": { en: "Occupancy", hi: "अधिभोग" },
  "rec.ownerCategory": { en: "Owner category", hi: "स्वामी श्रेणी" },

  // ---- section 02: base calculation ----
  "calc.title": { en: "Base calculation", hi: "मूल गणना" },
  "calc.method": {
    en: "We use a unit-area value method—the local value of each square metre, adjusted for the property.",
    hi: "हम इकाई-क्षेत्र मूल्य विधि का उपयोग करते हैं—प्रत्येक वर्ग मीटर का स्थानीय मूल्य, संपत्ति के अनुसार समायोजित।",
  },
  "calc.formulaCaption": { en: "Annual assessed value", hi: "वार्षिक निर्धारित मूल्य" },
  "calc.f.area": { en: "area", hi: "क्षेत्र" },
  "calc.f.uav": { en: "unit-area value", hi: "इकाई-क्षेत्र मूल्य" },
  "calc.f.use": { en: "use", hi: "उपयोग" },
  "calc.f.age": { en: "age", hi: "आयु" },
  "calc.f.occupancy": { en: "occupancy", hi: "अधिभोग" },
  "calc.thenRate": { en: "Then the annual tax rate is applied. Here is each step.", hi: "फिर वार्षिक कर दर लागू होती है। यहाँ हर चरण है।" },
  "calc.cessNote": {
    en: (rate, tax) =>
      `Base property tax, library cess, health cess and SWM cess are a split of the single ${rate}% municipal rate — a real bill shows only the combined figure. Together they equal your annual property tax of ${tax}, before any rebate or late-payment charge.`,
    hi: (rate, tax) =>
      `मूल संपत्ति कर, पुस्तकालय उपकर, स्वास्थ्य उपकर और SWM उपकर एक ही ${rate}% नगरपालिका दर का विभाजन हैं — असली बिल केवल संयुक्त आँकड़ा दिखाता है। मिलकर ये किसी छूट या विलंब शुल्क से पहले आपके ${tax} वार्षिक संपत्ति कर के बराबर हैं।`,
  },

  // ---- calculation line labels ----
  "line.builtUpArea": { en: "Built-up area", hi: "निर्मित क्षेत्र" },
  "line.useFactor": { en: (u) => `${u} use factor`, hi: (u) => `${u} उपयोग गुणक` },
  "line.ageFactor": { en: (n) => `${n}-year building age factor`, hi: (n) => `${n}-वर्ष भवन आयु गुणक` },
  "line.occupancyFactor": { en: (o) => `${o} factor`, hi: (o) => `${o} गुणक` },
  "line.baseTax": { en: "Base property tax", hi: "मूल संपत्ति कर" },
  "line.libraryCess": { en: "Library cess", hi: "पुस्तकालय उपकर" },
  "line.healthCess": { en: "Health cess", hi: "स्वास्थ्य उपकर" },
  "line.swmCess": { en: "Solid Waste Management (SWM) cess", hi: "ठोस अपशिष्ट प्रबंधन (SWM) उपकर" },
  "line.annualPropertyTax": { en: "Annual property tax", hi: "वार्षिक संपत्ति कर" },
  "line.appliedRebate": { en: "Applied rebate", hi: "लागू छूट" },
  "line.latePaymentCharge": { en: "Late-payment charge", hi: "विलंब शुल्क" },
  "line.amountDue": { en: "Amount due", hi: "देय राशि" },

  // ---- calculation line helpers ----
  "help.area": { en: (a, u) => `${a} m² × ${u}/m²/month × 12 months`, hi: (a, u) => `${a} m² × ${u}/m²/माह × 12 माह` },
  "help.useFactor": { en: (f) => `Assessed value × ${f}`, hi: (f) => `निर्धारित मूल्य × ${f}` },
  "help.ageFactor": { en: (f) => `Adjusted value × ${f}`, hi: (f) => `समायोजित मूल्य × ${f}` },
  "help.occupancyFactor": { en: (f) => `Adjusted value × ${f}`, hi: (f) => `समायोजित मूल्य × ${f}` },
  "help.baseTax": { en: (v) => `Core municipal tax on ${v} assessed value`, hi: (v) => `${v} निर्धारित मूल्य पर मूल नगरपालिका कर` },
  "help.cess1pct": { en: "≈1% of assessed value", hi: "निर्धारित मूल्य का ≈1%" },
  "help.cessSwm": { en: "≈1.5% of assessed value", hi: "निर्धारित मूल्य का ≈1.5%" },
  "help.penalty": { en: (r, m) => `${r}% per month for ${m} months`, hi: (r, m) => `${m} माह के लिए ${r}% प्रति माह` },
  "help.totalDue": { en: "Tax after applied rebates and charges", hi: "लागू छूट और शुल्कों के बाद कर" },

  // ---- calculation line detail text ----
  "det.area": {
    en: (area, uav, total) =>
      `Your recorded built-up area is ${area} square metres. The zone's published unit-area value is ${uav} per square metre per month. Together, they produce an annual assessed value of ${total} before property-specific factors.`,
    hi: (area, uav, total) =>
      `आपका दर्ज निर्मित क्षेत्र ${area} वर्ग मीटर है। इस क्षेत्र का प्रकाशित इकाई-क्षेत्र मूल्य ${uav} प्रति वर्ग मीटर प्रति माह है। मिलकर, ये संपत्ति-विशिष्ट गुणकों से पहले ${total} का वार्षिक निर्धारित मूल्य देते हैं।`,
  },
  "det.useFactor": {
    en: (use, f, val) =>
      `The use factor adjusts the rate for how the property is used. ${use} in this prototype uses a factor of ${f}, so the assessed value is ${val}.`,
    hi: (use, f, val) =>
      `उपयोग गुणक इस बात के लिए दर समायोजित करता है कि संपत्ति कैसे इस्तेमाल होती है। इस प्रोटोटाइप में ${use} के लिए गुणक ${f} है, तो निर्धारित मूल्य ${val} है।`,
  },
  "det.ageFactor": {
    en: (age, pct, f, val) =>
      `Buildings in the ${age}-year-old bracket receive a ${pct}% depreciation adjustment. The age factor is ${f}, producing ${val}. This reduces the assessed value because the building is not new.`,
    hi: (age, pct, f, val) =>
      `${age}-वर्ष आयु वर्ग के भवनों को ${pct}% मूल्यह्रास समायोजन मिलता है। आयु गुणक ${f} है, जिससे ${val} बनता है। इससे निर्धारित मूल्य घटता है क्योंकि भवन नया नहीं है।`,
  },
  "det.occupancyFactor": {
    en: (occ, f, val) =>
      `The record says this property is ${occ}. The matching occupancy factor is ${f}, giving a final assessed value of ${val}.`,
    hi: (occ, f, val) =>
      `रिकॉर्ड कहता है कि यह संपत्ति ${occ} है। मिलान वाला अधिभोग गुणक ${f} है, जिससे ${val} का अंतिम निर्धारित मूल्य मिलता है।`,
  },
  "det.baseTax": {
    en: (val, rate, base) =>
      `The core municipal property tax on your final assessed value of ${val}. A real bill folds this into one ${rate}% headline rate; here it is that rate minus the three earmarked cesses below — not an extra charge. It comes to ${base}.`,
    hi: (val, rate, base) =>
      `आपके ${val} के अंतिम निर्धारित मूल्य पर मूल नगरपालिका संपत्ति कर। असली बिल इसे एक ${rate}% मुख्य दर में समेट देता है; यहाँ यह वह दर है, नीचे के तीन निर्दिष्ट उपकरों को घटाकर — कोई अतिरिक्त शुल्क नहीं। यह ${base} बनता है।`,
  },
  "det.libraryCess": {
    en: (amt) =>
      `A fixed levy funding public libraries in your ward — applied to every property regardless of usage. Municipal bills bundle it into the headline tax rate and never itemise it; this prototype shows it on its own line: ${amt}.`,
    hi: (amt) =>
      `आपके वार्ड में सार्वजनिक पुस्तकालयों के लिए एक निश्चित उगाही — हर संपत्ति पर, उपयोग चाहे जो हो। नगरपालिका बिल इसे मुख्य कर दर में मिला देते हैं और कभी अलग नहीं दिखाते; यह प्रोटोटाइप इसे अपनी अलग पंक्ति में दिखाता है: ${amt}।`,
  },
  "det.healthCess": {
    en: (amt, tax) =>
      `A fixed levy funding municipal primary health centres and sanitation drives — also applied to every property regardless of usage, and also hidden inside the headline rate on a real bill: ${amt}.`,
    hi: (amt, tax) =>
      `नगरपालिका प्राथमिक स्वास्थ्य केंद्रों और स्वच्छता अभियानों के लिए एक निश्चित उगाही — यह भी हर संपत्ति पर, उपयोग चाहे जो हो, और असली बिल में मुख्य दर के भीतर छिपी हुई: ${amt}।`,
  },
  "det.swmCess": {
    en: (amt, tax) =>
      `Funds collection, transport, and disposal of solid waste in your ward — charged to every property regardless of usage. Base property tax plus all three cesses equals your ${tax} annual property tax.`,
    hi: (amt, tax) =>
      `आपके वार्ड में ठोस अपशिष्ट के संग्रह, परिवहन और निपटान का वित्तपोषण — हर संपत्ति पर, उपयोग चाहे जो हो। मूल संपत्ति कर और तीनों उपकर मिलकर आपके ${tax} वार्षिक संपत्ति कर के बराबर हैं।`,
  },
  "det.penalty": {
    en: (reason, start, rate, before, months, total) =>
      `${reason} From ${start}, a ${rate}% monthly charge applies to the unpaid bill after rebates (${before}). After ${months} months, it has accumulated to ${total}.`,
    hi: (reason, start, rate, before, months, total) =>
      `${reason} ${start} से, छूट के बाद के अदत्त बिल (${before}) पर ${rate}% मासिक शुल्क लगता है। ${months} माह बाद, यह ${total} तक जमा हो गया है।`,
  },
  "det.total": {
    en: "This is the amount shown on your bill: the annual tax, less rebates already applied, plus any late-payment charge. It does not include the potential savings shown separately below.",
    hi: "यह वही राशि है जो आपके बिल पर दिखती है: वार्षिक कर, पहले से लागू छूट घटाकर, कोई विलंब शुल्क जोड़कर। इसमें नीचे अलग दिखाई गई संभावित बचत शामिल नहीं है।",
  },

  // ---- section 03: rebates & charges ----
  "adj.title": { en: "Rebates and charges", hi: "छूट और शुल्क" },
  "adj.sub": {
    en: "Items that change the base tax into the amount currently due.",
    hi: "वे मदें जो मूल कर को वर्तमान देय राशि में बदलती हैं।",
  },
  "adj.alreadyApplied": { en: "Already applied", hi: "पहले से लागू" },
  "adj.noRebates": { en: "No rebates applied", hi: "कोई छूट लागू नहीं" },
  "adj.noRebatesBody": {
    en: "There are no deductions recorded on this bill.",
    hi: "इस बिल पर कोई कटौती दर्ज नहीं है।",
  },
  "adj.stillEligible": { en: "You may still be eligible", hi: "आप अब भी पात्र हो सकते हैं" },
  "adj.stillEligibleBody": {
    en: "These savings are not included in your bill because the supporting declaration is not recorded.",
    hi: "ये बचतें आपके बिल में शामिल नहीं हैं क्योंकि सहायक घोषणा दर्ज नहीं है।",
  },
  "adj.couldSave": { en: (x) => `Could save ${x}`, hi: (x) => `${x} बचा सकते हैं` },

  // ---- next step ----
  "next.eyebrow": { en: "You are in control", hi: "नियंत्रण आपके पास है" },
  "next.h2": { en: "Does something not look right?", hi: "क्या कुछ सही नहीं लग रहा?" },
  "next.body": {
    en: "Choose the line you want reviewed. Your dispute starts with the relevant bill detail already attached.",
    hi: "जिस पंक्ति की समीक्षा चाहते हैं उसे चुनें। आपकी आपत्ति संबंधित बिल विवरण पहले से संलग्न करके शुरू होती है।",
  },
  "calc.questionThisLine": { en: "Question this line", hi: "इस पंक्ति पर आपत्ति करें" },

  // ---- payment modal ----
  "pay.mockPayment": { en: "Mock payment", hi: "मॉक भुगतान" },
  "pay.confirmTitle": { en: "Confirm simulated payment", hi: "सिम्युलेटेड भुगतान की पुष्टि करें" },
  "pay.confirmBody": {
    en: "You are about to simulate payment of the amount due. This will not open a bank page or process a transaction.",
    hi: "आप देय राशि का भुगतान सिम्युलेट करने वाले हैं। इससे कोई बैंक पेज नहीं खुलेगा और कोई लेन-देन नहीं होगा।",
  },
  "pay.amountToSimulate": { en: "Amount to simulate", hi: "सिम्युलेट करने की राशि" },
  "pay.method": { en: "Payment method", hi: "भुगतान का तरीका" },
  "pay.mode.UPI": { en: "UPI", hi: "UPI" },
  "pay.mode.Card": { en: "Card", hi: "कार्ड" },
  "pay.mode.Net Banking": { en: "Net Banking", hi: "नेट बैंकिंग" },
  "pay.simulate": { en: "Simulate payment", hi: "भुगतान सिम्युलेट करें" },
  "pay.cancel": { en: "Cancel", hi: "रद्द करें" },
  "pay.closePayment": { en: "Close payment", hi: "भुगतान बंद करें" },

  // ---- receipt ----
  "rcpt.eyebrow": { en: "Simulation complete", hi: "सिम्युलेशन पूर्ण" },
  "rcpt.title": { en: (m) => `Simulated via ${m}.`, hi: (m) => `${m} के ज़रिए सिम्युलेटेड।` },
  "rcpt.body": {
    en: "No money moved and no payment gateway was contacted.",
    hi: "कोई पैसा स्थानांतरित नहीं हुआ और किसी भुगतान गेटवे से संपर्क नहीं किया गया।",
  },
  "rcpt.qrNote": { en: "Encodes the receipt number only", hi: "केवल रसीद संख्या एन्कोड करता है" },
  "rcpt.number": { en: "Receipt number", hi: "रसीद संख्या" },
  "rcpt.fy": { en: "Financial year", hi: "वित्तीय वर्ष" },
  "rcpt.propertyId": { en: "Property ID", hi: "संपत्ति आईडी" },
  "rcpt.amountPaid": { en: "Amount paid", hi: "भुगतान की गई राशि" },
  "rcpt.mode": { en: "Payment mode", hi: "भुगतान का तरीका" },
  "rcpt.timestamp": { en: "Timestamp", hi: "समय-चिह्न" },
  "rcpt.disclaimer": {
    en: "Mock receipt — for prototype demonstration only, not valid proof of payment.",
    hi: "मॉक रसीद — केवल प्रोटोटाइप प्रदर्शन के लिए, भुगतान का वैध प्रमाण नहीं।",
  },
  "rcpt.returnToBill": { en: "Return to bill", hi: "बिल पर लौटें" },
  "rcpt.close": { en: "Close receipt", hi: "रसीद बंद करें" },

  // ---- dispute modal ----
  "disp.recorded": { en: "Dispute recorded", hi: "आपत्ति दर्ज" },
  "disp.ready": { en: "Your review request is ready.", hi: "आपका समीक्षा अनुरोध तैयार है।" },
  "disp.attachedLine": {
    en: (line) => `We have attached the exact bill line you chose: ${line}.`,
    hi: (line) => `हमने आपकी चुनी हुई सटीक बिल पंक्ति संलग्न कर दी है: ${line}।`,
  },
  "disp.referenceNumber": { en: "Reference number", hi: "संदर्भ संख्या" },
  "disp.copy": { en: "Copy", hi: "कॉपी करें" },
  "disp.copied": { en: "Copied", hi: "कॉपी हुआ" },
  "disp.within2": { en: "Within 2 working days", hi: "2 कार्य दिवसों में" },
  "disp.within2Body": {
    en: "A record-check team reviews the property detail and rule.",
    hi: "एक रिकॉर्ड-जाँच टीम संपत्ति विवरण और नियम की समीक्षा करती है।",
  },
  "disp.within7": { en: "Within 7 working days", hi: "7 कार्य दिवसों में" },
  "disp.within7Body": {
    en: "You receive the mocked outcome and any corrected bill.",
    hi: "आपको मॉक परिणाम और कोई सुधारा हुआ बिल मिलता है।",
  },
  "disp.done": { en: "Done", hi: "पूर्ण" },
  "disp.startTitle": { en: "Start with the line you’re questioning.", hi: "जिस पंक्ति पर आपत्ति है, उससे शुरू करें।" },
  "disp.startBody": {
    en: "Your request is pre-filled so a reviewer knows exactly what to check.",
    hi: "आपका अनुरोध पहले से भरा है ताकि समीक्षक को ठीक-ठीक पता हो कि क्या जाँचना है।",
  },
  "disp.lineToReview": { en: "Bill line to review", hi: "समीक्षा हेतु बिल पंक्ति" },
  "disp.whatChecked": { en: "What should be checked", hi: "क्या जाँचा जाना चाहिए" },
  "disp.reason": {
    en: (line, id) =>
      `I would like the ${line.toString().toLowerCase()} on property ${id} to be reviewed. I believe the information or rule used may be incorrect.`,
    hi: (line, id) =>
      `मैं संपत्ति ${id} पर ${line} की समीक्षा चाहता/चाहती हूँ। मुझे लगता है कि उपयोग की गई जानकारी या नियम गलत हो सकता है।`,
  },
  "disp.attachedAuto": { en: "Attached automatically", hi: "स्वचालित रूप से संलग्न" },
  "disp.attachedAutoBody": {
    en: "Property ID, selected line, and this bill’s calculation context.",
    hi: "संपत्ति आईडी, चयनित पंक्ति, और इस बिल का गणना संदर्भ।",
  },
  "disp.submit": { en: "Submit review request", hi: "समीक्षा अनुरोध भेजें" },
  "disp.footnote": {
    en: "Prototype only—no request is sent to a municipal office.",
    hi: "केवल प्रोटोटाइप—कोई अनुरोध किसी नगरपालिका कार्यालय को नहीं भेजा जाता।",
  },
  "disp.close": { en: "Close dispute", hi: "आपत्ति बंद करें" },
  "disp.closeConfirmation": { en: "Close confirmation", hi: "पुष्टि बंद करें" },

  // ---- prototype disclaimer (footer) ----
  "note.lead": { en: "Independent hackathon prototype.", hi: "स्वतंत्र हैकाथॉन प्रोटोटाइप।" },
  "note.fullTerms": { en: "Full terms", hi: "पूरी शर्तें" },
  "note.faq": { en: "FAQ", hi: "सामान्य प्रश्न" },
  "note.body": {
    en: "This is not a government product and is not affiliated with any municipal body or tax portal. All property data, calculations, cess splits and payment history are mock and synthetic. Payment is simulated; the payment-method choice is cosmetic and no transaction occurs. Any receipt or QR code generated here is a demonstration only and is not valid proof of payment. Bill explanations and dispute intake work today; municipal verification is mocked.",
    hi: "यह कोई सरकारी उत्पाद नहीं है और किसी नगरपालिका निकाय या कर पोर्टल से संबद्ध नहीं है। सभी संपत्ति डेटा, गणनाएँ, उपकर विभाजन और भुगतान इतिहास मॉक और काल्पनिक हैं। भुगतान सिम्युलेटेड है; भुगतान-तरीके का चयन दिखावटी है और कोई लेन-देन नहीं होता। यहाँ बनी कोई भी रसीद या QR कोड केवल प्रदर्शन है और भुगतान का वैध प्रमाण नहीं है। बिल स्पष्टीकरण और आपत्ति ग्रहण आज काम करते हैं; नगरपालिका सत्यापन मॉक है।",
  },

  // ---- /terms ----
  "terms.title": { en: "Terms", hi: "शर्तें" },
  "terms.back": { en: "Back", hi: "वापस" },
  "terms.body": {
    en: "This is an independent hackathon prototype, not a government product or service. All property records, calculations, and payments shown are synthetic and simulated — no real data is collected, stored, or transmitted, and no payment gateway is contacted. Nothing here should be relied on as an actual property tax record.",
    hi: "यह एक स्वतंत्र हैकाथॉन प्रोटोटाइप है, कोई सरकारी उत्पाद या सेवा नहीं। दिखाए गए सभी संपत्ति रिकॉर्ड, गणनाएँ और भुगतान काल्पनिक और सिम्युलेटेड हैं — कोई वास्तविक डेटा एकत्र, संग्रहीत या प्रेषित नहीं किया जाता, और किसी भुगतान गेटवे से संपर्क नहीं किया जाता। यहाँ किसी भी चीज़ को वास्तविक संपत्ति कर रिकॉर्ड के रूप में भरोसे में नहीं लेना चाहिए।",
  },

  // ---- /faq ----
  "faq.title": { en: "Common questions", hi: "सामान्य प्रश्न" },
  "faq.intro": {
    en: "Plain answers to what people actually ask about a property tax bill — and about this prototype.",
    hi: "संपत्ति कर बिल के बारे में — और इस प्रोटोटाइप के बारे में — लोग जो वाकई पूछते हैं, उसके सीधे जवाब।",
  },
  "faq.back": { en: "Back", hi: "वापस" },
  "faq.q1": { en: "How is my property tax calculated?", hi: "मेरा संपत्ति कर कैसे निकाला जाता है?" },
  "faq.a1": {
    en: "It uses the unit-area method shown in “Why this amount?”: your built-up area is multiplied by a published per-square-metre value, then adjusted by factors for use, building age and occupancy. A municipal tax rate is applied to that assessed value to get the annual tax, before rebates or any late fee.",
    hi: "यह “यह राशि क्यों?” में दिखाई गई इकाई-क्षेत्र विधि का उपयोग करता है: आपके निर्मित क्षेत्र को प्रति वर्ग मीटर के प्रकाशित मूल्य से गुणा किया जाता है, फिर उपयोग, भवन की आयु और अधिभोग के गुणकों से समायोजित किया जाता है। उस निर्धारित मूल्य पर एक नगरपालिका कर दर लगाकर वार्षिक कर मिलता है, छूट या किसी विलंब शुल्क से पहले।",
  },
  "faq.q2": {
    en: "What are library, health, and SWM cess, and why are they separate from my tax?",
    hi: "पुस्तकालय, स्वास्थ्य और SWM उपकर क्या हैं, और ये मेरे कर से अलग क्यों हैं?",
  },
  "faq.a2": {
    en: "They are fixed levies bundled into your total tax that fund specific municipal services — libraries, primary health and sanitation, and solid-waste collection. A real bill folds them into one rate. This app shows them on their own lines so you can see what each rupee actually funds, instead of one unexplained lump sum.",
    hi: "ये आपके कुल कर में शामिल निश्चित उगाहियाँ हैं जो विशिष्ट नगरपालिका सेवाओं का वित्तपोषण करती हैं — पुस्तकालय, प्राथमिक स्वास्थ्य और स्वच्छता, और ठोस-अपशिष्ट संग्रह। असली बिल इन्हें एक दर में समेट देता है। यह ऐप इन्हें अलग-अलग पंक्तियों में दिखाता है ताकि आप देख सकें कि हर रुपया वाकई किस चीज़ का वित्तपोषण करता है, एक अस्पष्ट एकमुश्त राशि के बजाय।",
  },
  "faq.q3": { en: "I think my bill has an error — what do I do?", hi: "मुझे लगता है मेरे बिल में गलती है — मैं क्या करूँ?" },
  "faq.a3": {
    en: "Open “Why this amount?”, expand the row you disagree with, and use “Question this line.” It opens a dispute that is pre-filled with that exact line and gives you a reference number plus a stated review timeline. You do not have to describe the whole bill — just the one thing you think is wrong.",
    hi: "“यह राशि क्यों?” खोलें, जिस पंक्ति से असहमत हैं उसे विस्तृत करें, और “इस पंक्ति पर आपत्ति करें” का उपयोग करें। यह उसी सटीक पंक्ति के साथ पहले से भरी एक आपत्ति खोलता है और आपको एक संदर्भ संख्या तथा एक निर्धारित समीक्षा समयसीमा देता है। आपको पूरा बिल बताने की ज़रूरत नहीं — बस वह एक बात जो आपको गलत लगती है।",
  },
  "faq.q4": { en: "Are my eligible rebates automatically applied?", hi: "क्या मेरी पात्र छूटें अपने आप लागू हो जाती हैं?" },
  "faq.a4": {
    en: "No. Some rebates need a declaration on file first — for example a senior-citizen co-owner declaration. The “You may still be eligible” section flags what you appear to qualify for but haven't claimed. The app points it out; it does not file the declaration for you.",
    hi: "नहीं। कुछ छूटों के लिए पहले फ़ाइल में एक घोषणा चाहिए — जैसे वरिष्ठ-नागरिक सह-स्वामी घोषणा। “आप अब भी पात्र हो सकते हैं” अनुभाग यह बताता है कि आप किसके लिए पात्र लगते हैं पर दावा नहीं किया है। ऐप इसे बताता है; यह आपके लिए घोषणा दाखिल नहीं करता।",
  },
  "faq.q5": { en: "What happens if I miss the due date?", hi: "अगर मैं नियत तिथि चूक जाऊँ तो क्या होगा?" },
  "faq.a5": {
    en: "A late-payment charge is added — a fixed percentage of the unpaid amount for each month it stays unpaid. On the overdue demo property (DEMO-3982) you can see this as its own line, showing the monthly rate, how many months have passed, and the total it has built up to.",
    hi: "एक विलंब शुल्क जुड़ जाता है — जितने माह राशि अदत्त रहती है, हर माह के लिए अदत्त राशि का एक निश्चित प्रतिशत। बकाया डेमो संपत्ति (DEMO-3982) पर आप इसे अपनी अलग पंक्ति में देख सकते हैं, जो मासिक दर, कितने माह बीते, और यह जो कुल बना है, दिखाती है।",
  },
  "faq.q6": {
    en: "Is this connected to my real municipal corporation or any government database?",
    hi: "क्या यह मेरे वास्तविक नगर निगम या किसी सरकारी डेटाबेस से जुड़ा है?",
  },
  "faq.a6": {
    en: "No. This is an independent prototype with synthetic data only. It is not affiliated with any municipal body or tax portal, and nothing you see here is drawn from or written to a real record.",
    hi: "नहीं। यह केवल काल्पनिक डेटा वाला एक स्वतंत्र प्रोटोटाइप है। यह किसी नगरपालिका निकाय या कर पोर्टल से संबद्ध नहीं है, और यहाँ जो कुछ आप देखते हैं वह किसी वास्तविक रिकॉर्ड से न लिया गया है न उसमें लिखा जाता है।",
  },
  "faq.q7": { en: "Is my payment real if I use the “Pay bill” button?", hi: "अगर मैं “बिल भुगतान करें” बटन इस्तेमाल करूँ तो क्या मेरा भुगतान असली है?" },
  "faq.a7": {
    en: "No. It is a simulation. You can pick UPI, card or net banking, and it generates a mock receipt with a QR code that encodes only a receipt number. No actual transaction happens and no payment gateway is contacted.",
    hi: "नहीं। यह एक सिम्युलेशन है। आप UPI, कार्ड या नेट बैंकिंग चुन सकते हैं, और यह एक QR कोड वाली मॉक रसीद बनाता है जो केवल एक रसीद संख्या एन्कोड करता है। कोई वास्तविक लेन-देन नहीं होता और किसी भुगतान गेटवे से संपर्क नहीं होता।",
  },
  "faq.q8": { en: "What happens to my dispute after I submit it?", hi: "आपत्ति भेजने के बाद उसका क्या होता है?" },
  "faq.a8": {
    en: "You get a reference number and a stated timeline — a record-check review within two working days, then a mocked outcome and any corrected bill within seven. It is a demonstration of the intake flow, not a live connection to any actual grievance system.",
    hi: "आपको एक संदर्भ संख्या और एक निर्धारित समयसीमा मिलती है — दो कार्य दिवसों में रिकॉर्ड-जाँच समीक्षा, फिर सात के भीतर एक मॉक परिणाम और कोई सुधारा हुआ बिल। यह ग्रहण प्रक्रिया का प्रदर्शन है, किसी वास्तविक शिकायत प्रणाली से सीधा संबंध नहीं।",
  },
} satisfies Record<string, Entry>;

export type StrKey = keyof typeof STR;
