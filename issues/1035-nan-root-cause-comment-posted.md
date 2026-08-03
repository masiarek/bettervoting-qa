# #1035 — NaN root cause posted 2026-08-02

**Posted:** [Equal-Vote/bettervoting#1035 comment](https://github.com/Equal-Vote/bettervoting/issues/1035#issuecomment-5166192037)

Root cause for the `NaN%` in the STAR runoff display, plus the case for it not being "low priority".

## What the comment adds

The original report (BV200, election `tk476h`) framed this as an artefact of "3 voters, 3 ties, 3 same preferences", and labelled it low priority with *"not sure if this must be considered as an error / problem"*.

It isn't about ties in the scoring round at all. The condition is **`finalistVotes == 0`** — every counted ballot rates the two finalists equally — and the scoring round can look completely ordinary. Verified by execution against `Star()` on `main`:

| Ballots | nTallyVotes | finalists preferredOver | finalistVotes |
|---|---|---|---|
| `{A:5,B:5,C:0}` × 3 | 3 | 0, 0 | **0** |
| `{A:5,B:5,C:1}`, `{A:4,B:4,C:0}`, `{A:3,B:3,C:2}` | 3 | 0, 0 | **0** |

Neither set contains an abstention, so `Results.tsx:485` doesn't short-circuit and the widget renders with a zero denominator.

Two division sites, both from that zero:

- `STARDetailedResults.tsx:69` — `formatPercent(c.runoffVotes / finalistVotes)`
- `ResultsPieChart.tsx:41` via `STARResultSummaryWidget.tsx:50-53` — recharts `percent = value / total`

The neighbouring `noPreferencePercentage` footnote is already guarded at `STARResultSummaryWidget.tsx:54-56`; these two just lack the equivalent.

## Framing

Kept to root cause + fix. The #884 connection appears only as a closing note about **sequencing** — that today's abstention rule *narrows* this bug by short-circuiting all-flat elections, so fixing this first de-risks any future change there. No policy argument, no ask to revisit #884.

This is the R2 prerequisite from [`../analysis/flat-scores-abstention/04-options.md`](../analysis/flat-scores-abstention/04-options.md).

## Provenance

| Claim | How established |
|---|---|
| Both ballot sets give `finalistVotes = 0` with `nTallyVotes = 3` | **executed** — `probe/nan-repro.ts` against real `Star()` |
| The two division sites | read from source at `8d2b3f9` |
| `NaN%` renders in the browser | **not verified in a browser** — read from recharts semantics. Corroborated by the screenshot in the issue itself, which shows `NaN` in production |

## Not claimed

No live repro election was built for this one. The issue already carries a production screenshot of the symptom, so the new information is the mechanism, not the existence.
