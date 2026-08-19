# #1484 — the Race Details tables name the second-highest scorer, not the finalist

**Filed 2026-08-06:** [Equal-Vote/bettervoting#1484](https://github.com/Equal-Vote/bettervoting/issues/1484) (ours).
**Fixed on a local branch, `fix/1484-race-details-runner-up` @ `a892a0ff`, off upstream `main` @ `454a38ae`. Not pushed, no PR.**

## The defect

When a STAR scoring-round tie is broken to pick the second finalist, the results page states two different runoffs. The charts and the Tabulation Steps take the pair from `roundResults` and name the candidate the tiebreak actually advanced; the Race Details **Scores Table** and **Runoff Table** take positions 0 and 1 of `summaryData.candidates`, which is score order, and so name the second-highest scorer instead — then recompute the runoff against them. Both readings are arithmetically correct for their own pair, which is why it reads as confusion rather than as breakage: on [`qhjyr2`](https://bettervoting.com/qhjyr2/results) the chart says *Ana 2, Cora 1, Equal Support 2* and the table directly below it says *Ana 3, Ben 2, Equal Support 0*. The Equal Support row collapsing to **0** was the visible symptom that opened [#802](https://github.com/Equal-Vote/bettervoting/issues/802) in Feb 2025. The frontend's contract is not wrong and its comment says exactly what it depends on — the backend sort that was supposed to satisfy it never completed.

## Root cause — one `NaN`

`packages/backend/src/Tabulators/Util.ts:330-334` (`runBlocTabulator`), on `main` @ `454a38ae`:

```ts
const compare = (a: number[], b: number[], i: number): number => {
  if(i > a.length || i > b.length) return 0;
  let diff = -(a[i] - b[i]);
  return diff == 0 ? compare(a, b, i+1) : diff;
};
```

This sorts `summaryData.candidates` by the keys `Star()` supplies at `packages/backend/src/Tabulators/Star.ts:29-40` — win round, then runner-up round, then score — using `-Infinity` as the "didn't happen" sentinel:

```ts
winRound == -1 ? -Infinity : -winRound,
runnerUpRound == -1 ? -Infinity : -runnerUpRound,
candidate.score
```

`-Infinity - -Infinity` is `NaN`, not `0`. `diff == 0` is false for `NaN`, so `compare` returns `NaN`, and `Array.prototype.sort` **coerces a `NaN` comparator result to `+0`** (ECMA-262 SortCompare: *"If v is NaN, return +0"*). So any two candidates who both lost their rounds compare **equal at key 0**, the recursion never reaches key 1, and `runnerUpRound` — the key whose entire job is to lift the runner-up to position 1 — is never read. The runner-up stays wherever the score pre-sort left them.

The winner is unaffected: `0` vs `-Infinity` subtracts to `-Infinity`, a real answer, so position 0 has always been right. That asymmetry is what makes the bug look like a runner-up-specific problem rather than a comparator problem.

`sortCandidates()` in the same file already dodges this trap on purpose, 140 lines up:

```ts
if(i == -1) return 999999; // I can't do infinity because Infinity can't equal Infinity for comparison purposes
```

The knowledge was in the file; it just wasn't in this function.

**Not a deploy gap.** The issue floats that possibility, since `evaluate` exists on `main` and looks like it should already produce the right order. Replaying `main`'s comparator over the payload production served on 2026-08-05 reproduces that payload's order exactly — see the probe below.

## Exact locations

| File:line (`main` @ `454a38ae`) | Role |
|---|---|
| `packages/backend/src/Tabulators/Util.ts:330-334` | the comparator that returns `NaN` — **the bug** |
| `packages/backend/src/Tabulators/Star.ts:29-40` | the `evaluate` keys, correct, never fully read |
| `packages/backend/src/Tabulators/Util.ts:193` | the same trap, avoided deliberately, in `sortCandidates` |
| `packages/frontend/src/.../STAR/STARDetailedResults.tsx:28` | `const [winner, runnerUp] = results.summaryData.candidates` |
| `packages/frontend/src/index.css:144-150` | `.starScoreTable tr:nth-child(1),(2)` — the gold highlight, positional |
| `packages/frontend/src/.../components/VoterProfileWidget.tsx:33` | `candidates.slice(0, 2)` — same pair, same defect |
| `packages/frontend/src/.../Results.tsx:51` | the pattern that is already right: finalists from `roundResults` |
| `packages/frontend/src/.../STAR/STARResultSummaryWidget.tsx:44-47` | the runoff chart, also already right |

The score *chart* is immune for a second reason: `STARResultSummaryWidget` re-sorts its histogram by `score` with the round winner pinned, so it never sees the summary order.

## The discriminating profile

The election on the issue, minted for it: [`qhjyr2`](https://bettervoting.com/qhjyr2/results) (BV2276), STAR, 1 winner, 4 candidates, 5 ballots. Deterministic — the tie resolves at the **head-to-head** rung, `tieBreakType: "head_to_head"`, nothing random.

| | Ana | Ben | Cora | Dev |
|---|:--:|:--:|:--:|:--:|
| voter 1 | 5 | 3 | 5 | 0 |
| voter 2 | 3 | 1 | 3 | 0 |
| voter 3 | 5 | 4 | 2 | 1 |
| voter 4 | 1 | 4 | 0 | 5 |
| voter 5 | 1 | 2 | 4 | 5 |
| **score** | **15** | **14** | **14** | 11 |

Ben and Cora tie at 14; Cora is preferred to Ben on 3 ballots to 2, so **Cora** advances. The two candidate pairs give genuinely different runoffs — Ana vs Cora is 2–1 with 2 equal, Ana vs Ben is 3–2 with 0 equal — so a fix cannot pass by accident.

A second profile exercises the **five-star** rung, where the pairwise rung is skipped for having three tied candidates: Allison 19; Bill, Carmen and Doug all 14; Carmen has two 5s and the others none, so Carmen advances while Bill still sorts second on score. It is in the test file rather than on BetterVoting.

## Before and after

Four combinations, from [`../analysis/1484-race-details-probe/`](../analysis/1484-race-details-probe/README.md) — the backend comparator each way against the frontend selection expression each way, over the payload production served for `qhjyr2`. The charts read `roundResults` throughout and say **Ana vs Cora** in every row.

| backend sort | frontend selection | `summaryData.candidates` | Scores Table (gold rows) | Runoff Table |
|---|---|---|---|---|
| `main` | positional | Ana, **Ben**, Cora, Dev | Ana 15 + **Ben** 14 | Ana 3 \| **Ben** 2 \| Equal Support **0** |
| `main` | `roundResults` | Ana, **Ben**, Cora, Dev | Ana 15 + **Ben** 14 | Ana 2 \| Cora 1 \| Equal Support 2 |
| fixed | positional | Ana, Cora, Ben, Dev | Ana 15 + Cora 14 | Ana 2 \| Cora 1 \| Equal Support 2 |
| **fixed** | **`roundResults`** | Ana, Cora, Ben, Dev | Ana 15 + Cora 14 | Ana 2 \| Cora 1 \| Equal Support 2 |

Row 1 is production today, and it matches the screenshots on the issue. Row 2 is what a frontend-only fix buys: the Runoff Table is repaired but the gold highlight still sits on Ben, because that highlight is CSS `nth-child` over the served order and no frontend expression can move it. Row 3 is what a backend-only fix buys — everything correct. **The backend fix is the necessary one**; the frontend change is defence in depth.

The same numbers from the tabulator rather than from a transcription, before and after, on `npx jest src/Tabulators/`:

```
before   Test Suites: 1 failed, 8 passed, 9 total
         Tests:       3 failed, 53 passed, 56 total
after    Test Suites: 9 passed, 9 total
         Tests:       56 passed, 56 total
```

All three "before" failures are the same shape — `Expected: "Carmen", Received: "Bill"`. Every assertion about what the tabulator *decided* (`elected`, `roundResults[0].runner_up`, `tieBreakType`, the scores) passes on `main` too: the count was never wrong, only the order it was reported in.

## The fix

Two files, plus tests. Local commit `a892a0ff`.

**`Util.ts`** — compare the keys instead of subtracting them, so equal keys, infinite or not, fall through to the next key. The length guard's `>` becomes `>=` while it is open.

```ts
if(i >= a.length || i >= b.length) return 0;
if(a[i] === b[i]) return compare(a, b, i+1);
return a[i] < b[i] ? 1 : -1;
```

`Star()` is the only caller passing a multi-key `evaluate`; `Approval()` passes a single key (`[candidate.score]`) and is unchanged, since with one key the old code's `NaN` and the new code's fall-through both mean "equal". `Plurality` and `RankedRobin` pass no `evaluate` at all.

**`STARDetailedResults.tsx`** — take the runoff pair from `results.roundResults[0]` and look the two candidates back up in `summaryData.candidates` for their tallies, which is the pattern `Results.tsx:51` and `STARResultSummaryWidget` already use. It falls back to the old positional expression when `roundResults` is missing, so it adds no new crash path to a race that has one candidate (that path already throws today, and this change neither fixes nor worsens it).

**`Star.test.ts`** — four tests, below.

### Deliberately not fixed here

- **`VoterProfileWidget.tsx:33`** compares the same two positions and is repaired by the backend fix, so it needs no edit. It is listed because a future frontend-only reading of this issue would miss it.
- **The gold highlight stays positional.** Making `ResultsTable` highlight by candidate identity instead of row index is [#1480](https://github.com/Equal-Vote/bettervoting/issues/1480), which is a different defect on a shared component — see [`rr-winner-highlight-positional-vs-elected.md`](rr-winner-highlight-positional-vs-elected.md). Rolling it in here would put this diff on top of the component [PR #1479](https://github.com/Equal-Vote/bettervoting/pull/1479) is discussed against.
- **One consequence worth naming in review:** with the sort finally running to completion, the Scores Table can list a *lower*-scoring runner-up above a higher-scoring non-finalist. That is the documented intent of both `evaluate` and the frontend comment — it is what makes the highlight land on the finalists — and it is already true of position 0, where a runoff reversal puts a 14 above a 15 today. It is new only for position 1.

### Collision check with PR #1479

None. [#1479](https://github.com/Equal-Vote/bettervoting/pull/1479) touches exactly one file, `packages/frontend/src/components/Election/Results/Results.tsx`, changing `stars` / `winningRows` props on the Ranked Robin and Plurality viewers. This branch touches `Util.ts`, `Star.test.ts` and `STARDetailedResults.tsx`. Disjoint files, disjoint methods, and #1479's own "one thing this does not fix" section is about #1480, not this.

## Test cases

All four are in `packages/backend/src/Tabulators/Star.test.ts`, in a `describe("STAR summary ordering (#1484)")` block.

**1. head-to-head tiebreak: `candidates[1]` is the runoff runner-up, not the 2nd-highest scorer**
- *Purpose:* the ordering contract the Race Details tables depend on.
- *Input:* the `qhjyr2` profile above (Allison/Bill/Carmen/Doug, 5 ballots).
- *Expected:* `elected` Allison; `roundResults[0].runner_up` Carmen; `tieBreakType` `head_to_head`; score order `[15, 14, 14, 11]` with **Bill** second; `summaryData.candidates[0..1]` = Allison, **Carmen**.
- *Actual on `main`:* the first four assertions pass, the last fails — `Expected: "Carmen", Received: "Bill"`. Passes after the fix.

**2. head-to-head tiebreak: the table's runoff pair matches the chart's runoff pair**
- *Purpose:* state the defect as the contradiction a reader sees, rather than as an array index.
- *Input:* the same profile.
- *Expected:* `summaryData.candidates.slice(0,2)` equals `[roundResults[0].winners[0], roundResults[0].runner_up[0]]`; and the numbers that pair prints are 2 / 1 with Equal Support 2.
- *Actual on `main`:* `["Allison", "Bill"]` against the chart's `["Allison", "Carmen"]`. Passes after the fix.

**3. five-star tiebreak: `candidates[1]` is the runoff runner-up**
- *Purpose:* prove it is not specific to the pairwise rung. Three tied candidates skip the pairwise rung entirely.
- *Input:* Allison 19; Bill, Carmen, Doug 14; Carmen alone has 5-star votes.
- *Expected:* `tieBreakType` `five_star`; `summaryData.candidates[0..1]` = Allison, **Carmen**, while score order still puts Bill second.
- *Actual on `main`:* `Expected: "Carmen", Received: "Bill"`. Passes after the fix.

**4. bloc STAR still orders candidates by winning round**
- *Purpose:* a guard, not a reproduction — the fix changes a comparator every bloc method's summary goes through.
- *Input:* the same profile at `num_winners: 2`.
- *Expected:* `elected` = Allison, Carmen; `summaryData.candidates` = Allison, Carmen, Bill, Doug — winners in round order, then the runner-ups, then the rest by score.
- *Actual:* passes both before and after, which is the point.

## What was not verified

| Claim | How established |
|---|---|
| The comparator returns `NaN`, and `sort` treats it as equal | **executed** — in `node`, and against the spec text |
| The served payload for `qhjyr2` disagrees with its own `roundResults` | **executed** — read from the frozen export |
| `main`'s comparator reproduces that served order | **executed** — the probe |
| Before / after values in both tables | **executed** — the probe (transcribed view code) and jest |
| The tabulated winner and runner-up are unchanged by the fix | **executed** — jest, 56 tests |
| Frontend still compiles | **executed** — `npx tsc --noEmit` in `packages/frontend`, clean |
| Results are recomputed per request, so the fix repairs *past* elections' pages once deployed | **read from source** — `getElectionResultsController.ts` tabulates from stored ballots; no stored result payload. Not confirmed against a running server |
| The rendered page | **not verified in a browser.** No dev stack was started for this. The `main` / positional row of the before/after table is what the issue's screenshots show, which is the closest thing to a check |
| That no other consumer depends on the old summary order | **read from source** — all 38 `summaryData.candidates` reads under `Results/` were grepped. `VoterProfileWidget.tsx:33` is the only other STAR consumer that takes positions 0 and 1, and the change corrects it. `HeadToHeadWidget.tsx:25` takes `candidates[0]` as its default reference candidate, which is the winner before and after. `VoterIntentWidget.tsx:19` also slices 0 and 1 but reads `irvResults`, and IRV does not go through `runBlocTabulator` |

## Related

- [#802](https://github.com/Equal-Vote/bettervoting/issues/802) — where the Equal Support `0` was first noticed, Feb 2025
- [#1480](https://github.com/Equal-Vote/bettervoting/issues/1480) / [`rr-winner-highlight-positional-vs-elected.md`](rr-winner-highlight-positional-vs-elected.md) — the sibling defect: positional highlighting versus `elected` identity. Same shape, different mechanism, deliberately untouched here
- [#1471](https://github.com/Equal-Vote/bettervoting/issues/1471) / [`1471-chart-split-denominator.md`](1471-chart-split-denominator.md) — a separate chart bug visible in the same screenshots
- [PR #1479](https://github.com/Equal-Vote/bettervoting/pull/1479) — open, ours, no file overlap
- [#1507](1507-star-pr-tiebreaktype-always-random.md) — a concurrent session's fix, on branch `fix/1507-star-pr-tiebreaktype`. **No file overlap** (it lands in `AllocatedScore.ts` / `AllocatedScore.test.ts`), but its write-up names a *third* defect inside this same `runBlocTabulator`: the `w == nWinners-1` guard around `Util.ts:313` copies only the final round's `tieBreakType`, so a tie that decided seat 1 of a bloc race reports `none`. Nothing here touches that guard, and nothing there touches this comparator — but they are eight lines apart and will conflict textually if both are cherry-picked carelessly.
- [BV2276 in star-voting-library](https://masiarek.github.io/star-voting-library/01_STAR/03_Criteria/tie_break_ladder/bv2276_qhjyr2_second_finalist_tie.html) — the same election as a YAML with an independent count
