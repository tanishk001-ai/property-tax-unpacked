# QA report: Unpacked (PR #1, branch `polish-before-launch`)

Tested as someone who did not build the app and does not trust it. Plan: [TEST_PLAN.md](TEST_PLAN.md). Suite: `qa/suite.cjs` (headless Chromium and WebKit via Playwright). Raw results: `qa/results/`. Before/after pictures of the main bugs: `qa/screenshots/before/` and `qa/screenshots/after/`; what a link-preview crawler sees: `qa/evidence/`.

## Verdict

**Ready to post, once PR #1 is merged: the live site still serves the old build, where every /bill/… link is a 404.**

## What was run, and where

| Environment | What | Result |
|---|---|---|
| **Production build on this machine** (`next build && next start`), before the fixes | Whole suite, `qa/results/prod-local-baseline.json` | 112 of 135 case ids passed; 23 failed (below) |
| **Production build on this machine**, after the fixes | Whole suite incl. a WebKit iPhone-profile smoke test, `qa/results/prod-local.json` | **138 of 138** case ids passed (672 checks) |
| **Dev server** (`next dev`, React strict mode), after the fixes | Whole suite, `qa/results/dev.json`. Catches double-fired analytics and React/Next dev warnings | **138 of 138** case ids passed (672 checks). An earlier dev run found BUG-17 and BUG-18, fixed afterwards; it was not kept |
| **Vercel PR preview** | **Not run.** The preview is behind Vercel login (HTTP 302 to `vercel.com/sso-api`). The only way in is to create a share link on your Vercel project, which gives anyone with the URL access for 23 hours. I did not do that without asking. The routing, redirect, first-paint and link-preview cases were therefore run only against the local production build | not run |
| Hand-driven in the in-app browser (production build) | Cold open of a deep link at phone size, pay then Escape on the receipt, reload after paying | see the Manual column |

The preview currently serves commit `d123de6` (before any QA fix) in any case; it will rebuild when this branch is pushed.

Counts are case ids, each of which bundles several checks (for example BD-01 is 15 line amounts). The suite makes 672 individual checks per run.

## Bugs found

Severity: **blocker** stops the post, **major** a recruiter could plausibly hit it or it is untrue or inaccessible, **minor** polish or edge case. No blockers were found. Every bug below is fixed unless it is listed under product decisions.

