# Unpacked — Property Tax, Explained

**Live:** https://property-tax-unpacked.vercel.app

**Built for:** Build What Moves India (Varun Mayya × OpenAI hackathon)

## The problem

Indian municipal property tax portals show a citizen a final number and almost
nothing else. No breakdown of how it was calculated, no reason given for a
penalty, and no clear way to dispute a specific line item. People either pay a
number they don't understand or ignore it until it becomes a bigger problem.

## The one journey this solves

> "I got a property tax bill I don't understand, and I think something's wrong."

Unpacked takes that single journey and builds around it end to end — no admin
panel, no multi-city support, no login system beyond a mock property lookup.

## Try it

Open any demo property directly (the links open the live app):

- [**DEMO-2048**](https://property-tax-unpacked.vercel.app/bill/DEMO-2048) — a clean bill with rebates already applied
- [**DEMO-7719**](https://property-tax-unpacked.vercel.app/bill/DEMO-7719) — a bill with a rebate the owner has not claimed
- [**DEMO-3982**](https://property-tax-unpacked.vercel.app/bill/DEMO-3982) — an overdue bill with a late-payment charge

Add `/breakdown` to any link to land on the "Why this amount?" breakdown, for
example `/bill/DEMO-7719/breakdown`.

## What's actually built

- **Property lookup** — three seeded demo properties, each telling a different
  story: a clean bill, a bill with a missed rebate, and an overdue bill with a
  penalty. Every bill is for FY 2026–27 and the dates come from the property data
- **Shareable links** — `/bill/DEMO-7719` opens that bill and
  `/bill/DEMO-7719/breakdown` its breakdown. The three demo bills are
  prerendered, so a shared link shows the bill immediately. An unknown id shows
  the landing page with the "not found" message, and older `/?id=DEMO-7719`
  links redirect to the new paths. The browser back and forward buttons move
  between the landing page, a bill and its breakdown
- **Line-by-line calculation breakdown** — the unit-area method
  (area × unit-area value × use × age × occupancy factors, then the tax rate is
  applied). Modelled on the unit-area method used by several Indian municipal
  corporations; rates and factors here are illustrative
- **Municipal record fields** — Khata number, survey number, ward, owner name
  with S/O·D/O·W/O relation, and government guideline rate (shown as a reference
  figure, not used in the calculation)
- **Rebate detection** — shows rebates already applied vs. rebates the citizen is
  still eligible for but hasn't claimed, and why
- **Per-line dispute flow** — "Question this line" on any calculation row opens a
  pre-filled dispute with a unique reference number and a stated review timeline
- **Simulated payment** — UPI / card / net banking mode selection, a mock
  QR-coded receipt with its own reference number, and a payment history across
  financial years
- **Full English/Hindi toggle** — every screen, persisted across navigation
- **FAQ** — eight questions a real citizen would actually ask, in-voice
- **Anonymous analytics** — Vercel Web Analytics page views plus custom events
  (property opened, breakdown opened, line expanded, "question this line" clicked,
  dispute submitted, payment simulated, language switched). Events carry only demo property IDs, line ids,
  the payment mode and the language — nothing a visitor types. Custom events need
  a Vercel Pro or Enterprise plan; page views work on any plan

## What's honestly mocked

This is an independent hackathon prototype, not a government product and not
affiliated with any municipal body. All property records, calculations, and
payment history are synthetic. Payment is simulated — the payment-method choice
is cosmetic, no transaction occurs, and any receipt or QR code generated is a
demonstration only, not valid proof of payment. Bill explanations and dispute
intake work as real UI flows today; municipal verification itself is mocked.
Full disclosure at [`/terms`](https://property-tax-unpacked.vercel.app/terms).

## Stack

Next.js, TypeScript, deployed on Vercel. No backend database and no API routes —
calculation logic and seeded property data run entirely client-side against a
static dataset. The only server code is a small middleware that redirects old
`/?id=` links and answers unknown bill addresses. Vercel Web Analytics is the
only external service.

## Running locally

```bash
git clone https://github.com/tanishk001-ai/property-tax-unpacked.git
cd property-tax-unpacked
npm install
npm run dev
```

Visit `localhost:3000`, use sample property ID `DEMO-7719` (or `DEMO-2048` /
`DEMO-3982`) to see the three scenarios. `npm run lint` and `npm run build`
should both pass.

## Built by

Tanishk Tiwari, solo. Codex generated the initial implementation from a
detailed product specification. I directed the build throughout
scoping the journey, diagnosing and fixing four behavioural bugs in the
initial build, and specifying every feature added after. Additional AI
tooling was used for later debugging and iteration.
