# Unpacked — Property Tax, Explained

**Live:** https://property-tax-unpacked.vercel.app
**Built for:** Build What Moves India (Varun Mayya × OpenAI hackathon)

## The problem

Indian municipal property tax portals show a citizen a final number and almost
nothing else. No breakdown of how it was calculated, no explanation of the cess
components bundled into the rate, no reason given for a penalty, and no clear way
to dispute a specific line item. People either pay a number they don't understand
or ignore it until it becomes a bigger problem.

## The one journey this solves

> "I got a property tax bill I don't understand, and I think something's wrong."

Unpacked takes that single journey and builds around it end to end — no admin
panel, no multi-city support, no login system beyond a mock property lookup.

## What's actually built

- **Property lookup** — three seeded demo properties, each telling a different
  story: a clean paid-on-time bill, a bill with a missed rebate, and an overdue
  bill with a penalty
- **Line-by-line calculation breakdown** — the unit-area method
  (area × unit-area value × use × age × occupancy factors, then rate applied),
  mirroring how MCD and BBMP actually compute tax
- **Cess breakdown** — the tax total split into base property tax, library cess,
  health cess, and Solid Waste Management (SWM) cess, each with a plain-language
  explanation of what it funds
- **Municipal record fields** — Khata number, survey number, ward, owner name
  with S/O·D/O·W/O relation, and government guideline rate (shown as a reference
  figure, not used in the calculation)
- **Rebate detection** — shows rebates already applied vs. rebates the citizen is
  still eligible for but hasn't claimed, and why
- **Per-line dispute flow** — "Question this line" on any calculation row opens a
  pre-filled dispute with a reference number and a stated review timeline
- **Simulated payment** — UPI / card / net banking mode selection, a mock
  QR-coded receipt, and a running payment history across financial years
- **Full English/Hindi toggle** — every screen, persisted across navigation
- **FAQ** — eight questions a real citizen would actually ask, in-voice

## What's honestly mocked

This is an independent hackathon prototype, not a government product and not
affiliated with any municipal body. All property records, calculations, cess
splits, and payment history are synthetic. Payment is simulated — the
payment-method choice is cosmetic, no transaction occurs, and any receipt or QR
code generated is a demonstration only, not valid proof of payment. Bill
explanations and dispute intake work as real UI flows today; municipal
verification itself is mocked. Full disclosure at [`/terms`](https://property-tax-unpacked.vercel.app/terms).

## Stack

Next.js, TypeScript, deployed on Vercel. No external APIs, no backend database —
calculation logic and seeded property data run entirely client-side against a
static dataset.

## Running locally

```bash
git clone https://github.com/tanishk001-ai/property-tax-unpacked.git
cd property-tax-unpacked
npm install
npm run dev
```

Visit `localhost:3000`, use sample property ID `DEMO-7719` (or `DEMO-2048` /
`DEMO-3982`) to see the three scenarios.

## Built by

Tanishk Tiwari, solo — implementation via Codex, directed and debugged
throughout.