| # | Sev | Bug | How it was found | Fix commit |
|---|---|---|---|---|
| BUG-01 | major | Landing page invisible until JavaScript loads. Its entrance animation started at opacity 0 in the server HTML, so a phone on a slow connection sees an empty page for seconds, and with JavaScript off it stays empty. | LK-16 | `a204a8c` |
| BUG-02 | major | Closing the payment receipt with the X, the backdrop or Escape threw the payment away: the receipt said "Simulation complete", then the bill still said due and offered Pay bill again. (Escape did nothing at all.) | PY-05, PY-06 | `4f4afaa`, `9c1a44b` |
| BUG-03 | major | After paying, the breakdown's bottom bar still offered "Pay bill", so the same bill could be paid twice and the two screens disagreed. | PY-09 | `7376bba` |
| BUG-04 | major | The terms said "no real data is collected, stored, or transmitted". The site counts anonymous usage with Vercel Web Analytics and remembers the language in the browser. Untrue as written. | FQ-04 (read-through) | `6d51b92` |
| BUG-05 | major | Dialogs were not accessible: no accessible name (axe `aria-dialog-name`, serious, on all four dialogs in both languages), Escape did nothing, focus did not move into the dialog or back to the button that opened it, and Tab walked out into the page behind. | AX-03, AX-04, AX-06, DP-09, DP-11 | `9c1a44b` |
| BUG-06 | major | Nothing for a link preview: no Open Graph or Twitter tags, no preview image, no favicon (`/favicon.ico` was a 404). A LinkedIn post would have shown a bare URL. See `qa/evidence/head-of-bill-page-before.html` and `-after.html`. | SH-02, SH-03, SH-06 | `46f5cbf` |
| BUG-07 | minor | Text typed in the dispute box was thrown away when the language was switched (or the line changed). | DP-06 | `0293766` |
| BUG-08 | minor | Copy button always said "Copied", even when the clipboard API was missing or refused; a refusal also surfaced as an unhandled error. | DP-08 | `4653d1c` |
| BUG-09 | minor | An address that is not a page (for example `/bill/DEMO-7719/extra`) showed the framework's English-only 404 with no way back, in Hindi too. | RT-19, LG-06 | `299cb1a` |
| BUG-10 | minor | Landing, bill and breakdown all had the same tab title, and the server-rendered title never named the property. | SH-01 | `46f5cbf` |
| BUG-11 | minor | In-app Back went wrong after returning from the breakdown: Back on the bill pushed a new landing entry instead of stepping back, so the browser's forward history was lost. | NV-01 | `6af79f9` |
| BUG-12 | minor | `/bill/demo-7719/` and `/bill/` redirected twice (trailing-slash redirect, then ours). | RT-03, RT-09, RT-16 | `564cb8e` |
| BUG-13 | minor | Two contrast failures: the Hindi sub-labels in the record list (3.0:1) and the × signs in the formula (3.9:1); AA needs 4.5:1. | AX-07 | `be8864c`, `13b7ec6` |
| BUG-14 | minor | The Hindi language button was not marked as Hindi for screen readers. | AX-05 | `630e7e2` |
| BUG-15 | minor | Three texts called the made-up unit-area value and guideline rate "published". README missed one analytics event and said "no server APIs" without mentioning the middleware. | FQ-04, FQ-05 (read-through) | `6d51b92`, `a9e7b45` |
| BUG-16 | minor | After a payment was recorded keyboard and screen-reader focus fell back to the top of the page (the Pay button is replaced by plain text). Found on the first re-run. | AX-03 | `d4406bd` |
| BUG-17 | minor (dev only) | The dev server warned on every page about `scroll-behavior: smooth` needing `data-scroll-behavior`. | RB-03 on dev | `f79d87b` |
| BUG-18 | minor (dev only) | In dev, /terms and /faq lost their translated tab title because the dev server puts `<title>` in `<body>`. Production was not affected. | SH-01 on dev | `fbcba87` |

## Fixes and how each was verified

Each fix is its own commit on the branch (`git log --oneline d123de6..HEAD`). After the fixes the whole suite was re-run (table above) and the failing cases from the first run were re-checked individually; the "Before fixes" and "After fixes" columns in the table below show the change per case.

- **Wrong numbers: none found.** Every rupee amount for all three properties (area value, each factor step, annual tax, each rebate, the unclaimed saving, the penalty, the amount due, the history rows) matches `qa/expected.cjs`, which recomputes them with exact fractions (BigInt, round half up) straight from `properties.json`, not from the app's own `calc()`. Checked on the bill, the breakdown, the banners, the receipt and the paid state, in English and Hindi, with Indian digit grouping everywhere (cases BL-01..11, BD-01..08, NM-01..04). The lines add up exactly on screen (tax − rebates + penalty = amount due, no off-by-one).
- **BUG-01..03, 07, 08, 16**: re-ran LK-16, PY-05/06/07/09, DP-06/08 and AX-03 after each fix; all pass in the production build and the dev server. Before/after pictures: `qa/screenshots/before/` and `qa/screenshots/after/` (landing without JavaScript, bill after closing the receipt with X, breakdown after paying, dispute note after toggling the language, not-found page in English and Hindi).
- **BUG-05**: after the fix, axe-core finds no serious or critical violation on any screen or dialog in either language (AX-06), Tab stays in each dialog, Escape closes it and focus returns to the opener (AX-03/04). A keyboard-only run from the landing page through payment now completes (AX-01).
- **BUG-06, 10**: `og:title`, `og:description`, `og:image`, `twitter:card` and `twitter:image` exist on every page; the image is a 1200×630 PNG (SH-02/03); a favicon is served (SH-06); titles differ per screen and are translated (SH-01).
- **BUG-12**: no URL in the 41-URL redirect set takes more than one hop (RT-16: max 1).
- **BUG-17/18**: re-ran the whole suite on the dev server under React strict mode: 138/138, no console warnings, analytics events fire exactly once per action (AN-01).
- The QA scripts are excluded from the app lint (`eslint.config.mjs`). `npm run lint` is clean and `npm run build` passes on the final commit.

## Product decisions for you

These are not bugs in the code; I did not change them.

