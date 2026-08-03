# 02 — Blast radius

Every surface that changes if flat ballots start counting. Read from `Equal-Vote/bettervoting` at `8d2b3f9`. Split by severity, because the argument has been conducted as if it were all one thing.

## The headline finding: single-winner STAR **outcomes do not change**

This is the most useful thing on this page and it is not in any of the tickets.

A flat ballot adds the **same constant to every candidate's score**, the **same increment (0 or 1) to every candidate's `fiveStarCount`**, and **nothing to any pairwise count** (`vote.marks[a] > vote.marks[b]` is false in both directions when the marks are equal). Every comparison in the STAR cascade is a *difference* between candidates:

| Cascade step | Code | Preserved? |
|---|---|---|
| Top-two selection | `candidates[1].score != candidates[2].score` (`Star.ts:66`) | ✅ differences unchanged |
| Head-to-head tiebreak | `left.winsAgainst[right.id]` (`Star.ts:110`, `174`) | ✅ pairwise counts unchanged |
| Five-star tiebreak | `tiedCandidates[0].fiveStarCount > tiedCandidates[1].fiveStarCount` (`Star.ts:133`) | ✅ differences unchanged |
| Random tiebreak | seeded on `rawVoteCount` (`shuffleCandidatesForRandomTiebreak.ts:38`) | ✅ raw count unchanged |

**So for single-winner STAR and Bloc STAR, no election changes its winner, its finalists, or its tie-break path.** Even the degenerate all-flat case keeps the same winner: today every score is 0 (nothing tallied) and everyone ties; after the fix every score is 15 and everyone still ties, the shuffle is seeded identically, so the same candidate is drawn.

**Verified by execution**, not just by argument: `Star()` was run unmodified and with the flag flipped over four ballot sets (equal-support flats, all-zero flats, an all-flat election, and mixed zero-and-blank). The winner and `tieBreakType` were identical in every pair — including the all-flat case, which elects Anchovy by random tiebreak both before and after. See the probe in [`probe/`](probe/).

That reduces the entire argument to **reporting** — for single-winner. Which is exactly where the objection lives, and where it can be met with chart fixes rather than a policy standoff.

*Caveat worth one test before anyone relies on this: the abstention test iterates the raw `vote.marks` keys, while the tally is rebuilt over `candidateIds`. Where write-in scores are disregarded (`writeInDiagnostics.numScoresDisregarded`), those two key sets differ, so a ballot's "flatness" is judged over a different set of marks than the one that gets counted. Nobody appears to have checked what that does.*

---

## Severity 1 — outcome-changing

### 1.1 STAR-PR (proportional) seat allocation

