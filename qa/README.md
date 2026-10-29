# QA suite

Everything the QA pass used. Not part of the app: it is excluded from `npm run lint` and needs Playwright, which is not an app dependency.

```bash
npm run build && npx next start -p 3102 &
export PLAYWRIGHT_PATH=/path/to/node_modules/playwright   # any installed Playwright with Chromium and WebKit
export QA_TOOLS=/path/to/folder/with/node_modules/jsqr-and-pngjs   # optional: decodes the receipt QR code
node qa/suite.cjs http://localhost:3102 prod-local          # all sections
node qa/suite.cjs http://localhost:3102 prod-local --only=routing,bill
node qa/report.cjs                                          # pass/fail table from qa/results/*.json
```

- `TEST_PLAN.md`: what is tested and why, written before testing.
- `QA_REPORT.md`: results, bugs, fixes, product decisions.
- `expected.cjs`: independent expected amounts (exact fractions, from `properties.json`).
- `sections/*.cjs`: the cases, one file per area. `lib.cjs`: helpers.
- `evidence.cjs`: makes the before/after pictures. Screenshots and `evidence/` are kept locally and git-ignored.
- `results/`: JSON results (`prod-local-baseline` is the build before the fixes).
