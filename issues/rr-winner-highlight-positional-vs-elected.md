# Winner highlighting is positional, but `elected` is identity

**Status: FILED upstream as [#1480](https://github.com/Equal-Vote/bettervoting/issues/1480), 2026-08-04. Confirmed on production with a purpose-built election, [`8h4bvh`](https://bettervoting.com/8h4bvh/results) (BV2270).**

Split out of [#1166](1166-ranked-robin-multiwinner-highlighting.md) deliberately. #1166 is a `good first issue` about a hard-coded `1`; this is a different defect that the #1166 fix ([PR #1479](https://github.com/Equal-Vote/bettervoting/pull/1479)) does not touch and was never meant to.

## The claim

Every results viewer that uses `ResultsBarChart`'s `stars` prop or `ResultsTable`'s `winningRows` prop highlights **the first *N* rows** of `summaryData.candidates`. But the winners are `results.elected`, which is built by a different mechanism. When the two disagree, the page names one candidate in its heading and puts the star and the gold row on another.

- `components/ResultsTable.tsx:34` — `style={i < winningRows ? winningStyle : {}}`
- `components/ResultsBarChart.tsx:57` — `((i < stars || d['star']) ? "⭐ " : "")`

Both are row-index tests. Neither component knows which candidates won.

## Why they can disagree in Ranked Robin

Two orderings, produced independently:

| | Built by | Ordered by |
|---|---|---|
| `summaryData.candidates` | `getSummaryData` → `sortCandidates(candidates, 'copelandScore')`, once, up front | `copelandScore` desc, then `tieBreakOrder` asc |
| `elected` | `runBlocTabulator` → `singleWinnerRankedRobin`, one round at a time | the tiebreak ladder |

Ranked Robin passes no `evaluate` callback to `runBlocTabulator`, so the summary array is never re-sorted into round-win order. That leaves the ladder free to disagree with the sort — and its second rung does exactly that:

```ts
// singleWinnerRankedRobin, RankedRobin.ts
const [left, right] = winners.slice(0, 2);
if (winners.length===2 && left.winsAgainst[right.id] != right.winsAgainst[left.id]){
  const [winner, loser] = left.winsAgainst[right.id] ? [left, right] : [right, left];
```

`winners` preserves the sorted order, so `left` is the row that sorts first. The rung then picks the **pairwise** winner, which may be `right`.

`tieBreakOrder` comes from `shuffleCandidatesForRandomTiebreak.ts` — a TinyRand shuffle seeded on `(rawVoteCount + hash(raceId)) >>> 0`. It is deterministic and it is published in the export, but it is a function of the **ballot count and the race id, never of how anyone voted**. So it carries no information whatsoever about who beat whom, and it agrees with the head-to-head result about half the time.

## Not hypothetical

The head-to-head rung is ordinary. It fired in the very poll #1166 was reported against — [`qq6qkp`](https://bettervoting.com/qq6qkp/results), round 1:

```
round 0: Baldur's Gate wins round with highest number of wins.
round 1: Dragon Age preferred over Mass Effect and/or KOTOR in runoff.   ← 7.5 – 7.5 tie
round 2: Mass Effect and/or KOTOR wins round with highest number of wins.
```

Nothing is visible there, for two independent reasons: Dragon Age also sorts first (`tieBreakOrder` 0 vs 3), and at `num_winners: 3` both tied candidates are elected anyway. Neither reason is a property of the code — both are luck.

## Reproduction

A four-candidate Ranked Robin, one winner, built so exactly two candidates tie at the top of the Copeland table with a decisive match between them.

Ballots — three voters:

```
1 × Alder  > Birch  > Cedar  > Dogwood
1 × Birch  > Cedar  > Dogwood > Alder
1 × Dogwood > Alder > Birch  > Cedar
```

Pairwise: Alder>Birch 2–1, Alder>Cedar 2–1, Dogwood>Alder 2–1, Birch>Cedar 3–0, Birch>Dogwood 2–1, Cedar>Dogwood 2–1.

Copeland: **Alder 2, Birch 2**, Cedar 1, Dogwood 1.

So `winners` = {Alder, Birch}, exactly two, and Alder beats Birch head-to-head → **Alder is elected**, deterministically, from the ballots alone. Where Alder and Birch *sit in the table* is decided by the seeded shuffle instead. When the shuffle puts Birch first, the page reads:

> ⭐ Alder wins ⭐ … and the star, and the gold row, are on **Birch**.

The shuffle re-rolls on every ballot cast (`"This ensures the tiebreak priority is reset after every vote"`), so a pair of mirror-image ballots — which cancel exactly, leaving every pairwise winner and every Copeland score untouched — re-rolls the display order without changing the election.

### The live election

**[`8h4bvh`](https://bettervoting.com/8h4bvh/results)** — BV2270, minted 2026-08-04, Ranked Robin, 1 winner.

Minted with the three ballots above; that draw put Alder first, so the page looked correct. Three mirror pairs were then cast — `Alder>Birch>Cedar>Dogwood` plus its exact reverse, which cancel on every one of the six matchups — and the third re-roll landed on a disagreeing order. Nine ballots now, tally identical to the three-ballot version: Copeland still 2/2/1/1, log still `Alder preferred over Birch in runoff.`

<img alt="Results heading reads 'Alder wins!' while the star in the bar chart sits on Birch" src="img/8h4bvh_result.png" width="640">

<img alt="Detailed results table with the gold-highlighted row on Birch, not the winner Alder" src="img/8h4bvh_race_details.png" width="640">

The heading names **Alder**. The star and the gold row are on **Birch**. Both candidates show `2` wins / `67%`, so the page gives a reader no way to tell which of the two actually won — the two signals contradict each other and the wrong one is more prominent.

From `GET /API/ElectionResult/8h4bvh`:

```
elected  : ['Alder']
tieBreakType : none
  row 0: Birch    copeland=2  tieBreakOrder=1
  row 1: Alder    copeland=2  tieBreakOrder=3
  row 2: Cedar    copeland=1  tieBreakOrder=0
  row 3: Dogwood  copeland=1  tieBreakOrder=2
logs: ['Alder preferred over Birch in runoff.']
```

Note `tieBreakType: none` — this is not a random-tiebreak election. The winner is fully determined by the ballots. Only the *row order* came from the shuffle.

## Scope

Ranked Robin is where it's demonstrable, because its ladder has a rung that ignores the sort key. The **shape** of the defect is shared: `ApprovalResultsViewer` — the viewer #1479 copies — highlights positionally too, and so will Ranked Robin and Plurality after #1479 lands. The fix is one prop, not one viewer.

## Suggested fix

The bar chart already supports it. `ResultsBarChartData` carries an optional per-row `star` flag, and `STARPRResultsViewer` already uses it (`star: winIndex(…) < page`). So:

```tsx
const electedIds = new Set(results.elected.map(c => c.id));
// …
data={candidates.map(c => ({name: c.name, votes: c.copelandScore, star: electedIds.has(c.id)}))}
```

`ResultsTable` needs one additive prop, keeping `winningRows` for the callers that don't care:

```tsx
const isWinner = (i: number) => winningRowIndexes ? winningRowIndexes.includes(i) : i < winningRows;
```

## Related

- [#1166](https://github.com/Equal-Vote/bettervoting/issues/1166) / [PR #1479](https://github.com/Equal-Vote/bettervoting/pull/1479) — the hard-coded `1`. Different defect, same two components.
- BV2261 / BV2262 in [star-voting-library](https://github.com/masiarek/star-voting-library) — frozen exports built to exercise the same tiebreak ladder, and the source of the `perm` / `tieBreakOrder` facts used above.
