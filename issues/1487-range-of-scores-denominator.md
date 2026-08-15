# #1487 — the Range of Scores chart divides by a number the page never prints

**Fixed in [Equal-Vote/bettervoting#1516](https://github.com/Equal-Vote/bettervoting/pull/1516)** (2026-08-15). Issue: [#1487](https://github.com/Equal-Vote/bettervoting/issues/1487), filed 2026-08-06.

## The finding

On a race with flat ballots the headline and the **Range of Scores** chart divide by different numbers, and only the headline's is ever shown:

| Panel | Number | Denominator |
|---|---|---|
| Headline | "1 voters" | `nTallyVotes` = 1 (flat ballots removed) |
| Stats for Nerds → Range of Scores | 33% / 67% | **3** — every non-blank ballot |

The tall 67% bar is composed entirely of ballots the same page has already declared abstentions, and the number **3** appears nowhere for the reader to divide by.

Mirror image of #1390 / #1431, which had a chart that *dropped* ballots the tabulator counted. This one *keeps* ballots the tabulator dropped. Same family as [#1117](1117-sandbox-score-range.md): a number computed over a ballot set that was quietly changed.

## Why the denominator was left alone

The chart's denominator is arguably the right one for its question. *"Did voters use the full 0–5 range?"* is a question about ballots **as marked**, and a flat ballot is the most extreme case of not using the range — excluding it would bias the answer toward "yes". The defect is that the denominator is invisible, not that it is wrong. So the fix prints it:

- subtitle carries the count — *"…on ballots (10 ballots)"*
- and when that count differs from `nTallyVotes`, one line names the gap, rendering **only** when they differ.

## Left open deliberately

The issue's third action item — auditing the other Stats for Nerds widgets (Column Distribution, Average Supporter Profile, Name Recognition, Head-to-Head), which all read the same `ballotsForRace()` helper — is not in the PR. Each asks a different question, so the right denominator is not one answer, and settling four of them inside a labelling change would bury the reasoning.

## Provenance

| Claim | How established |
|---|---|
| The two denominators | read from `ScoreRangeWidget.tsx` and `AnonymizedBallotsContextProvider.tsx` |
| The live 33/67 example | from the issue, against `hckrf7` |
| The fix renders "(10 ballots)" and the 2-abstention note | **executed** — 10-ballot STAR election seeded locally, 2 of them flat; headline "8 voters", chart "(10 ballots)" |
| The panel is behind `ALL_STATS` | read from `Results.tsx`, and reproduced by setting the flag override |
