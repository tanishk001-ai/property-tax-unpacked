# QA test plan: Unpacked (property-tax-unpacked)

Written before any testing, after reading the code but without running it. The
goal is to break the app before it is linked from a public LinkedIn post.

Personas used to think of cases:

- **Confused citizen** types things the way they appear on paper (lowercase, with spaces, the wrong ID).
- **Impatient phone user** taps twice, taps back mid-animation, rotates the phone, has a slow connection.
- **Hindi-only reader** never sees English except IDs, numbers and the brand, and needs every number to make sense.
- **Recruiter on a LinkedIn link** opens a deep link cold, on a phone, inside an in-app browser, probably once, and judges in about ten seconds.
- **Someone trying to break it** hostile URLs, huge input, double submits, blocked storage, blocked scripts.

Case ids look like `LK-03`. Each case is run automatically (`auto`, in `qa/suite.cjs`) or by hand-driving the browser (`manual`). Results live in `qa/QA_REPORT.md`.

Environments: **prod-local** = `next build && next start` on this machine; **dev** = `next dev` (React strict mode); **preview** = the PR's Vercel preview, when reachable.

---

## 1. Landing and property lookup

**Expects:** a clear page, a field for a property ID, three sample cards, a visible disclosure that this is a prototype. Typing an ID in any reasonable way finds the bill. A wrong ID gets a kind message, never a blank page or a crash.

**Could go wrong:** case/space handling, empty submit, very long or hostile input, error message that never clears, input font under 16px (iOS zooms the page on focus), landing text invisible until JavaScript loads, sample cards not real links.

- **LK-01** Landing renders title, field, 3 sample cards and the prototype note with no console errors (auto)
- **LK-02** Uppercase valid id opens the bill (auto)
- **LK-03** Lowercase id `demo-7719` opens the bill at the canonical URL (auto)
- **LK-04** Mixed case `DeMo-2048` opens the bill (auto)
- **LK-05** Leading and trailing spaces ` DEMO-3982 ` are accepted (auto)
- **LK-06** Empty submit shows the error and stays on the landing page (auto)
- **LK-07** Only spaces shows the error (auto)
- **LK-08** Emoji id shows the error, no crash (auto)
- **LK-09** 600-character id shows the error and does not break the layout (auto)
- **LK-10** The error disappears when the user types again (auto)
- **LK-11** "Try a sample property" opens a bill (auto)
- **LK-12** Pressing Enter in the field submits (auto)
- **LK-13** HTML typed into the field is never rendered as markup (auto)
- **LK-14** The field text is at least 16px so iOS does not zoom (auto)
- **LK-15** Sample cards are real links, focusable, Enter opens them, middle/ctrl-click does not break anything (auto)
- **LK-16** Landing text is visible in the first paint before JavaScript runs (auto, JS off and throttled)

## 2. The three sample bills and bill summary

**Expects:** the amount due, the due date, the property address, a status badge, a payment history, the right banner for the right property and nothing else.

**Could go wrong:** wrong amount, banner on the wrong property, wrong badge, a date in the wrong language, ₹ formatting off, history row inconsistent with the headline amount.

- **BL-01** DEMO-2048 amount due equals the hand-computed value (auto)
- **BL-02** DEMO-7719 amount due equals the hand-computed value (auto)
- **BL-03** DEMO-3982 amount due equals the hand-computed value (auto)
- **BL-04** Missed-rebate banner appears only on DEMO-7719 and quotes the hand-computed saving (auto)
- **BL-05** Overdue banner appears only on DEMO-3982 and quotes the hand-computed penalty (auto)
- **BL-06** DEMO-2048 has neither banner (auto)
- **BL-07** Status badge text is right for each property (auto)
- **BL-08** Payment history has 4 rows, the first matches the headline amount, newest first, years descend (auto)
- **BL-09** Every rupee amount on the bill uses Indian grouping (auto)
- **BL-10** Bill period, issue date and due date are right and localised in Hindi (auto)
- **BL-11** The bill title shows the financial year from the data (auto)

## 3. "Why this amount?" breakdown

**Expects:** every number can be reproduced by hand; the lines visibly add up; expanding a line explains it; the record details are shown.

**Could go wrong:** off-by-one rounding, a factor shown differently from how it is applied, text that quotes a different number to the line, two lines open at once, aria-expanded wrong, a Hindi string that still says English.

