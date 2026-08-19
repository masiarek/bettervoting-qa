# #1507 — Allocated Score (STAR_PR) reports every result as a random tiebreak

**Filed 2026-08-09 (ours):** [Equal-Vote/bettervoting#1507](https://github.com/Equal-Vote/bettervoting/issues/1507).
**Fix written 2026-08-19**, on branch `fix/1507-star-pr-tiebreaktype`, commit `9a2b8b2a`, off upstream
`main` @ `454a38ae`. **Local only — not pushed, no PR, nothing posted on the issue.**

## The defect

`AllocatedScore` decides *"was this result decided by a tiebreak?"* by asking whether any elected
candidate appears in `results.tied` — but it pushes the round winner into `results.tied` on **every**
round, tie or not, because `indexOfMax` always returns the winning candidate inside its `ties` array.
The membership test is therefore true in every election that elects anybody, so every Allocated Score
race exports `tieBreakType: 'random'` with `tied` equal to `elected`. Since `Results.tsx` renders any
non-STAR method whose `tieBreakType` is `random` / `five_star` / `head_to_head` as **"Tied!"** plus
*"… won after tiebreaker"*, every STAR-PR results page BetterVoting has ever shown announced a random
draw in place of its winners — including races whose every round had a strictly unique maximum. The
fix records the tie where it actually happens (`ties.length > 1`) instead of inferring it afterwards
from an array that cannot answer the question.

## Where it is

All line numbers at upstream `main` @ `454a38ae`, `packages/backend/src/Tabulators/AllocatedScore.ts`.

`indexOfMax` seeds `ties` with the first candidate and *replaces* it whenever a new maximum appears,
so on a unique maximum it returns a one-element array containing the winner — `:260`–`:281`:

```ts
    let ties: candidate[] = [candidates[0]];                 // :267  always non-empty
    for (let i = 1; i < arr.length; i++) {
        if (max.equals(arr[i])) {
            ties.push(candidates[i]);                        // :269  a real tie
        } else if (arr[i].compare(max) > 0) {
            maxIndex = i; max = arr[i]; ties = [candidates[i]];   // :274  reset to the new leader
        }
    }
```

The round loop pushed that array unconditionally — `:96`–`:99`:

```ts
        if(maxAndTies.ties.length > 1){                      // :96  the log line knew the difference
            results.logs.push(`... are tied for the highest scores!`)
        }
        results.tied.push(...maxAndTies.ties);               // :99  but this did not
```

and the label was derived from membership afterwards — `:181`–`:183`:

```ts
    if(results.elected.some(elected => results.tied.includes(elected))){
        results.tieBreakType = 'random';
    }
```

Every elected candidate is in `results.tied` by construction, so the condition is a tautology. Note
`:96` already had the correct test, one line above the line that ignored it.

**The consumer**, `packages/frontend/src/components/Election/Results/Results.tsx:436`–`:447`: STAR
gets a bespoke check (is the runoff pair actually equal?); **everything else**, STAR-PR included,
falls through to

```tsx
    return ['random', 'five_star', 'head_to_head'].includes(results.tieBreakType);
```

which drives `showTitleAsTie` (`:487`). True means the heading is `results.tie_title` — **`'Tied!'`**
(`en.yaml:247`) — followed by `random_tiebreak_subtitle`, *"{{names}} won after tiebreaker"*
(`:248`), instead of the ⭐-winners line. With the election setting `break_ties_randomly` on,
`removeTieBreakFromTitle` (`:447`) suppresses the subtitle but **not** the "Tied!" heading.

## Before

**1. Production, live, 2026-08-19.** `GET https://bettervoting.com/API/ElectionResult/bvhchj`
(BV2130 — 51 candidates, 7 seats, the election the issue is about):

| | value |
|---|---|
| `results[0].votingMethod` | `STAR_PR` |
| `results[0].tieBreakType` | **`random`** |
| `results[0].tied` | the same 7 names as `elected`, in the same order |
| rounds 1–7, candidates holding the round maximum | **1, 1, 1, 1, 1, 1, 1** |
| `results[1]` (a Plurality race on the *same* election) | `tieBreakType: none`, `tied` = 1 |

The round maxima are computed from that response's own `summaryData.weightedScoresByRound`: no round
of that election was tied, and the sibling race on the same ballot reports `none`.

**2. Production `/API/Sandbox`, the issue's repro profile**, same day:

```
POST https://bettervoting.com/API/Sandbox
{"candidates":["Ada","Ben","Cara"],
 "cvr":[[5,4,0],[5,3,1],[4,5,0],[0,2,5],[1,0,4]],
 "num_winners":2,"votingMethod":"STAR_PR"}

tieBreakType : random
elected      : Ada, Cara
tied         : Ada, Cara
weightedScoresByRound : [[15, 10, 14], [0, 9, 4.5]]     (candidate order Ada, Cara, Ben)
```

Both rounds have a unique maximum — 15 and 9.

**3. Locally, the two new tests against unpatched `main`** — recorded in
[`../analysis/1507-probe/jest-before.out`](../analysis/1507-probe/jest-before.out):

```
● Allocated Score Tests › no tie anywhere reports tieBreakType 'none' (#1507)

      Object {
    -   "tieBreakType": "none",
    -   "tied": Array [],
    +   "tieBreakType": "random",
    +   "tied": Array [
    +     "Ada",
    +     "Cara",
    +   ],
      }

● Allocated Score Tests › a genuine tie still reports tieBreakType 'random' (#1507)

      Object {
        "tieBreakType": "random",
        "tied": Array [
          "Allison",
          "Bill",
    +     "Doug",
        ],
      }

Tests:       2 failed, 52 passed, 54 total
```

The second failure is the same defect from the other side: in a profile that *does* have a real
round-1 tie between Allison and Bill, `tied` also picks up **Doug**, the untied winner of round 2.

**4. The real election replayed offline**, from the frozen 102-ballot export
(`star-voting-library/03_STAR_PR/02_Examples/cases/bv2130_presidential_board_star_pr_bv_export.json`),
[`../analysis/1507-probe/run-before.out`](../analysis/1507-probe/run-before.out) — `tieBreakType:
random`, `tied` = all seven elected, seven rounds each with a unique maximum.

## After

Same probe, patched tabulator —
[`../analysis/1507-probe/run-after.out`](../analysis/1507-probe/run-after.out):

| profile | before | after |
|---|---|---|
| issue profile, Ada/Ben/Cara, 2 seats | `random`, `tied: Ada, Cara` | **`none`**, `tied: (empty)` |
| bvhchj (BV2130), 51 candidates, 7 seats, 102 ballots | `random`, `tied` = all 7 elected | **`none`**, `tied: (empty)` |

**Winners, scores and round structure are unchanged.** The probe asserts this for the production
election by comparing its replay against the elected order published in the frozen export —
`replay matches published elected order : true` in both runs. On the UI this turns *"Tied! … won
after tiebreaker"* into the ordinary ⭐-winners heading; nothing about who won moves.

Test suite after the fix, `npx jest src/Tabulators/` in `packages/backend`:

```
Test Suites: 9 passed, 9 total
Tests:       54 passed, 54 total
```

(52 before, plus the 2 new ones. `npx tsc --noEmit` also clean.)

## The fix

`AllocatedScore.ts`, commit `9a2b8b2a`:

```diff
         if(maxAndTies.ties.length > 1){
             results.logs.push(`${maxAndTies.ties.map(c => c.name).join(' and ')} are tied for the highest scores!`)
+            results.tied.push(...maxAndTies.ties);
+            results.tieBreakType = 'random';
         }
-        results.tied.push(...maxAndTies.ties);
@@
     results.other = remainingCandidates;
 
-    if(results.elected.some(elected => results.tied.includes(elected))){
-        results.tieBreakType = 'random';
-    }
```

Both halves of the reported symptom go together: `tied` now lists only candidates who were genuinely
level at a round maximum, and `tieBreakType` is `'random'` **iff** some seat was actually handed out
by `tieBreakOrder`. That is the same shape STAR already has — `Star.test.ts:83`, `:96` assert
`results.tied.length === 0` on a clean win — so the two score methods now agree about what an empty
`tied` means. The issue offered a separate boolean as an alternative if the always-populated array
were load-bearing; nothing in `packages/` reads it (see blast radius), so the array is fixed instead
of being worked around.

## Tests added

Both in `packages/backend/src/Tabulators/AllocatedScore.test.ts`. Each asserts `tieBreakType` and
`tied` **in a single object comparison**, so a failure prints both observed values rather than
stopping at the first.

**1. `no tie anywhere reports tieBreakType 'none' (#1507)`**

- *Purpose* — the reported defect: a result with no tie anywhere must not claim a random draw.
- *Input* — the issue's own profile: `Ada, Ben, Cara`; `[5,4,0] [5,3,1] [4,5,0] [0,2,5] [1,0,4]`; 2 seats.
- *Expected* — `elected: [Ada, Cara]`; every round has exactly one candidate at the round maximum;
  `tieBreakType: 'none'`; `tied: []`.
- *Actual* — before: `random` / `[Ada, Cara]` (test fails). After: `none` / `[]` (passes).
- The "exactly one candidate at the round maximum" step is asserted from the tabulator's own
  `weightedScoresByRound` rather than from hand arithmetic, so the test proves the *premise* (this
  profile has no tie) instead of assuming it.

**2. `a genuine tie still reports tieBreakType 'random' (#1507)`**

- *Purpose* — the guard: the fix must not be implementable by deleting the flag, and must not only
  look at the final round the way `runBlocTabulator` does.
- *Input* — `Allison, Bill, Carmen, Doug`; the 10-ballot profile from the file's own commented-out
  "Random Tiebreaker" test, in which Allison and Bill both total 25 stars in **round 1** of a
  **two-round** race.
- *Expected* — `elected.length === 2`; `elected[0] === 'Allison'` (lowest `tieBreakOrder` wins the
  draw, so the tiebreak rung demonstrably fired); round 1's maximum is 25 and **two** candidates hold
  it; `tieBreakType: 'random'`; `tied: ['Allison', 'Bill']`.
- *Actual* — before: `random` (right label, for the wrong reason) but `tied: ['Allison','Bill','Doug']`
  (test fails on Doug). After: `random` / `['Allison','Bill']` (passes).

A fix that dropped the flag entirely fails test 2; a fix that only inspected the last round fails
test 2; a fix that kept the old behaviour fails test 1.

## Blast radius

**Who reads `tieBreakType`** (grep over `packages/`, excluding `node_modules`):

| Site | Effect of the change |
|---|---|
| `frontend/…/Results/Results.tsx:444` | `showTitleAsTie` — STAR-PR pages stop showing **"Tied!"** and show the winners heading instead. This is the whole user-visible fix. |
| `frontend/…/Results/Results.tsx:447` | `removeTieBreakFromTitle`, only when `settings.break_ties_randomly` is on. Was true for every STAR-PR race; now true only for genuinely tied ones. |
| Every other tabulator (`Star`, `IRV`, `RankedRobin`, `Plurality`, `Approval`) | untouched — they set their own value and none of them route through `AllocatedScore`. |

**Who reads `results.tied`:** nothing in `packages/` — no frontend component references it at all.
Its only reader was the tautological check this commit deletes. It is, however, part of the exported
results JSON (`/API/ElectionResult/:id` and `/API/Sandbox`), so **external** consumers see the shape
change: this repo's sibling `star-voting-library` freezes those exports as `_bv_export.json`, and
`tools_adam/bv_replay_tiebreak.py` reads `tied` / `other` / `perm` when replaying a seeded shuffle.
Nothing there breaks on an empty array, but the 221 frozen exports keep the old shape and must be
read as pre-fix artifacts — 11 of them carry a STAR-PR race, so those are the ones whose `tied` array
would differ if refetched after the fix.

**Retroactivity.** Results are tabulated **per request** — `getElectionResultsController.ts:146`
calls the tabulator on every fetch and nothing is cached or stored — so the day this deploys, every
past STAR-PR election's results page changes its heading. No migration, no stored value to correct,
and no winner moves. Anyone quoting a pre-fix export (as our own library does) is quoting a snapshot,
not a record that will be re-served.

**Not fixed here: `runBlocTabulator` has the opposite bug.** `Util.ts:312`–`:316` copies
`tied` / `tieBreakType` **only from the final round**, so a tie that decided seat 1 of a multi-seat
Bloc race disappears from the exported label. Executed, not read — bloc Approval, 4 candidates,
2 seats, `[1,1,1,0] [1,1,1,0] [1,1,0,1]`:

```
elected             : Ada, Ben
round tieBreakTypes : random, none
round tied          : [Ada Ben] [Ben]
results.tieBreakType: none          <- the round-1 draw is not reported
results.tied        : Ben
```

That is *under*-reporting where #1507 is *over*-reporting, and it applies to Bloc STAR, Approval,
Plurality and Ranked Robin at once — four methods' exports — so it belongs in its own issue rather
than in this commit. It also shows a residual inconsistency the fix does not resolve: after this
change STAR-PR's `tied` means *"candidates who were actually level"* (empty if none), while the bloc
methods' `tied` means *"everyone sharing the final round's top score"*, which always contains the
winner and so is never empty. Only `tieBreakType` is comparable across methods.

## What could not be verified

| Claim | How established |
|---|---|
| `tieBreakType: random` on a real STAR-PR election with no tied round | **executed** — live production API for `bvhchj`, 2026-08-19, and its own round maxima |
| The issue's repro profile | **executed** — live production `/API/Sandbox`, same day |
| Before/after values for both profiles | **executed** — the probe, run against unpatched `main` and against the fix |
| Winners unchanged on the real election | **executed** — replay matches the frozen export's published elected order |
| `runBlocTabulator`'s final-round-only behaviour | **executed** — throwaway bloc-Approval probe, output above |
| The **"Tied!"** heading on a STAR-PR results page | **read from source only** — `Results.tsx:436`–`:490` + `en.yaml:247`–`:248`. Not seen in a browser; no screenshot before or after. This is the one user-visible claim in the page that is a prediction. |
| Whether any *other* frozen or third-party consumer keys on a non-empty `tied` | searched this repo and `packages/` only |
| The fix under the full backend test suite | **only `src/Tabulators/` was run** (9 suites, 54 tests). The rest of the backend suite needs a database and was not started. |

Live production numbers moved between the frozen export and today (100 tallied ballots vs 101), which
changes seat 7 of `bvhchj` from Karina Garcia to Robert F. Kennedy Jr. That is one late ballot, not
the fix: the offline replay matches the **frozen** export exactly, and `tieBreakType` is `none` after
the patch either way.

## Related

- [`analysis/1507-probe/`](../analysis/1507-probe/probe1507.ts) — the probe, plus `run-before.out`,
  `run-after.out`, `jest-before.out`.
- The `starvote` accounting bug this issue was found next to — quota filled by ballot *count* rather
  than *weight*, where BetterVoting is the implementation that matches the spec:
  <https://masiarek.github.io/star-voting-library/03_STAR_PR/03_Criteria/allocated_count_vs_weight/index.html>