1. **D1. Payment state is in memory only.** Refreshing, opening the link in a new tab, or opening a property again from the landing page shows the bill unpaid again (PY-14, hand-checked). That is consistent with "simulated" and the code says so, but a recruiter who pays, refreshes and sees "Due" again may think it is broken. Option: keep the paid state in `sessionStorage` for the tab.
2. **D2. Hindi readers see English first.** The language is read from the browser after the page loads, so the server HTML is always English. Locally the English headline is visible for about 65 ms. On a slow connection it lasts until the scripts load (first paint alone is 1.7 to 2.3 s at Slow 3G with a 6x slower CPU, and the Hindi text comes after that). Fixing it needs the language in a cookie so the server can render Hindi.
3. **D3. DEMO-3982's "5 months" of penalty is frozen.** It is static data worked out for October 2026, so in 2027 it will still say 5 months and the bill will still be due 31 May 2026. Fine for a demo; stale if the post gets traffic for months.
4. **D4. The "independent hackathon prototype" note sits at the bottom of each page.** On a phone it is below the fold on the landing page and the bill (it is prominent in the payment and dispute dialogs and the terms). If you want a recruiter to see it in the first screen, add a small tag near the top.
5. **D5. Small tap targets.** Several text buttons (breadcrumb, "Try a sample property", the EN/हिं switch) are about 19-21 px tall. They pass WCAG 2.2 AA (24 px, with the spacing exception) but are under the 44 px phones recommend. Not changed: it is a visual change.
6. **D6. Unknown ids return HTTP 200** by your request, so search engines may index junk addresses like `/bill/xyz`. A `noindex` on that page would avoid it.
7. **D7. `/bill/DEMO-7719/` (with a slash) is served as a duplicate of `/bill/DEMO-7719`** instead of redirecting. That is the price of making case-plus-slash addresses a single redirect (BUG-12). Vercel's page-view paths would count the two separately for anyone who types the slash.
8. **D8. Card label "A clear, paid-on-time bill" for DEMO-2048.** The current bill is unpaid ("Due"); the label is about its history. Reads slightly oddly next to the status.
9. **D9. The text a user types in the dispute box goes nowhere.** It is not shown again on the confirmation and is discarded on close. That matches "no request is sent", but the confirmation only says the line was attached.

## Things I could not test

- **The Vercel PR preview** (login-protected; I did not create a share link on your project without asking). Routing, redirects, deep-link first paint and link-preview tags were verified on the local production build only. Once this branch is pushed the preview will rebuild; if you want me to run the suite against it, say so and I will create the share link.
- **A real phone.** No iOS Safari or Android Chrome. WebKit with an iPhone 13 profile (Playwright) passed WK-01..03, which is the closest stand-in, not the same thing.
- **LinkedIn itself:** the in-app browser, and how LinkedIn's crawler renders the preview. I checked that the tags and the 1200×630 image are valid; LinkedIn caches previews, so after merging run the live URL through the LinkedIn Post Inspector.
- **The on-screen keyboard covering the dispute box (LY-08).** The modal scrolls on a 568 px screen (LY-03/04), but how iOS/Android move the page when the keyboard opens needs a device.
- **Screen readers speaking** (VoiceOver, TalkBack, NVDA): I tested names, roles, states and focus order with axe and the accessibility tree, not what they actually say.
- **Firefox** (not installed here), Windows high-contrast mode, and the real Vercel analytics dashboard (events were checked at the call site, not on Vercel).
- **The live site.** `property-tax-unpacked.vercel.app` still serves the old `main` build, where `/bill/…` links return 404. This branch must be merged (and the production deploy checked) before the link is posted.

## Addendum: "Demo data" tag

Added after the first pass so a cropped screenshot of a bill cannot pass as a real one: a "Demo data" / "डेमो डेटा" tag sits on the same line as the amount in the bill summary and in the breakdown header (cases DT-01..06, run at 320, 390 and 1366 px in both languages, all three properties, including the paid state). It stays on one line with the amount, never overlaps it, stays inside its panel, and measures well above AA contrast (dark brown on amber, about 9:1). Running the layout checks again found one real problem the tag introduced: at a 683 px wide window (200% zoom of a laptop) the breakdown header overflowed by 7 px; fixed in the same commit. The layout, Hindi-leftover, contrast and number checks were re-run and pass. Pictures: `qa/screenshots/demo-tag/`.