- **BD-01** Every formula line (area, use, age, occupancy, annual tax) equals the hand-computed value, all three properties (auto)
- **BD-02** Rebate, penalty and total lines equal the hand-computed values and annual tax − rebates + penalty = amount due exactly (auto)
- **BD-03** The headline amount in the breakdown equals the bill summary (auto)
- **BD-04** Expanding a line sets aria-expanded and shows the detail; collapsing hides it (auto)
- **BD-05** Numbers quoted inside an expanded detail match the line's own amount (auto)
- **BD-06** "Already applied" and "Could save" rows match the hand-computed rebates (auto)
- **BD-07** Record fields (Khata, Survey, Ward, owner, guideline rate) match the data (auto)
- **BD-08** Rate, factor and age-depreciation percentages are shown correctly, no floating point noise like 0.8500000001 (auto)

## 4. "Question this line", dispute modal and confirmation

**Expects:** the line you tapped is the line that is pre-selected, every time. Submitting gives a reference that is different every time. Closing and reopening starts clean.

**Could go wrong:** stale preselection, typed text lost when the language changes, reference reused, "Copied" shown when copy actually failed, Escape does nothing, focus lost.

- **DP-01** "Question this line" preselects that line, for each of the 8 disputable lines across properties (auto)
- **DP-02** Close, then open from a different line: the new line is selected (auto)
- **DP-03** The generic "Raise a dispute" button defaults to Annual property tax (auto)
- **DP-04** Submit shows a `DPT-<id4>-<YYMMDD>-XXXX` reference that is stable while the modal is open (auto)
- **DP-05** Two disputes get different references (auto)
- **DP-06** Text typed into the "What should be checked" box survives an EN/HI toggle (auto)
- **DP-07** Copy button works when the clipboard API exists (auto)
- **DP-08** Copy button does not claim "Copied" when the clipboard API is missing or rejects (auto)
- **DP-09** Escape closes the dispute modal (auto)
- **DP-10** Clicking the backdrop closes it; clicking inside does not (auto)
- **DP-11** Focus moves into the modal on open and returns to the trigger on close (auto)
- **DP-12** Reopening after a submission starts a fresh form (auto)
- **DP-13** The line list is localised in Hindi and the selection survives the toggle (auto)

## 5. Simulated payment and receipt

**Expects:** it is obviously a simulation. After paying, the bill says so in every place that shows state. The receipt has a QR and a unique reference.

**Could go wrong:** paying, then closing the receipt with the X (or Escape) loses the payment; paid state leaks to another property; badge, history row, amount label and bottom bar disagree; refresh wipes it; two payments share a reference.

- **PY-01** Each payment mode (UPI, Card, Net Banking) produces a receipt naming that mode (auto)
- **PY-02** Receipt shows reference, FY, property, amount, mode and an IST timestamp (auto)
- **PY-03** Receipt reference format `RCT-<id4>-<YYMMDD>-XXXX`, stable while open (auto)
- **PY-04** QR code is present, labelled with the reference, and decodes to exactly the receipt number (auto; decoded with jsqr, which is not an app dependency)
- **PY-05** Closing the receipt with X records the payment (auto)
- **PY-06** Escape on the receipt records the payment (auto)
- **PY-07** After paying, badge, amount label, history row, bottom bar and banners all agree (auto)
- **PY-08** Pay from the breakdown: lands on the bill in the paid state (auto)
- **PY-09** Breakdown after paying still shows the right numbers (auto)
- **PY-10** Opening another property after paying does not show it as paid (auto)
- **PY-11** Paying one property does not change the other's state; the paid amount equals that property's amount due (auto)
- **PY-12** Receipt references for two payments differ (auto)
- **PY-13** Cancelling the payment leaves the bill unpaid (auto)
- **PY-14** Refresh after paying: what happens (manual, product decision)
- **PY-15** Same deep link open in two tabs, pay in one: the other stays unpaid and neither crashes (auto)
- **PY-16** Language toggle inside the payment modal and on the receipt changes text, keeps the receipt, reference and mode (auto)

## 6. EN/HI toggle and persistence

**Expects:** one tap switches everything; nothing resets; the choice survives refresh, deep links, new tabs.

**Could go wrong:** a modal closes, an expanded line collapses, typed text lost, English leftovers in Hindi, a flash of English on load, a crash when storage is blocked, long Hindi strings overflowing at 320px.

- **LG-01** Toggle on landing, bill, breakdown, FAQ, terms, unknown-id landing (auto)
- **LG-02** Toggling with an open payment modal, open receipt, open dispute form and open confirmation does not close or reset anything (auto)
- **LG-03** An expanded breakdown line stays expanded after the toggle (auto)
- **LG-04** Hindi persists across refresh, deep link and a new tab (auto)
- **LG-05** With localStorage blocked the app still works in both languages (auto)
- **LG-06** No English left on any screen in Hindi except ids, numbers and the brand (auto)
- **LG-07** Dates, months, amounts and the receipt timestamp are well formed in both languages (auto)
- **LG-08** `<html lang>` follows the toggle (auto)
- **LG-09** Hindi at 320px: no overflow, no clipped buttons or pills (auto)
- **LG-10** How long a Hindi reader sees English on first paint (auto, measured, reported)

