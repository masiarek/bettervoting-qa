# #1166 — Ranked Robin multiwinner results highlight only one winner

**Verdict: REPRODUCES on production, 2026-08-04. Not fixed, no PR open, no linked branch.**

Upstream: [Equal-Vote/bettervoting#1166](https://github.com/Equal-Vote/bettervoting/issues/1166) — open, `good first issue`, `Complexity: Small`, `Role: Front End`, milestone 8-0. Reported by @mikefranze 2025-12-12.

Checked against upstream `main` @ `15289d30` (2026-08-03) and against the reporter's own poll, [`qq6qkp`](https://bettervoting.com/qq6qkp/results). The defect is one hard-coded `1` in each of two call sites, plus the same omission in a second method the issue doesn't mention.

## It still reproduces

Live page text, fetched 2026-08-04:

```
⭐ Baldur's Gate, Dragon Age, and Mass Effect and/or KOTOR win! ⭐
26 voters
...
Head-to-head wins
⭐ Baldur's Gate
Dragon Age
Mass Effectand/or KOTOR
Fallout
```

The heading names three winners. The chart stars one. The detailed table gold-highlights one row (the reporter's second screenshot; not re-shot here — the source below makes it deterministic).

The race is `RankedRobin`, `num_winners: 3`, 10 candidates, 26 voters. Confirmed via `GET /API/ElectionResult/qq6qkp`, which returns `elected` = `["Baldur's Gate", "Dragon Age", "Mass Effect and/or KOTOR"]`.

## Root cause

Two literals in `packages/frontend/src/components/Election/Results/Results.tsx`, inside `RankedRobinResultsViewer`:

| Line | Code | Effect |
|---|---|---|
| 84 | `stars={1}` | `ResultsBarChart` prefixes `"⭐ "` to the first *n* entries; `n` is pinned at 1 |
| 92 | `<ResultsTable className='rankedRobinTable' data={…}/>` | `winningRows` not passed, so it takes its default |

The two components that consume them:

- `components/ResultsBarChart.tsx:57` — `name: ((i < stars || d['star']) ? "⭐ " : "") + truncName(…)`
- `components/ResultsTable.tsx:9,34` — `winningRows=1` by default; `style={i < winningRows ? winningStyle : {}}`

Neither component is at fault. Both already accept a count, and the bar chart additionally accepts a per-row `star` flag. The viewer just never tells them how many winners there are.

## The reporter's guess, corrected

> "My guess is that the tables were designed for star multi-winner where we highlight each winner at each stage."

Half right, and the other half is what makes this a five-minute fix. STAR multi-winner *does* take a different path — `WinnerResultPages` renders one `STARResultSummaryWidget` per round, so it never needs a winner count in the table. But **Approval** is a bloc method that goes through these very same two components, and it already does the right thing:

```tsx
// ApprovalResultsViewer — Results.tsx:224, 234
stars={race.num_winners}
<ResultsTable winningRows={race.num_winners} data={[ … ]}/>
```

So this isn't a design mismatch to be worked around. It's an omission in one viewer, with the corrected sibling sitting 140 lines below it in the same file.

## Second, unreported instance: Plurality

`PluralityResultsViewer` (same file, lines 187 and 196) has **exactly the same two omissions** — `stars={1}` and a bare `ResultsTable`.

It is reachable. `VotingMethodSelector.tsx` offers the bloc family (`num_winners ≥ 2`) STAR, Ranked Robin and Approval up front, plus Plurality and IRV under *More Options*; and `Plurality.ts` runs through `runBlocTabulator` with `nWinners`, so a multi-winner Choose One race tabulates and elects *N* candidates. Its results page will star one of them.

Worth folding into the same PR — it's the identical two-line change, and splitting it means a second round of review for a defect already understood.

### Not affected

| Viewer | Why it's fine |
|---|---|
| STAR | `WinnerResultPages` — one summary widget per round |
| IRV / STV | `IRV/top.tsx` renders one `IRVWinnerView` per winner search, so `stars={1}` inside each is correct |
| STAR_PR | Already identity-based: `star: winIndex(…) < page` (line 338) |
| Approval | Already passes `race.num_winners` |

## Proposed patch

Scoped to the reported bug and its twin. Four one-line edits plus two destructuring changes.

```diff
 function RankedRobinResultsViewer() {
   let {results} = useRace();
-  const {t} = useRace();
+  const {race, t} = useRace();
@@
-          stars={1}
+          stars={race.num_winners}
@@
-          <ResultsTable className='rankedRobinTable' data={[
+          <ResultsTable className='rankedRobinTable' winningRows={race.num_winners} data={[

 function PluralityResultsViewer() {
   const { results } = useRace();
-  const { t } = useRace();
+  const { race, t } = useRace();
@@
-          stars={1}
+          stars={race.num_winners}
@@
-          <ResultsTable className='chooseOneTable' data={[
+          <ResultsTable className='chooseOneTable' winningRows={race.num_winners} data={[
```

`race` is already on the race context and is destructured this way by `ApprovalResultsViewer` and `STARResultsViewer`. No component signature changes, no new props, no backend change.

## What this patch does *not* fix — and shouldn't, here

Highlighting by **position** (first *N* rows) is not the same as highlighting the **elected** candidates, and in Ranked Robin the two can come apart.

- `summaryData.candidates` is sorted **once, up front** — `getSummaryData(…, 'copelandScore', …)` → `sortCandidates` orders by `copelandScore` descending, then by `tieBreakOrder` ascending. Ranked Robin passes no `evaluate` callback to `runBlocTabulator`, so this array is never re-sorted into round-win order.
- `elected` is built **round by round**. `singleWinnerRankedRobin`'s second tiebreak rung is **head-to-head**: on an exact two-way Copeland tie with a decisive pairwise, the pairwise winner is elected — and that rung ignores `tieBreakOrder` entirely.

`tieBreakOrder` is a seeded shuffle keyed on ballot count and race id, so it carries no information about who beat whom. When a Copeland tie **straddles the winner cutoff**, the two mechanisms agree about half the time.

This is not hypothetical, and the reported poll is the proof: round 1 of `qq6qkp` was decided on exactly that rung.

```
round 0: Baldur's Gate wins round with highest number of wins.
round 1: Dragon Age preferred over Mass Effect and/or KOTOR in runoff.   ← 7.5 – 7.5 Copeland tie
round 2: Mass Effect and/or KOTOR wins round with highest number of wins.
```

Here it happens to be invisible twice over: Dragon Age also sorts first (`tieBreakOrder` 0 vs 3), and at `num_winners: 3` both tied candidates are elected anyway. Set that same race to **2** winners and had the pairwise gone the other way, the heading would read *"Mass Effect and/or KOTOR"* while the gold row and the second star sat on *Dragon Age*.

The chart half of that is nearly free — pass `star: elected.has(c.id)` per datum, which `ResultsBarChart` already supports and `STARPRResultsViewer` already uses. The table half needs one new prop on `ResultsTable` (an index set alongside the existing count), which makes it an API change to a component shared by six viewers.

**Recommendation:** ship the positional fix as #1166 — it is what the issue reports, it matches the `Complexity: Small` label, and it is strictly better than today. Raise the position-vs-identity mismatch as its own issue; it affects Approval too, i.e. the viewer currently considered correct.

## Verification

The reported poll can't be re-tabulated with different settings, so a fresh election is needed to see the fix.

| # | Setup | Expected after fix |
|---|---|---|
| 1 | Ranked Robin, 3 winners, ~5 candidates, no ties | 3 stars in the chart, 3 gold rows in the table, matching the heading |
| 2 | Ranked Robin, 1 winner | Unchanged from today — 1 star, 1 gold row |
| 3 | Choose One, 2 winners | 2 stars, 2 gold rows |
| 4 | Approval, 3 winners | Unchanged — regression guard on the viewer that was already right |
| 5 | STAR, 3 winners | Unchanged — per-round pages, not this path |
| 6 | Ranked Robin, 2 winners, ballots giving a 2-way Copeland tie for 2nd | **Known to still mis-highlight** ~half the time. Record it; it belongs to the follow-up issue, not this PR |

Case 6 is buildable from this repo's sibling library — `05_Ranked_Robin/03_Criteria/rr_tiebreaks/` in [star-voting-library](https://github.com/masiarek/star-voting-library) already carries frozen BV exports (BV2261, BV2262) built to exercise the tiebreak ladder.

## Status

- Analysis complete; nothing posted upstream yet.
- Patch written, not pushed.
- Open question for the maintainers: fold Plurality into the same PR, or keep #1166 literal?
