# #1432 tie-break transparency — comment posted

**Posted:** 2026-08-08 → [issuecomment-5226640606](https://github.com/Equal-Vote/bettervoting/issues/1432#issuecomment-5226640606)

Backed by [`analysis/tiebreak-audit-report.md`](../analysis/tiebreak-audit-report.md).

## What it said

Endorsed the existing framing — the logs and `tieBreakType` are already computed, so the narrative half is plumbing. Added two points about the **numbers behind** the explanation rather than the explanation itself.

**1. The seed's input is not the number on screen.** The shuffle is deterministic and reproducible — `seed = (rawVoteCount + hash(raceId)) >>> 0`, called with `cvr.length` (`getElectionResultsController.ts:141`) — and no ballot *content* touches it, only the count and the race id. But `rawVoteCount` is the **raw** count while the results page shows **tally** votes, and there is no `nVotes` field; the identity `nVotes = nOutOfBoundsVotes + nAbstentions + nTallyVotes` lives only in a comment (`ITabulators.ts:60`). So someone reproducing the draw from the visible count computes the wrong seed, gets a plausible-but-wrong order, and concludes the tiebreak doesn't reproduce — **a reporting gap that manufactures an integrity accusation.** Asked for `rawVoteCount` stated explicitly alongside the three component counts, plus `raceId`, the seed, and `tieBreakOrder`.

Mentioned our independent Python replay (matched at 3 and 9 candidates) as evidence the mechanism holds — and noted it only worked because it counts the export's `Ballots` array rather than trusting a displayed total, which is exactly the trap.

**2. No algorithm version is recorded.** `shuffleCandidatesForRandomTiebreak` takes `electionCreateDate` and never uses it, with a comment saying it is there for versioning if the approach changes (`:31-32`). Nothing records which approach produced a result, so a future change silently breaks every past audit. Asked for a version field while it is cheap.

**Caveat on wording.** In `open_open` (*Manage Voters → "no limit"*) `rawVoteCount` is unbounded and inflatable by one voter, so the seed is too. Not a flaw — anyone casting unlimited ballots wins outright anyway — but reproducible ≠ trustworthy there, so the report should name the voter-authentication mode next to the seed.

## Note

Deliberately did **not** re-litigate the tie-break protocol itself; #1432 already scopes that out as working-as-intended, and both points here are additive to its existing asks.
