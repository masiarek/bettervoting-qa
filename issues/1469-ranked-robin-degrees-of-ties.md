# #1469 — Ranked Robin skips its own tiebreakers

**Status:** fix written, tested, committed locally. **Not submitted** — [PR freeze](../docs_proposals/PARKED_ready_for_bv.md).
**Issue:** [#1469](https://github.com/Equal-Vote/bettervoting/issues/1469) (ours, filed 2026-08-01, two evidence comments)
**Branch:** `fix/1469-ranked-robin-margins-tiebreaker` @ `585b08f1`, in the worktree `/Volumes/T7/Voting/BetterVoting/bv-rr-degrees`, off `origin/main` `454a38ae`.

## The defect

`singleWinnerRankedRobin` (`packages/backend/src/Tabulators/RankedRobin.ts:32-72`) resolves a tie for the most matchup wins with exactly two rungs: a head-to-head branch that fires only when **exactly two** candidates are tied, and then the random rung. Its own log line said so — *"more robust tiebreaker not yet implemented"*.

Ranked Robin defines four degrees of tiebreakers ([electowiki](https://electowiki.org/wiki/Ranked_Robin#Degrees_of_ties)), and the first two are cheap:

- **1st Degree** — elect the finalist with the greatest sum of win margins **over the other finalists**.
- **2nd Degree** — still tied: greatest sum of win margins **over all candidates**.

The 3rd and 4th exist, and the spec explicitly does not recommend them for public elections — it prefers a lot or a re-run, which is what the random rung is. So the faithful ladder is **1st Degree → 2nd Degree → random**, and the fix implements exactly that.

Two structural facts decide how much this matters:

1. **For exactly two finalists the 1st Degree IS the head-to-head**, so the existing branch was already correct — it just had no name and no general case behind it.
2. **With three candidates and no drawn matchups, every Condorcet cycle is a three-way Copeland tie.** The two-way branch can therefore never fire on a three-candidate cycle, and the random rung is the entire cycle path for the field size BetterVoting sees most. The issue's second comment carries the simulation.

## Before → after

Both captured through `packages/backend`'s own jest harness, not from a browser.

| Profile | On `main` | With the fix |
|---|---|---|
| 11 ballots, 3-way cycle (the issue's repro: Dre 7–4 Edith, Edith 6–5 Frank, Frank 9–2 Dre) | **Dre**, `tieBreakType: random`, log *"Dre picked in random tie-breaker, more robust tiebreaker not yet implemented."* | **Frank**, `tieBreakType: none`, log names the 1st Degree (+6 over the other finalists) |
| the same ballots, candidates listed Edith, Frank, Dre | **Edith** — the winner tracked the listing order | **Frank** |
| 26 ballots, 4 candidates, where the 1st and 2nd Degrees disagree | **Ben** (+24 over the field, almost all of it 26–0 against an also-ran) | **Alma** (+2 over the other finalists) |
| 4 ballots, two finalists drawn head-to-head | **Alma** by shuffle | **Ben** by the 2nd Degree (+4 vs +2 over the field) |
| 21 ballots, two finalists, decisive head-to-head | **E** | **E** — unchanged |
| electowiki's "needs all four degrees" example ([`3r3yf7`](https://bettervoting.com/3r3yf7/results)) | random between Ava and Bianca | random between Ava and Bianca — **unchanged**, and `tied` now names just those two |

The last two rows are the guard: a fix that always decides would be the wrong fix.

## Tests

`packages/backend/src/Tabulators/RankedRobin.test.ts`, six new cases, all expectations computed from the pairwise matrix by an independent stdlib script before the code was written.

- Baseline `npx jest src/Tabulators/`: 9 suites, **52** tests green.
- After: 9 suites, **58** tests green. `npx tsc --noEmit --project ./` clean.
- Reverting only `RankedRobin.ts` and re-running: **4 of the 6 fail**, the two regression cases pass. Sample failure — `Expected: ["Frank"] / Received: ["Dre"]`.

## Blast radius, stated honestly

`tieBreakType` stays `'none'` on the deterministic rungs, so no results page starts announcing a tie where the method resolved one, and no election that already had a deterministic winner changes: the new rungs are reachable only from states that previously returned `'random'`. The one other behaviour change is that `roundResults.tied` now lists the candidates the draw is actually between, rather than everyone who tied on matchup wins.

Not in the diff, deliberately:

- **The log lines are plain English strings**, matching the file's existing ones, not i18n keys. Worth raising with [#1432](https://github.com/Equal-Vote/bettervoting/issues/1432) rather than solving here.
- **`copelandScore` counts a pairwise draw as +0.5** while electowiki's primary rule says "beats the greatest number", which would count only outright wins. This can change *who* ties at the top. Pre-existing, out of scope, and not obviously a bug — the +½ convention is what `pref_voting` and the LH engine also use, and wins+½·draws and wins−losses give identical rankings. It deserves its own issue with both readings quoted.
- **The sandbox** assigns `tieBreakOrder = i` without shuffling (`sandboxController.ts`), which is why the sandbox winner tracked the typed order. Unchanged here.

## What this cost us, on our own side

Running the same ladder question against [star-voting-library](https://github.com/masiarek/star-voting-library) found the mirror-image bug in **our** engine: it had no 1st Degree rung at all and broke Copeland ties on total margin over the whole field, which is the 2nd Degree applied in place of the first. **11 of that repo's 100 Ranked Robin cases changed winner** when it was corrected, every one a two-way tie whose head-to-head was decisive — i.e. the engine had been electing the loser of the finalists' own match.

Four of those cases are BV-backed, and in all four the corrected engine now agrees with the winner BetterVoting published. Two of them existed *because* of the disagreement: `BV2138` and `BV2176` were written up as an "LH vs BetterVoting tiebreak divergence". BetterVoting was right. Full write-up: [degrees of ties](https://masiarek.github.io/star-voting-library/05_Ranked_Robin/03_Criteria/rr_tiebreaks/degrees_of_ties.html).

That is worth a line in the PR body, and it is the argument for the PR: two independent implementations disagreeing is evidence that one is wrong, and here both were.

## Credit

A concurrent session independently implemented the same ladder (branch `fix/1469-ranked-robin-margins-tiebreakers` @ `709d5c2e`, kept in `bv-copy-fix` for salvage). Two things from it should be folded in before the PR opens: a **69-ballot regression test of the five-way cycle** from the original Ranked Robin proposal, and **printing the margin sums in the log lines** so the export explains its own resolution.

## Related

- [#1063](https://github.com/Equal-Vote/bettervoting/issues/1063) — deterministic tie-breaking. This fix is most of it: after it, nearly every Ranked Robin tie resolves from the ballots.
- [#1468](https://github.com/Equal-Vote/bettervoting/issues/1468) / [#1480](https://github.com/Equal-Vote/bettervoting/issues/1480) — the results page stars a row by position, so it can disagree with the winner a tiebreak produced. Separate; PR [#1479](https://github.com/Equal-Vote/bettervoting/pull/1479) is open on it.
- [#1432](https://github.com/Equal-Vote/bettervoting/issues/1432) — surfacing tie-break explanations. The new log lines are raw material for it.

# file: 1469-ranked-robin-degrees-of-ties.md
