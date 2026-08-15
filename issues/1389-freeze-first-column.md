# #1389 — the RCV detailed table loses its candidate column when scrolled

**Fixed in [Equal-Vote/bettervoting#1523](https://github.com/Equal-Vote/bettervoting/pull/1523)** (2026-08-15). Issue: [#1389](https://github.com/Equal-Vote/bettervoting/issues/1389).

## The finding

`ResultsTable` renders inside an MUI `TableContainer`, which scrolls horizontally. An RCV table is one column per round plus the candidate name, at `minWidth` 75px and 125px — so a field big enough to need many rounds is wider than its box, and scrolling right leaves a wall of numbers with no row labels.

Not RCV-only. STAR-PR has the same round-per-column shape, and at a phone width even the three-column tables scroll.

## What the fix does, and the two traps in it

The first column becomes `position: sticky; left: 0`. Two things that a naive version gets wrong:

**1. The opaque background.** A sticky cell with a transparent background lets the scrolling columns show through it. The obvious `background: var(--brand-white)` is wrong here: `--brand-white` is a literal `#FFFFFF`, and the app has a working dark theme (`theme.tsx`, `palette.mode: 'dark'`) behind the `THEMES` flag — every row would be forced white under light text. The fix inherits the background down the chain from the surrounding `Paper`, which is themed. That is why `TableContainer` also takes `background: inherit`: it is the first link, and without it the chain resolves to `transparent` and the frozen column is see-through.

**2. The highlighted rows.** `.starScoreTable`, `.starRunoffTable` and `.chooseOneTable` paint row backgrounds at specificity (0,2,2); the sticky rule is (0,2,1), so the highlight wins on the frozen cell and the winner's gold runs behind the frozen name rather than being cut off at the column edge.

## Known limit

`position: sticky` on a `border-collapse: collapse` table can drop the border at the frozen seam in some engines. Verified clean in **Chromium**; not checked in Firefox or Safari. Flagged in the PR rather than papered over — switching to `border-collapse: separate` would change every border on every results table.

## Provenance

| Claim | How established |
|---|---|
| The table scrolls and the names leave | **executed** — 16-candidate, 11-round RCV election seeded locally, screenshotted before and after |
| Sticky applies, with an opaque background | **executed** — computed styles read from the frozen cells: `position: sticky`, gold on the winning row, Paper white elsewhere |
| `--brand-white` is a literal and the dark theme is real | read from `index.css:29` and `theme.tsx:247-253, 271-276` |
| Specificity (0,2,2) beats (0,2,1) | computed by hand, then confirmed against the rendered background |
| Seven call sites share the component | grep of `.resultTable` / `ResultsTable` |
| Firefox / Safari behaviour | **not verified** — no binary installed locally |
