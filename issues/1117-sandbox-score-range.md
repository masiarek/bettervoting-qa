# #1117 — the sandbox accepts a score the tabulator will throw away

**Fixed in [Equal-Vote/bettervoting#1522](https://github.com/Equal-Vote/bettervoting/pull/1522)** (2026-08-15). Issue: [#1117](https://github.com/Equal-Vote/bettervoting/issues/1117).

## The finding

Typing a `6` into a STAR ballot on <https://bettervoting.com/sandbox> produced results with no message. The issue calls this "silently fails", which undersells it — the failure is not that the 6 was accepted, it is what happens next.

The chain: `Sandbox.tsx`'s `getResults()` validates only ballot *length*, never score values → `POST /API/Sandbox` → `sandboxController.ts` validates only the voting method → the tabulator's `makeBoundsTest` (`Tabulators/Util.ts:89-94`) drops **the entire ballot** and records it as `nOutOfBoundsVotes`, which nothing on the page displays.

So the sandbox shows a **correct count of a smaller election than the one that was typed in**. Same family as [#1487](1487-range-of-scores-denominator.md) and the flat-ballot cases: a number computed over a quietly reduced ballot set, with the reduction invisible.

## Why a naive fix is wrong

"Reject anything above 5" would be wrong for most of the sandbox's own menu. The ranges belong to the methods, and they come from the tabulators:

| Method | Bounds test | Valid range |
|---|---|---|
| STAR | `Star.ts:12` | 0–5 |
| STAR-PR | `AllocatedScore.ts:25` | 0–5 |
| Approval | `Approval.ts:13` | **0–1** |
| Plurality | `Plurality.ts:14` | **0–1** |
| Ranked Robin, IRV, STV | `RankedRobin.ts:13`, `IRV.ts:36` | rankings, bounded by `max_rankings` |

The sandbox controller passes **no** election settings, so for the three ranked methods the bound resolves to `Infinity` — with six candidates a rank of `6` is a legitimate mark. `Ballot.ts` deliberately does not cap ranks at the candidate count either, with a comment saying so ("that's not necessarily true for public RCV elections").

The fix therefore carries a per-method table and leaves ranked methods alone except for negatives.

## The test, and proof it isn't vacuous

`testing/tests/sandbox.spec.ts` — the first test in the suite to visit `/sandbox` at all. Two cases:

1. STAR with `5,4,3,2,6` shows the error, and correcting to `5,4,3,2,1` clears it.
2. IRV with six candidates and ranks `1,2,3,4,5,6` shows **no** error — the case a flat rule breaks.

Run against `origin/main`'s `Sandbox.tsx`: **test 1 fails, test 2 passes.** That is the right shape — the first proves the fix does something, the second proves the fix doesn't over-reach and would have passed before too.

## Provenance

| Claim | How established |
|---|---|
| No score validation in the sandbox or its controller | read from source — `Sandbox.tsx` `getResults()`, `sandboxController.ts` |
| Out-of-bounds ballots are dropped, not clamped | read from `Tabulators/Util.ts:89-94` (`makeBoundsTest`) and `filterInitialVotes` |
| The per-method range table | read from the five `makeBoundsTest` call sites |
| Ranked methods unbounded in the sandbox path | read — `sandboxController.ts` passes no `electionSettings` |
| Error appears, and clears | **executed** — Playwright, local stack, desktop 1280 and mobile 390 |
| Tests are non-vacuous | **executed** — same spec against `origin/main`'s component |