## 7. Deep links, redirects, back/forward, not-found

**Expects:** every link a person could plausibly have works with at most one redirect; junk URLs land somewhere sensible.

**Could go wrong:** redirect chains and loops, double encoding, 500s, a default English 404 page, refresh going somewhere else, back going to a wrong screen.

- **RT-01** `/bill/<id>` and `/bill/<id>/breakdown` return 200 for all three ids (auto)
- **RT-02** Lowercase and mixed-case ids redirect once to the canonical path (auto)
- **RT-03** Trailing slash redirects once (auto)
- **RT-04** URL-encoded id (`%44EMO-7719`) works (auto)
- **RT-05** Id with encoded spaces works (auto)
- **RT-06** Emoji id gives the not-found landing, status 200 (auto)
- **RT-07** 600- and 5000-character ids give the not-found landing, not a 5xx (auto)
- **RT-08** `/bill/DEMO-7719/breakdown/extra` (auto, see report for the result)
- **RT-09** `/bill/` and `/bill` go to the landing page (auto)
- **RT-10** `/bill//breakdown` (auto)
- **RT-11** `/bill/unknown` typed literally gives the not-found landing (auto)
- **RT-12** `/bill/DEMO-7719?foo=bar` works and keeps the query (auto)
- **RT-13** Double-encoded id (`%2544EMO-7719`) is handled without error (auto)
- **RT-14** Path traversal `/bill/..%2F..%2Fetc` and `/bill/%2e%2e/%2e%2e/etc` give not-found landing or 404, never file content or a 5xx (auto)
- **RT-15** Old links `/?id=demo-7719`, `/?id=DEMO-7719&view=breakdown`, `/?id=`, `/?view=breakdown`, `/?id=NOPE` (auto)
- **RT-16** No URL in the test set redirects more than once (auto)
- **RT-17** Refresh on landing, bill, breakdown, FAQ, terms keeps the same screen (auto)
- **RT-18** `/bill/DEMO-7719/Breakdown`, `/BILL/DEMO-7719` and other case variants of the fixed segments (auto)
- **RT-19** An unknown route (`/nope`) shows a branded, translated not-found page with a way home (auto)
- **NV-01** Landing → bill → breakdown → bill → landing with in-app buttons, then browser forward (auto)
- **NV-02** The same path with browser back/forward only (auto)
- **NV-03** Header brand and "All properties" go to the landing page (auto)
- **NV-04** In-app Back after a cold deep link goes to the parent screen, not out of the site (auto)
- **NV-05** New screen starts at the top of the page (auto)
- **NV-06** Browser Back while a modal is open: no stuck modal on the previous screen (auto)
- **NV-07** FAQ and terms "Back" with and without history (auto)
- **NV-08** No full page reloads during in-app navigation (auto)

## 8. FAQ, terms, prototype disclosures

**Expects:** every claim is true for the current code; the prototype disclosure is visible on every screen.

**Could go wrong:** the terms say nothing is collected but analytics is; "published" values that are made up; a claim about a city or cess the code does not do.

- **FQ-01** FAQ shows 8 questions and answers in both languages with no English leftovers (auto)
- **FQ-02** Terms page renders in both languages (auto)
- **FQ-03** The prototype disclosure is visible on landing, bill and breakdown, with JavaScript off for the deep-link screens (auto)
- **FQ-04** FAQ/terms/UI claims reviewed line by line against the code (manual, see report)
- **FQ-05** README claims reviewed against the code (manual)

## 9. Layout and devices

**Expects:** usable on a 320px phone and a 1920px monitor; sticky bars never hide a button or the last line.

- **LY-01** Widths 320, 360, 390, 768, 1024, 1366, 1920 × landing, unknown-id landing, bill ×3, breakdown ×3, FAQ, terms × both languages: no horizontal overflow, sticky header and bottom bar never cover content (auto)
- **LY-02** Phone landscape 640×360 and 844×390 (auto)
- **LY-03** Payment, receipt, dispute and confirmation modals at 568px tall: card scrolls, close button and primary button reachable (auto)
- **LY-04** Modals at 320×568 and in Hindi (auto)
- **LY-05** 200% zoom equivalent (683px wide desktop, 195px reflow) (auto)
- **LY-06** prefers-reduced-motion: content still appears (auto)
- **LY-07** OS dark mode: text stays readable (auto + manual screenshot)
- **LY-08** The keyboard covering the dispute textarea on a real phone (not testable here, see report)