[`AllocatedScore.ts:57-58`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/AllocatedScore.ts#L57-L58):

```ts
    const V = scoresNorm.length;
    const quota = new Fraction(V).div(nWinners);
```

`V` is the count of **tally** votes. STAR-PR also passes `makeAbstentionTest(true)` (`AllocatedScore.ts:26`), so it inherits the same rule — and here the argument above does **not** hold, because the allocation is not a set of pairwise comparisons. It is a surplus-spending model over normalised ballot weights.

Worked: 10 ballots, 2 winners, 4 of them flat.

| | Today | After |
|---|---|---|
| `V` | 6 | 10 |
| quota | 3 | **5** |

Two distinct effects:

- **All-zero flat ballots** inflate the quota while contributing zero weighted support to anybody — they make every seat *harder* to fill without supporting anyone.
- **All-five flat ballots** enter with full normalised support for every candidate, so they are spent on whoever wins round 1 and are exhausted before round 2 — they behave like a bloc that votes for the front-runner.

**This can change who is seated.** It is the only part of the change that is not cosmetic, and it deserves its own test matrix before shipping. Nobody in the #884 thread appears to have considered STAR-PR at all — the ticket text and the linked line are both about `star.ts`.

### 1.2 Retroactivity — every past election's numbers change on deploy

Results are **tabulated live on every request**. [`getElectionResultsController.ts:146`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Controllers/Election/getElectionResultsController.ts#L146) calls the tabulator inline and returns; there is no results table in `packages/backend/src/Migrations/` and nothing freezes a certified result.

So the day this ships, a closed election that reported *"3 voters, Ann wins"* starts reporting *"7 voters, Ann wins"*. The winner is the same (§ headline finding), but every published percentage, screenshot, and exported CSV from before the deploy stops matching the page.

For a product whose selling point is auditability, that is the risk that should worry people most — and it is *not* the one being discussed.

**The codebase already contains the mitigation pattern.** From [`shuffleCandidatesForRandomTiebreak.ts:29-30`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/shuffleCandidatesForRandomTiebreak.ts#L29-L30):

> `// NOTE: electionCreateDate is currently unused, but if we ever change the approach for shuffling the candidates then`
> `//       we should use electionCreateDate to ensure that old elections still use the old approach`

The maintainers have already accepted, in writing, that tabulation-behaviour changes should be gated on `election.create_date`. `electionCreateDate` is already threaded into the tabulation path and unused. This is option **R3** in [`04-options.md`](04-options.md) and it is close to free.

---

## Severity 2 — visible reporting change

All of these follow from `nTallyVotes` growing. None changes a winner.

| Surface | File:line | What changes |
|---|---|---|
| Header voter count | [`Results.tsx:504`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/Results.tsx#L504) + `en.yaml:232` `vote_count: '{{n}} voters'` | rises by the number of flat ballots |
| "No votes cast" short-circuit | [`Results.tsx:485`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/Results.tsx#L485) `nTallyVotes == 0` | stops firing — **fixes #1052, #1065, #1384** |
| Results viewer gate | `Results.tsx:524` `nTallyVotes >= 1` | widget now renders in all-flat elections — **this is what un-hides #1035** |
| Score chart percentages | [`STARResultSummaryWidget.tsx:72`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/STAR/STARResultSummaryWidget.tsx#L72) `percentDenominator={nTallyVotes*5}` | up for all-5 flats, down for all-0 flats |
| Runoff Equal Support bar | `STARResultSummaryWidget.tsx:53-64` | grows by exactly the flat-ballot count; can become the tallest bar |
| Runoff percentage labels | `ResultsBarChart.tsx:51` | shrink for both finalists |
| Majority marker | `ResultsBarChart.tsx:82-90` | **does not move** — computed excluding the last bar |
| Pie "no preference" footnote | `STARResultSummaryWidget.tsx:85-88`, `en.yaml:285` | rises |
| Detailed results table | [`STARDetailedResults.tsx:51,68,71`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/STAR/STARDetailedResults.tsx#L51) `runoffVotes = nTallyVotes - finalistVotes` | the "no preference" row and the 100% total row |
| Head-to-head widget | [`HeadToHeadWidget.tsx:66`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/components/HeadToHeadWidget.tsx#L66) `total={nTallyVotes}` | matrix cells unchanged, implied "equal" residual grows |
| Voter-error / abstention widget | [`VoterErrorStatsWidget.tsx:60,83`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/components/VoterErrorStatsWidget.tsx#L60) | `nAbstentions + nTallyVotes` invariant; "% abstained" drops — intended |
| STAR-PR remaining voters | `Results.tsx:311` | "*N* remaining unrepresented voters" rises |
| Tabulation log "Equal Support *n*" | `Star.ts:116`, `184`, `195` — `equal_votes: nTallyVotes - winnerVotes - runnerUpVotes` | rises — becomes *more* correct |

---

## Severity 3 — tests to re-baseline

| Test | Assertion today |
|---|---|
| `Star.test.ts:119-122` "valid/invalid/under/bullet vote counts" | `nTallyVotes 6`, `nAbstentions 6` → would become `10` / `2` |
| `AllocatedScore.test.ts:194-196` | `nTallyVotes 6`, `nAbstentions 6` |
| `writeIns.test.ts:348` | `nTallyVotes` expected `0` |

Three assertions. Re-baselining them is the right moment to write the decision down in the test name, so the next person does not have to excavate #884.

---

## Severity 4 — the data-model wall (only for edit (b))

`Score.score` is `number | null` and the UI path preserves `null` end-to-end, so *for UI-cast ballots* the blank/zero distinction survives to the database and the JSON export. #1090 confirms this from the other side: *"JSON is correct"*.

But bulk upload uses [`OrderedVote = number[]`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/shared/src/domain_model/Vote.ts#L13) — a plain number array with no null channel — consumed at `castVoteController.ts:134`. If uploaded blanks arrive as `0`, then for uploaded elections **no tabulator rule can separate a blank from an explicit zero**, because the information was destroyed at ingest.

This does not block edit (a) at all. It is a hard blocker on edit (b) for a subset of elections, and it needs a migration or a format change rather than a boolean.

---

## Summary for the maintainers

| Claim | True? |
|---|---|
| "It changes election outcomes" | **Only STAR-PR.** Single-winner and Bloc STAR are provably invariant |
| "It changes the reported numbers on past elections" | **Yes, retroactively** — and this is the under-discussed one. Date-gate it |
| "It will make the runoff chart look wrong" | **Yes** — and the chart already has the inconsistency; the fix just makes it visible |
| "It will put `NaN` on results pages" | **Yes, unless #1035 is fixed first.** This is a real blocker with a two-line fix |
| "It will shift tie-break order" | **No.** Seeded on raw ballot count |
| "It's a one-line change" | **No.** It is two independent changes with very different costs, and they have been argued as one |
