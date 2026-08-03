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

**Verified by execution, and it survived a deliberate falsification attempt.** `Star()` was run unmodified and with the flag flipped over four hand-built ballot sets ([`probe/`](probe/)), then fuzzed across **55,127 randomised Bloc STAR elections** (3–6 candidates, 1–3 winners, ballots including nulls and 0–3 flat ballots), comparing a full signature: elected set, per-round winners and runners-up, per-round and overall `tieBreakType`, `tied`, and the final candidate ordering from the `evaluate` callback (`Star.ts:29-40`). **Zero differences.**

That reduces the entire argument to **reporting** — for single-winner. Which is exactly where the objection lives, and where it can be met with chart fixes rather than a policy standoff.

### ⚠️ But the invariance holds only for flat ballots that cover every candidate

This caveat is not academic — it is finding 1.1 below, and it points the opposite way from everything else on this page.

A ballot whose `marks` object is **missing keys** is not a score-translation of the others: zero-filling it later creates strict pairwise preferences against the unmarked candidates. Sparse flat ballots flip winners constantly.

So the precise claim is: **adding a constant to every candidate on a ballot cannot change a STAR or Bloc STAR outcome.** It is *not*: "the abstention rule has no outcome effect." It has a large one — in the direction of the current rule being wrong.

*(Fuzz evidence plus the score-translation argument, not a formal proof. The random-tiebreak path with equal `tieBreakOrder` values can't be exercised, since orders are unique by construction.)*

---

## Severity 0 — the current rule is changing winners today

These are live defects in production, found while checking what the *change* would break. They argue **for** the change rather than against it, and they are not on any ticket.

### 0.1 🔴 An approved write-in silently deletes ordinary ballots — and flips winners

`vote.marks` contains only the keys a ballot actually carries: the official candidates the voter's ballot listed, plus **write-ins that this particular voter wrote in**. No voter's ballot carries a key for a write-in *someone else* added. The abstention test (`Util.ts:99-106`) runs on those raw keys; the zero-fill over the full candidate set (`Util.ts:133`) happens only *after* a ballot survives.

So once a write-in is approved, **every ballot that scored all official candidates equally and non-zero is deleted as an "abstention"** — even though, zero-filled over the real candidate set, it expresses a strict preference of every official candidate over the write-in.

Executed counterexample — A and B official, C an approved write-in, single-winner STAR:

```
4 × {A:4, B:4}            ← ordinary browser ballots, no C key
    {A:4, B:2, C:3}
    {A:0, B:3, C:5}
    {A:1, B:2, C:0}
```

| | Today | Under edit (a) |
|---|---|---|
| Tally | 3 | 7 |
| Scores | A 5, B 7, C 8 | A 21, B 23, C 8 |
| Finalists | C, B | B, A |
| **Winner** | **write-in C** | **B** |

Fuzzing this shape: the winner flips in **10,632 / 40,000** random small elections, and still **4,891 / 20,000** at 20–50 voters — not a small-election artifact.

**Edit (a) structurally fixes this class.** "Every mark == 0 after `?? 0`" is invariant under zero-filling missing keys; "all marks equal" is not. (A ballot with *no* marks at all stays an abstention under every mode — `[].every()` is true — so there is no regression there.)

Two aggravating factors: the sandbox path drops blank cells entirely (`Sandbox.tsx:39-46` does `parseInt` then `filter(!isNaN)`, which *also* silently shifts every later score onto the wrong candidate — a separate pre-existing bug), and `ballotValidation` (`shared/domain_model/Ballot.ts:58-151`) never requires score coverage of all candidates nor validates candidate ids, so any API client can submit sparse ballots.

`writeIns.test.ts` never exercises the abstention interplay. **This appears to be unfiled.**

### 0.2 STAR-PR returns HTTP 500 when the tally is empty

`AllocatedScore.ts:278-290` — with zero tally votes, `findSplitPoint` gets an empty array, the loop never runs, and line 289 `cand_df_sorted.slice(-1)[0].weighted_score` throws `TypeError: Cannot read properties of undefined`.

Verified by execution for both a zero-ballot election **and an election where every ballot is flat** (e.g. four `{A:5,B:5,C:5}`). The route is wrapped in `express-async-handler`, and the controller tabulates all races in one loop — so **one STAR-PR race with no valid votes takes down the results endpoint for the entire election.**

Both edits shrink the trigger set (all-5s ballots stop producing `V=0`) but neither eliminates it (`V=0` via no ballots or all-null remains). **A guard is needed regardless of what is decided about abstentions.**

*Proven at the tabulator + route-wiring level, not observed over HTTP — no server was booted.*

### 0.3 STAR-PR can elect the same candidate twice

`AllocatedScore.ts:89-104`: `indexOfMax` scans `weighted_sums` over **all** candidates, including already-elected ones whose columns were zeroed at 101-103. In any round where all remaining support is zero, the elected winner ties at 0 with everyone and can be picked again.

Executed: 3 candidates, 3 seats, ballots `{A:5,B:0,C:0} ×2` and `{A:5,B:1,C:0}` → elected **"A, B, A"**. C is never seated.

Both edits make all-zero late rounds *more* common, so both make this fire more often — another reason the STAR-PR half needs its own pass.

**Related, found alongside:** `results.tied.push(...maxAndTies.ties)` runs unconditionally, and `ties` always contains at least the round winner — so `AllocatedScore.ts:176-178` sets `tieBreakType='random'` for **every** STAR-PR election, and `Results.tsx:436-445` renders the "Tied!" banner on every STAR-PR race.

### 0.4 The frontend already disagrees with the backend rule

`AnonymizedBallotsContextProvider.tsx:43,54` counts a vote as participating if `overvote_rank > 0 || some(score != null)`. So flat-5 STAR ballots **are already counted today** by every "stats for nerds" widget — `STAREqualPreferencesWidget`, `ScoreRangeWidget`, `ColumnDistributionWidget`, `NameRecognitionWidget`, `VoterProfileWidget` — while the headline voter count excludes them.

The platform already contradicts itself on this question. Edit (a) *converges* the two for flat-non-zero ballots; edit (b) converges the rest. That reframes the change as removing an inconsistency rather than introducing one.

---

## Severity 1 — outcome-changing

### 1.1 STAR-PR (proportional) seat allocation

[`AllocatedScore.ts:57-58`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/AllocatedScore.ts#L57-L58):

```ts
    const V = scoresNorm.length;
    const quota = new Fraction(V).div(nWinners);
```

`V` is the count of **tally** votes. STAR-PR also passes `makeAbstentionTest(true)` (`AllocatedScore.ts:26`), so it inherits the same rule — and here the argument above does **not** hold, because the allocation is not a set of pairwise comparisons. It is a surplus-spending model over normalised ballot weights.

**Executed seat flip.** 10 ballots, candidates A–D, 3 seats — nine substantive ballots plus **one** all-5s ballot:

```
{A:4,B:2,C:5,D:2} {A:5,B:3,C:4,D:4} {A:4,B:5,C:4,D:4} {A:0,B:3,C:3,D:5} {A:2,B:5,C:1,D:4}
{A:5,B:4,C:1,D:4} {A:0,B:1,C:1,D:0} {A:2,B:3,C:5,D:1} {A:3,B:2,C:2,D:0} {A:5,B:5,C:5,D:5}
```

| | Today | Under edit (a) |
|---|---|---|
| `V` | 9 | 10 |
| quota | 3 | 10/3 |
| **Elected** | **B, C, D** | **B, C, A** |

Stable across **all 24 `tieBreakOrder` permutations** — this is not a tiebreak artifact. Two other seeds produced similarly robust flips.

The mechanism, including one not obvious from the quota alone: an all-5s ballot normalises to weighted score 1 for *every* candidate, so it sits at the top of every `cand_df_sorted`, lands above the round-1 split point, and is **fully spent on winner #1** — it raises the quota for all later rounds while contributing nothing to them. An all-0 ballot under edit (b) is the dual: quota up, support nil.

*(Found alongside: when round support < quota, `findSplitPoint` returns 0 and zero-score ballots get "spent" anyway — logging "The 3 voters who gave A 0 stars are partially represented… 100% of their remaining vote will go toward A." This pathology already fires today.)*

**This changes who is seated.** Nobody in the #884 thread appears to have considered STAR-PR at all — the ticket text and the linked line are both about `star.ts`.

### 1.1b STV — outcome-changing under edit (b) only

`IRV.ts:73`: the STV quota is `floor(tallyVotes/(nWinners+1)+1)`, computed **once**. Under edit (b) an explicit all-0 ranked ballot becomes a tally vote that exhausts immediately (`IRV.ts:198`) yet inflates that quota.

Fuzz: the elected set changes in **961 / 20,000** random 2-seat STV elections. **Single-winner IRV is immune** — its quota is recomputed each round from active votes (`IRV.ts:102`); 0 / 20,000 differences.

I had not considered STV at all. It belongs with edit (b), not edit (a).

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
| Results viewer gate | `Results.tsx:524` `nTallyVotes >= 1` | widget now renders in all-flat elections — **widens the #1035 `NaN` trigger set** (it does not create it; see `03`) |
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

## Severity 3 — companion edits, and tests to re-baseline

### Companion edits that must land in the same change

| Where | Why |
|---|---|
| `VotePage.tsx:248-254` + dialog at `350-353` + `en.yaml:42` | `ALL_EQUAL_IS_ABSTENTION_VOTING_METHODS` must drop `STAR` / `STAR_PR`. Otherwise the confirm dialog still tells a flat-5 voter *"Abstained — No preference was expressed"* while the backend counts the ballot |
| `en.yaml:224-226` `waiting_for_results` | *"Still waiting for results / No votes have been cast"* — today this literally lies for an all-flat election. Edit (a) mostly removes the state; the string is still the one that most bakes in the old semantics |
| `en.yaml:232` `vote_count: '{{n}} voters'` | the retroactive-headline string — the number that visibly changes on every past election |
| `en.yaml:285` `runoff_no_preference_footnote`, `runoff_majority` | **no change needed** — "½ of voters with preference" stays correct, since the majority marker excludes the equal-preference bar |

### Tests

| Test | Today | Under edit (a) | Under edit (b) |
|---|---|---|---|
| `Star.test.ts:119-121` | tally 6, abst 6 | **8 / 4** | **10 / 2** |
| `AllocatedScore.test.ts:194-196` | tally 6, abst 6 | same 14-ballot fixture, same numbers | same |
| `Approval.test.ts:33-35`, `Plurality.test.ts:37-40`, `RankedRobin.test.ts:23-25` | — | **survive untouched** | **survive untouched** |
| `writeIns.test.ts:348` | tally 0 | **no change needed** — that fixture casts zero ballots | no change |

`nOutOfBoundsVotes` stays 2 in every mode. The `[0,null,null]` and `[null,0,null]` ballots become tally votes **only under edit (b)** — which is what makes (a) the 8/4 case and (b) the 10/2 case. No IRV/STV stat assertions exist; Playwright specs assert no counts (`full-runthrough.spec.ts:155` asserts a winner from a real preference ballot, immune).

Re-baselining is the right moment to write the decision into the test name, so the next person does not have to excavate #884.

---

## Severity 4 — the data model: **not** a wall after all

I previously called `OrderedVote = number[]` a hard blocker on edit (b). **That was wrong**, and tracing ingestion end-to-end settles it: **nulls survive on every path, and nothing coerces a blank to `0` at rest.**

| Path | Evidence |
|---|---|
| Storage | ballots are a raw `json` column ([`Migrations/2023_07_03_Initial.ts:47`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Migrations/2023_07_03_Initial.ts)) — and there is **no results table**, confirming live restatement |
| Browser | nulls by construction (`VotePage.tsx:92`) |
| Validation | `Ballot.ts:95-100` explicitly allows null — and notably never checks score coverage or candidate-id validity (this is what enables finding 0.1) |
| Bulk upload | `UploadElections.tsx:172` → `cvrParsers.tsx` (`score: ranking ? ranking : null` — unranked is **null**, never 0) → `mapOrderedNewBallot` (`castVoteController.ts:141-144`) passes `score: s` straight through. **`OrderedVote = number[]` is a runtime lie**; nulls ride along inside it |
| Anonymized endpoint | returns raw scores, nulls intact |
| CSV export | keeps blank vs 0 distinct (`score ?? ''`) |

So edit (b) is **implementable**. What it is not is *small* — it changes Approval, Plurality, IRV and STV semantics (see 1.1b), and it is where the all-zero reporting distortion lives. It should still be split from edit (a), on cost and blast radius rather than on feasibility.

Two things worth filing separately, found on the way:

- For `ballot_source == 'prior_election'`, `ballotValidation` is **skipped entirely** (`castVoteController.ts:42`), so arbitrary sparse or null payloads reach the database unchecked.
- Round-tripping matters: an exported CSV's blanks re-enter through the sandbox path as **dropped marks**, not zeros — which feeds finding 0.1's sparse-key case directly.
- Downloaded **JSON embeds the computed `Results`**, so previously exported artifacts will disagree with restated live results after any change here. (CSV needs no edit.)

---

## Summary for the maintainers

| Claim | True? |
|---|---|
| "It changes election outcomes" | For flat ballots covering every candidate: **only STAR-PR** (and STV under edit (b)). Single-winner and Bloc STAR survived 55k-trial falsification. **But the *current* rule changes winners today** whenever a write-in is approved — see 0.1 |
| "It changes the reported numbers on past elections" | **Yes, retroactively** — the under-discussed one. Date-gate it |
| "It will make the runoff chart look wrong" | **Yes** — and the chart already has the inconsistency; the fix just makes it visible |
| "It will put `NaN` on results pages" | **It widens an existing one.** `NaN` is reachable today with `nTallyVotes > 0` — fix #1035 first regardless |
| "It will shift tie-break order" | **No.** Seeded on raw ballot count |
| "The data model blocks the null-vs-zero half" | **No** — I had this wrong. Nulls survive every ingestion path |
| "It's a one-line change" | **No.** Two independent changes with very different costs and different affected methods, argued as one |

### Filed nowhere, found here

Four live defects turned up while checking what the change would break. None is on a ticket, and three of them argue *for* the change:

1. **0.1** — approved write-ins silently delete ordinary ballots and flip winners *(edit (a) fixes this class)*
2. **0.2** — STAR-PR 500s the whole results endpoint on an empty tally *(needs a guard either way)*
3. **0.3** — STAR-PR can elect the same candidate twice; and every STAR-PR race shows the "Tied!" banner
4. **§4** — `prior_election` ballots skip validation entirely; the sandbox parser drops blanks and shifts scores onto the wrong candidates