## 10. Accessibility

- **AX-01** Keyboard-only run through landing → bill → breakdown → modal → receipt (auto)
- **AX-02** Visible focus indicator on every interactive element (auto)
- **AX-03** Escape closes every modal and focus returns to the trigger (auto)
- **AX-04** Modal exposes role=dialog with an accessible name; Tab does not leave it (auto)
- **AX-05** Icon-only buttons, the language toggle and expandable lines have accessible names; aria-expanded is correct (auto)
- **AX-06** axe-core finds no serious or critical violations on every screen in both languages (auto)
- **AX-07** Colour contrast of banners, badges and muted text meets WCAG AA, measured (auto)
- **AX-08** Tap targets are at least 24×24 CSS px (auto)

## 11. Robustness and honesty

- **RB-01** JavaScript disabled: deep links show the bill and the disclosure; landing is readable (auto)
- **RB-02** Slow 3G + 6× CPU: no blank screen, no landing flash on deep links (auto)
- **RB-03** No console errors or React warnings in any screen, in dev and prod (auto)
- **RB-04** Analytics script blocked (ad blocker): the app works and shows no errors (auto)
- **RB-05** Two rapid clicks on Pay/Submit do not double-fire events or create two references (auto)
- **RB-06** Clipboard API unavailable (auto, see DP-08)

## 12. Analytics

- **AN-01** Each event fires exactly once per action, in prod and under dev strict mode (auto)
- **AN-02** Payloads contain only ids, line ids, modes, languages and sources: no free text, no references, no PII (auto)
- **AN-03** Deep link fires `property_opened` source `deeplink` once; browser back/forward fires nothing extra (auto)
- **AN-04** Typing in the dispute textarea never leaves the page (network capture) (auto)

## 13. Page titles and link previews

- **SH-01** Title differs per screen where it should and is localised (auto)
- **SH-02** `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card` exist with absolute URLs (auto)
- **SH-03** The OG image URL returns an image of a sensible size (auto)
- **SH-04** Description is accurate (manual)
- **SH-05** Link preview on the Vercel preview URL (preview, if reachable)

## 14. Numbers (cross-cutting)

All expected values are computed independently in `qa/expected.cjs` from `app/data/properties.json` with a re-implementation of the formula written from the on-screen description (area × unit-area value × 12 months, × use × age × occupancy, × tax rate, rounded half-up; rebates each rounded; penalty = (tax − rebates) × rate × months, rounded). They are not read from the app's own `calc()`.

- **NM-01** DEMO-2048: area ₹1,20,960 → ₹1,02,816 → tax ₹12,338 → rebates ₹1,234 + ₹617 → due ₹10,487 (hand check)
- **NM-02** DEMO-7719: area ₹1,58,976 → ₹1,51,027 → tax ₹18,123 → rebate ₹1,812 → due ₹16,311; unclaimed ₹2,718 (hand check)
- **NM-03** DEMO-3982: area ₹1,53,120 → ₹2,06,712 → ₹1,55,034 → tax ₹21,705 → penalty ₹1,085 → due ₹22,790 (hand check)
- **NM-04** Every rupee amount anywhere on every screen is in the set of expected amounts for that property (auto, whole-page scan)

## 15. Safari engine smoke test (added while testing)

Chromium is not what an iPhone runs. Playwright's WebKit with the iPhone 13 profile is the closest available stand-in; it is not a real device and not the LinkedIn in-app browser.

- **WK-01** Landing and the three deep links render with no console errors in WebKit on an iPhone profile (auto)
- **WK-02** Full journey in WebKit: sample card → breakdown → expand → question → dispute → pay → receipt → paid, then Hindi (auto)
- **WK-03** No horizontal overflow and the bottom bar clears the content on the bill and breakdown in WebKit, English and Hindi (auto)

## 16. "Demo data" tag (added with the tag)

A cropped screenshot of a bill must never pass as a real one, so every headline amount carries a tag.

- **DT-01** Bill summary: the tag sits next to the amount, same line, reading "Demo data" / "डेमो डेटा", from the dictionary (auto, 320 and 1366 px, both languages, all three properties)
- **DT-02** Breakdown header: the same (auto)
- **DT-03** The amount stays on one line, the tag does not overlap it and stays inside its panel (auto)
- **DT-04** The tag text meets WCAG AA contrast (4.5:1) against the tag's own background (auto)
- **DT-05** The tag is still there in the paid state (auto)
- **DT-06** A screenshot cropped to the amount panel alone shows the tag (picture saved in `screenshots/demo-tag/`)