## Test mistakes I made and corrected

The first runs reported some failures that were my test's fault, not the app's. They are recorded so the "before" column is honest: a text scan that glued neighbouring elements together (`textContent` instead of `innerText`), a Ctrl-click that macOS treats as a right-click, comparing an uppercase CSS label with mixed-case text, expecting `/?id=` to redirect when staying on the landing page is fine, a scroll measured before smooth scrolling finished, a legacy-clipboard fallback that really does copy, and the Next dev overlay being counted as an app element with no focus ring. None of them are counted as app bugs.

## Pass/fail table (every case)

✅ pass, ❌ fail, · not run in that environment. "Manual" is what I saw hand-driving the browser.

| Case | What was checked | Before fixes (prod build) | After fixes (prod build) | After fixes (dev, strict mode) | Vercel preview | Manual |
|---|---|---|---|---|---|---|
| LK-01 | Landing renders title, field, 3 sample cards and the prototype note with no console errors | ✅ | ✅ | ✅ | · |  |
| LK-02 | Uppercase valid id opens the bill | ✅ | ✅ | ✅ | · |  |
| LK-03 | Lowercase id `demo-7719` opens the bill at the canonical URL | ✅ | ✅ | ✅ | · |  |
| LK-04 | Mixed case `DeMo-2048` opens the bill | ✅ | ✅ | ✅ | · |  |
| LK-05 | Leading and trailing spaces ` DEMO-3982 ` are accepted | ✅ | ✅ | ✅ | · |  |
| LK-06 | Empty submit shows the error and stays on the landing page | ✅ | ✅ | ✅ | · |  |
| LK-07 | Only spaces shows the error | ✅ | ✅ | ✅ | · |  |
| LK-08 | Emoji id shows the error, no crash | ✅ | ✅ | ✅ | · |  |
| LK-09 | 600-character id shows the error and does not break the layout | ✅ | ✅ | ✅ | · |  |
| LK-10 | The error disappears when the user types again | ✅ | ✅ | ✅ | · |  |
| LK-11 | "Try a sample property" opens a bill | ✅ | ✅ | ✅ | · |  |
| LK-12 | Pressing Enter in the field submits | ✅ | ✅ | ✅ | · |  |
| LK-13 | HTML typed into the field is never rendered as markup | ✅ | ✅ | ✅ | · |  |
| LK-14 | The field text is at least 16px so iOS does not zoom | ✅ | ✅ | ✅ | · |  |
| LK-15 | Sample cards are real links, focusable, Enter opens them, middle/ctrl-click does not break anything | ✅ | ✅ | ✅ | · |  |
| LK-16 | Landing text is visible in the first paint before JavaScript runs | ❌ | ✅ | ✅ | · |  |
| BL-01 | DEMO-2048 amount due equals the hand-computed value | ✅ | ✅ | ✅ | · |  |
| BL-02 | DEMO-7719 amount due equals the hand-computed value | ✅ | ✅ | ✅ | · |  |
| BL-03 | DEMO-3982 amount due equals the hand-computed value | ✅ | ✅ | ✅ | · |  |
| BL-04 | Missed-rebate banner appears only on DEMO-7719 and quotes the hand-computed saving | ✅ | ✅ | ✅ | · |  |
| BL-05 | Overdue banner appears only on DEMO-3982 and quotes the hand-computed penalty | ✅ | ✅ | ✅ | · |  |
| BL-06 | DEMO-2048 has neither banner | ✅ | ✅ | ✅ | · |  |
| BL-07 | Status badge text is right for each property | ✅ | ✅ | ✅ | · |  |
| BL-08 | Payment history has 4 rows, the first matches the headline amount, newest first, years descend | ✅ | ✅ | ✅ | · |  |
| BL-09 | Every rupee amount on the bill uses Indian grouping | ✅ | ✅ | ✅ | · |  |
| BL-10 | Bill period, issue date and due date are right and localised in Hindi | ✅ | ✅ | ✅ | · |  |
| BL-11 | The bill title shows the financial year from the data | ✅ | ✅ | ✅ | · |  |
| BD-01 | Every formula line (area, use, age, occupancy, annual tax) equals the hand-computed value, all three properties | ✅ | ✅ | ✅ | · |  |
| BD-02 | Rebate, penalty and total lines equal the hand-computed values and annual tax − rebates + penalty = amount due exactly | ✅ | ✅ | ✅ | · |  |
| BD-03 | The headline amount in the breakdown equals the bill summary | ✅ | ✅ | ✅ | · |  |
| BD-04 | Expanding a line sets aria-expanded and shows the detail; collapsing hides it | ✅ | ✅ | ✅ | · |  |
| BD-05 | Numbers quoted inside an expanded detail match the line's own amount | ✅ | ✅ | ✅ | · |  |
| BD-06 | "Already applied" and "Could save" rows match the hand-computed rebates | ✅ | ✅ | ✅ | · |  |
| BD-07 | Record fields (Khata, Survey, Ward, owner, guideline rate) match the data | ✅ | ✅ | ✅ | · |  |
| BD-08 | Rate, factor and age-depreciation percentages are shown correctly, no floating point noise like 0.8500000001 | ✅ | ✅ | ✅ | · |  |
| DP-01 | "Question this line" preselects that line, for each of the 8 disputable lines across properties | ✅ | ✅ | ✅ | · |  |
| DP-02 | Close, then open from a different line: the new line is selected | ✅ | ✅ | ✅ | · |  |
| DP-03 | The generic "Raise a dispute" button defaults to Annual property tax | ✅ | ✅ | ✅ | · |  |
| DP-04 | Submit shows a `DPT-<id4>-<YYMMDD>-XXXX` reference that is stable while the modal is open | ✅ | ✅ | ✅ | · |  |
| DP-05 | Two disputes get different references | ✅ | ✅ | ✅ | · |  |
| DP-06 | Text typed into the "What should be checked" box survives an EN/HI toggle | ❌ | ✅ | ✅ | · |  |
| DP-07 | Copy button works when the clipboard API exists | ✅ | ✅ | ✅ | · |  |
| DP-08 | Copy button does not claim "Copied" when the clipboard API is missing or rejects | ❌ | ✅ | ✅ | · |  |
| DP-09 | Escape closes the dispute modal | ❌ | ✅ | ✅ | · |  |
| DP-10 | Clicking the backdrop closes it; clicking inside does not | ✅ | ✅ | ✅ | · |  |
| DP-11 | Focus moves into the modal on open and returns to the trigger on close | ❌ | ✅ | ✅ | · |  |
| DP-12 | Reopening after a submission starts a fresh form | ✅ | ✅ | ✅ | · |  |
| DP-13 | The line list is localised in Hindi and the selection survives the toggle | ✅ | ✅ | ✅ | · |  |
| PY-01 | Each payment mode (UPI, Card, Net Banking) produces a receipt naming that mode | ✅ | ✅ | ✅ | · |  |
| PY-02 | Receipt shows reference, FY, property, amount, mode and an IST timestamp | ✅ | ✅ | ✅ | · |  |
| PY-03 | Receipt reference format `RCT-<id4>-<YYMMDD>-XXXX`, stable while open | ✅ | ✅ | ✅ | · |  |
| PY-04 | QR code is present, labelled with the reference, and decodes to exactly the receipt number | ✅ | ✅ | ✅ | · |  |
| PY-05 | Closing the receipt with X records the payment | ❌ | ✅ | ✅ | · |  |
| PY-06 | Escape on the receipt records the payment | ❌ | ✅ | ✅ | · | ✅ Also hand-driven in the in-app browser at a phone size: pay, press Escape on the receipt, the bill shows Paid (simulated) everywhere. |
| PY-07 | After paying, badge, amount label, history row, bottom bar and banners all agree | ✅ | ✅ | ✅ | · |  |
| PY-08 | Pay from the breakdown: lands on the bill in the paid state | ✅ | ✅ | ✅ | · |  |
| PY-09 | Breakdown after paying still shows the right numbers | ❌ | ✅ | ✅ | · |  |
| PY-10 | Opening another property after paying does not show it as paid | ✅ | ✅ | ✅ | · |  |
| PY-11 | Paying one property does not change the other's state; the paid amount equals that property's amount due | ✅ | ✅ | ✅ | · |  |
| PY-12 | Receipt references for two payments differ | ✅ | ✅ | ✅ | · |  |
| PY-13 | Cancelling the payment leaves the bill unpaid | ✅ | ✅ | ✅ | · |  |
| PY-14 | Refresh after paying: what happens | · | · | · | · | ✅ Hand-driven in the in-app browser: pay, then reload. The bill is unpaid again. Payments live in memory only. Product decision D1. |
| PY-15 | Same deep link open in two tabs, pay in one: the other stays unpaid and neither crashes | ✅ | ✅ | ✅ | · |  |
| PY-16 | Language toggle inside the payment modal and on the receipt changes text, keeps the receipt, reference and mode | ✅ | ✅ | ✅ | · |  |
| LG-01 | Toggle on landing, bill, breakdown, FAQ, terms, unknown-id landing | ✅ | ✅ | ✅ | · |  |
| LG-02 | Toggling with an open payment modal, open receipt, open dispute form and open confirmation does not close or reset anything | ✅ | ✅ | ✅ | · |  |
| LG-03 | An expanded breakdown line stays expanded after the toggle | ✅ | ✅ | ✅ | · |  |
| LG-04 | Hindi persists across refresh, deep link and a new tab | ✅ | ✅ | ✅ | · |  |
| LG-05 | With localStorage blocked the app still works in both languages | ✅ | ✅ | ✅ | · |  |
| LG-06 | No English left on any screen in Hindi except ids, numbers and the brand | ❌ | ✅ | ✅ | · |  |
| LG-07 | Dates, months, amounts and the receipt timestamp are well formed in both languages | ✅ | ✅ | ✅ | · |  |
| LG-08 | `<html lang>` follows the toggle | ✅ | ✅ | ✅ | · |  |
| LG-09 | Hindi at 320px: no overflow, no clipped buttons or pills | ✅ | ✅ | ✅ | · |  |
| LG-10 | How long a Hindi reader sees English on first paint | ✅ | ✅ | ✅ | · |  |
| RT-01 | `/bill/<id>` and `/bill/<id>/breakdown` return 200 for all three ids | ✅ | ✅ | ✅ | · |  |
| RT-02 | Lowercase and mixed-case ids redirect once to the canonical path | ✅ | ✅ | ✅ | · |  |
| RT-03 | Trailing slash redirects once | ❌ | ✅ | ✅ | · |  |
| RT-04 | URL-encoded id (`%44EMO-7719`) works | ✅ | ✅ | ✅ | · |  |
| RT-05 | Id with encoded spaces works | ✅ | ✅ | ✅ | · |  |
| RT-06 | Emoji id gives the not-found landing, status 200 | ✅ | ✅ | ✅ | · |  |
| RT-07 | 600- and 5000-character ids give the not-found landing, not a 5xx | ✅ | ✅ | ✅ | · |  |
| RT-08 | `/bill/DEMO-7719/breakdown/extra` | ✅ | ✅ | ✅ | · |  |
| RT-09 | `/bill/` and `/bill` go to the landing page | ❌ | ✅ | ✅ | · |  |
| RT-10 | `/bill//breakdown` | ✅ | ✅ | ✅ | · |  |
| RT-11 | `/bill/unknown` typed literally gives the not-found landing | ✅ | ✅ | ✅ | · |  |
| RT-12 | `/bill/DEMO-7719?foo=bar` works and keeps the query | ✅ | ✅ | ✅ | · |  |
| RT-13 | Double-encoded id (`%2544EMO-7719`) is handled without error | ✅ | ✅ | ✅ | · |  |
| RT-14 | Path traversal `/bill/..%2F..%2Fetc` and `/bill/%2e%2e/%2e%2e/etc` give not-found landing or 404, never file content or a 5xx | ✅ | ✅ | ✅ | · |  |
| RT-15 | Old links `/?id=demo-7719`, `/?id=DEMO-7719&view=breakdown`, `/?id=`, `/?view=breakdown`, `/?id=NOPE` | ✅ | ✅ | ✅ | · |  |
| RT-16 | No URL in the test set redirects more than once | ❌ | ✅ | ✅ | · |  |
| RT-17 | Refresh on landing, bill, breakdown, FAQ, terms keeps the same screen | · | · | · | · |  |
| RT-18 | `/bill/DEMO-7719/Breakdown`, `/BILL/DEMO-7719` and other case variants of the fixed segments | ✅ | ✅ | ✅ | · |  |
| RT-19 | An unknown route (`/nope`) shows a branded, translated not-found page with a way home | ✅ | ✅ | ✅ | · |  |
| NV-01 | Landing → bill → breakdown → bill → landing with in-app buttons, then browser forward | ❌ | ✅ | ✅ | · |  |
| NV-02 | The same path with browser back/forward only | ✅ | ✅ | ✅ | · |  |
| NV-03 | Header brand and "All properties" go to the landing page | ✅ | ✅ | ✅ | · |  |
| NV-04 | In-app Back after a cold deep link goes to the parent screen, not out of the site | ✅ | ✅ | ✅ | · |  |
| NV-05 | New screen starts at the top of the page | ✅ | ✅ | ✅ | · |  |
| NV-06 | Browser Back while a modal is open: no stuck modal on the previous screen | ✅ | ✅ | ✅ | · |  |
| NV-07 | FAQ and terms "Back" with and without history | ✅ | ✅ | ✅ | · |  |
| NV-08 | No full page reloads during in-app navigation | ✅ | ✅ | ✅ | · |  |
| FQ-01 | FAQ shows 8 questions and answers in both languages with no English leftovers | ✅ | ✅ | ✅ | · |  |
| FQ-02 | Terms page renders in both languages | ✅ | ✅ | ✅ | · |  |
| FQ-03 | The prototype disclosure is visible on landing, bill and breakdown, with JavaScript off for the deep-link screens | ✅ | ✅ | ✅ | · |  |
| FQ-04 | FAQ/terms/UI claims reviewed line by line against the code | · | · | · | · | ✅ Read every FAQ answer, the terms, the disclosure note and the receipt/dispute copy against the code. Two untrue statements found and fixed (BUG-04, BUG-15). Remaining open copy points are in the product decisions. |
| FQ-05 | README claims reviewed against the code | · | · | · | · | ✅ README read line by line. Two inaccuracies fixed (missing analytics event, 'no server APIs' without the middleware). |
| LY-01 | Widths 320, 360, 390, 768, 1024, 1366, 1920 × landing, unknown-id landing, bill ×3, breakdown ×3, FAQ, terms × both languages: no horizontal overflow, sticky header and bottom bar never cover content | ✅ | ✅ | ✅ | · |  |
| LY-02 | Phone landscape 640×360 and 844×390 | ✅ | ✅ | ✅ | · |  |
| LY-03 | Payment, receipt, dispute and confirmation modals at 568px tall: card scrolls, close button and primary button reachable | ✅ | ✅ | ✅ | · |  |
| LY-04 | Modals at 320×568 and in Hindi | ✅ | ✅ | ✅ | · |  |
| LY-05 | 200% zoom equivalent (683px wide desktop, 195px reflow) | ✅ | ✅ | ✅ | · |  |
| LY-06 | prefers-reduced-motion: content still appears | ✅ | ✅ | ✅ | · |  |
| LY-07 | OS dark mode: text stays readable | ✅ | ✅ | ✅ | · |  |
| LY-08 | The keyboard covering the dispute textarea on a real phone (not testable here, see report) | · | · | · | · | ❌ Not testable here: needs a real phone with its on-screen keyboard. |
| AX-01 | Keyboard-only run through landing → bill → breakdown → modal → receipt | ❌ | ✅ | ✅ | · |  |
| AX-02 | Visible focus indicator on every interactive element | ✅ | ✅ | ✅ | · |  |
| AX-03 | Escape closes every modal and focus returns to the trigger | ❌ | ✅ | ✅ | · |  |
| AX-04 | Modal exposes role=dialog with an accessible name; Tab does not leave it | ❌ | ✅ | ✅ | · |  |
| AX-05 | Icon-only buttons, the language toggle and expandable lines have accessible names; aria-expanded is correct | ❌ | ✅ | ✅ | · |  |
| AX-06 | axe-core finds no serious or critical violations on every screen in both languages | ❌ | ✅ | ✅ | · |  |
| AX-07 | Colour contrast of banners, badges and muted text meets WCAG AA, measured | ❌ | ✅ | ✅ | · |  |
| AX-08 | Tap targets are at least 24×24 CSS px | ✅ | ✅ | ✅ | · |  |
| RB-01 | JavaScript disabled: deep links show the bill and the disclosure; landing is readable | ✅ | ✅ | ✅ | · |  |
| RB-02 | Slow 3G + 6× CPU: no blank screen, no landing flash on deep links | ✅ | ✅ | ✅ | · | ✅ Hand-opened /bill/DEMO-3982 cold in the in-app browser at 375px: bill painted straight away, no landing page. |
| RB-03 | No console errors or React warnings in any screen, in dev and prod | ✅ | ✅ | ✅ | · |  |
| RB-04 | Analytics script blocked (ad blocker): the app works and shows no errors | ✅ | ✅ | ✅ | · |  |
| RB-05 | Two rapid clicks on Pay/Submit do not double-fire events or create two references | ✅ | ✅ | ✅ | · |  |
| RB-06 | Clipboard API unavailable | · | · | · | · |  |
| AN-01 | Each event fires exactly once per action, in prod and under dev strict mode | ✅ | ✅ | ✅ | · |  |
| AN-02 | Payloads contain only ids, line ids, modes, languages and sources: no free text, no references, no PII | ✅ | ✅ | ✅ | · |  |
| AN-03 | Deep link fires `property_opened` source `deeplink` once; browser back/forward fires nothing extra | ✅ | ✅ | ✅ | · |  |
| AN-04 | Typing in the dispute textarea never leaves the page (network capture) | ✅ | ✅ | ✅ | · |  |
| SH-01 | Title differs per screen where it should and is localised | ❌ | ✅ | ✅ | · |  |
| SH-02 | `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card` exist with absolute URLs | ❌ | ✅ | ✅ | · |  |
| SH-03 | The OG image URL returns an image of a sensible size | ❌ | ✅ | ✅ | · |  |
| SH-04 | Description is accurate | · | · | · | · | ✅ Descriptions read: accurate, say prototype and synthetic data. |
| SH-05 | Link preview on the Vercel preview URL (preview, if reachable) | · | · | · | · | ❌ Not run. The PR preview is behind Vercel login (HTTP 302 to vercel.com/sso-api) and I did not create a share link on your project without asking. |
| NM-01 | DEMO-2048: area ₹1,20,960 → ₹1,02,816 → tax ₹12,338 → rebates ₹1,234 + ₹617 → due ₹10,487 (hand check) | ✅ | ✅ | ✅ | · |  |
| NM-02 | DEMO-7719: area ₹1,58,976 → ₹1,51,027 → tax ₹18,123 → rebate ₹1,812 → due ₹16,311; unclaimed ₹2,718 (hand check) | ✅ | ✅ | ✅ | · |  |
| NM-03 | DEMO-3982: area ₹1,53,120 → ₹2,06,712 → ₹1,55,034 → tax ₹21,705 → penalty ₹1,085 → due ₹22,790 (hand check) | ✅ | ✅ | ✅ | · |  |
| NM-04 | Every rupee amount anywhere on every screen is in the set of expected amounts for that property | ✅ | ✅ | ✅ | · |  |
| WK-01 | Landing and the three deep links render with no console errors in WebKit on an iPhone profile | · | ✅ | ✅ | · |  |
| WK-02 | Full journey in WebKit: sample card → breakdown → expand → question → dispute → pay → receipt → paid, then Hindi | · | ✅ | ✅ | · |  |
| WK-03 | No horizontal overflow and the bottom bar clears the content on the bill and breakdown in WebKit, English and Hindi | · | ✅ | ✅ | · |  |
| DT-01 | Bill summary: the tag sits next to the amount, same line, reading "Demo data" / "डेमो डेटा", from the dictionary | · | ✅ | · | · |  |
| DT-02 | Breakdown header: the same | · | ✅ | · | · |  |
| DT-03 | The amount stays on one line, the tag does not overlap it and stays inside its panel | · | ✅ | · | · |  |
| DT-04 | The tag text meets WCAG AA contrast (4.5:1) against the tag's own background | · | ✅ | · | · |  |
| DT-05 | The tag is still there in the paid state | · | ✅ | · | · |  |
| DT-06 | A screenshot cropped to the amount panel alone shows the tag (picture saved in `screenshots/demo-tag/`) | · | ✅ | · | · |  |
