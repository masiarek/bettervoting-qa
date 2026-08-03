# 01 — What the rule actually does

Read from `Equal-Vote/bettervoting` at `8d2b3f9` (`main`, 2026-08-02). Line numbers are from that commit. Everything on this page is **read from source**; where a symptom is inferred rather than observed in the product it is labelled so.

## The classifier

[`packages/backend/src/Tabulators/Util.ts:96-103`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Util.ts#L96-L103)

```ts
export const makeAbstentionTest = (markAllEqualAsAbstention:boolean = false) => {
	return [
		'nAbstentions',
		(vote: rawVote) => {
            const marks = Object.values(vote.marks).map(m => m ?? 0);
            return marks.every(m => m === (markAllEqualAsAbstention ? marks[0] : 0));
        }
	] as const;
}
```

Two things happen in those two lines, and they are usually discussed as if they were one:

1. **`m ?? 0`** — a blank mark is turned into a zero *before* the test. This erases the distinction between "I left this blank" and "I gave this candidate a zero". It applies to **every** voting method.
2. **`marks[0]` vs `0`** — with `markAllEqualAsAbstention`, the ballot is an abstention if all marks are equal to *each other*; without it, only if all marks are zero. This is STAR-only.

Who passes what:

| Tabulator | Call | Effect |
|---|---|---|
| `Star.ts:13` | `makeAbstentionTest(true)` | any all-equal ballot abstains |
| `AllocatedScore.ts:26` (STAR-PR) | `makeAbstentionTest(true)` | any all-equal ballot abstains |
| `Approval.ts:14` | `makeAbstentionTest()` | all-zero abstains |
| `Plurality.ts:15` | `makeAbstentionTest()` | all-zero abstains |
| `IRV.ts:37` | `makeAbstentionTest()` | all-zero abstains |

## An abstention is not "counted but flagged" — it is deleted

This is the part that surprises people. [`Util.ts:105-131`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Util.ts#L105-L131), `filterInitialVotes`:

```ts
  rawVotes.forEach(rawVote => {
    for(let i = 0; i < tests.length; i++){
      let [statName, statTest] = tests[i];
      if(statTest(rawVote)){
        summaryStats[statName] = (summaryStats[statName] ?? 0)+1;
        return;                       // <-- ballot never reaches tallyVotes
      }
    }
    summaryStats.nTallyVotes++;
    tallyVotes.push({ ... })
  })
```

A ballot that matches the abstention test increments a counter and **returns**. It never enters `tallyVotes`, and everything downstream is computed from `tallyVotes` ([`getSummaryData`, `Util.ts:207-290`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Util.ts#L207)):

- `votesPreferredOver` / `winsAgainst` — the pairwise matrix
- `score` — the score-round totals
- `fiveStarCount` — the five-star tiebreaker
- `copelandScore` — Ranked Robin
- `nTallyVotes` — the denominator of nearly every percentage on the results page

So a flat ballot is not "a vote with no preference". It is **not a vote at all**.

**Test-order note.** The tests run in the order the tabulator lists them, first match wins. `Star.ts` lists `makeBoundsTest(0,5)` before the abstention test, so an all-equal *out-of-range* ballot (e.g. all 7s) is counted as `nOutOfBoundsVotes`, not as an abstention. Changing the abstention rule does not move any ballot between those two buckets, because the bounds test is evaluated first and is untouched.

## The canonical example, from BetterVoting's own test suite

[`Star.test.ts:100-122`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Star.test.ts#L100) — "Test valid/invalid/under/bullet vote counts":

| Ballot | Today | Under "only blank abstains" |
|---|---|---|
| `[5, 5, 5]` | abstention | **tallied** — full equal support |
| `[3, 3, 3]` | abstention | **tallied** — equal middling support |
| `[null, null, null]` ×2 | abstention | abstention (unchanged) |
| `[0, null, null]` | abstention | **tallied** — a bullet-vote *against* |
| `[null, 0, null]` | abstention | **tallied** |
| `[0, 3, 6]` | out of bounds | out of bounds (unchanged) |
| `[-1, 3, 5]` | out of bounds | out of bounds (unchanged) |
| `[1,3,5] ×3`, `[5,0,0]`, `[0,5,0]`, `[0,0,5]` | tallied | tallied (unchanged) |

Asserted today: `nTallyVotes = 6`, `nAbstentions = 6`, `nOutOfBoundsVotes = 2`.
After the full fix: `nTallyVotes = 10`, `nAbstentions = 2`, `nOutOfBoundsVotes = 2`.

This test is the guardrail that encodes the [#884](https://github.com/Equal-Vote/bettervoting/issues/884) policy. Any fix has to re-baseline it, which is the right place to make the decision explicit.

## The divergence nobody has written down

The **frontend** has its own copy of the rule, and it is not the same rule.

[`VotePage.tsx:248-254`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Voting/VotePage.tsx#L248-L254):

```ts
  const ALL_EQUAL_IS_ABSTENTION_VOTING_METHODS = new Set(['STAR', 'STAR_PR']);
  const allEqualIsAbstention = (page) => ALL_EQUAL_IS_ABSTENTION_VOTING_METHODS.has(page.voting_method);
  const pageIsUnderVote = (page) => {
    return page.candidates.every(c => c.score === (allEqualIsAbstention(page) ? page.candidates[0].score : null));
  }
```

There is **no `?? 0`** here. So for a two-candidate STAR race:

| Ballot | Receipt says (frontend) | Tabulator does (backend) |
|---|---|---|
| `5, 5` | "Abstained" | abstention — consistent |
| `0, 0` | "Abstained" | abstention — consistent |
| `0, null` | shows the marks — **not** an abstention | **abstention — ballot dropped** |
| `null, 0` | shows the marks — **not** an abstention | **abstention — ballot dropped** |

A voter who scores one candidate `0` and leaves the other blank is shown a receipt confirming their ballot, and their ballot is then silently discarded. This is the concrete residue of [#754](https://github.com/Equal-Vote/bettervoting/issues/754) ("ballots with mix of zeros and blanks should not count as abstention"), which was closed without the backend half being done — #754's own thread only ever discusses `pageIsUnderVote`, i.e. the frontend.

*Derived from source; not yet reproduced against production. Worth one screen recording before it is filed.*

## What is stored, and what that permits

The submission path **does** preserve `null`. [`VotePage.tsx:92`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Voting/VotePage.tsx#L92) initialises `score: null`, `Score.score` is `number | null`, and the submit builder at `VotePage.tsx:202-226` passes the value through untouched. This matches the observation in [#1090](https://github.com/Equal-Vote/bettervoting/issues/1090) that *"JSON is correct"* — the null survives to the JSON export, and it is the CSV export and the confirmation UI that collapse it.

So for **UI-cast ballots**, "only a truly blank ballot abstains" is implementable: the data is there, and only the `?? 0` in the tabulator throws it away.

For **bulk-uploaded ballots** it may not be. [`Vote.ts:13`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/shared/src/domain_model/Vote.ts#L13) declares

```ts
export type OrderedVote = number[];
```

— a plain number array, consumed at [`castVoteController.ts:134`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Controllers/Ballot/castVoteController.ts#L134). If an uploaded blank arrives as `0`, then for uploaded elections a blank and an explicit zero are genuinely indistinguishable at rest, and no tabulator rule can separate them. This is the one place where the "just stop coercing null" fix may be **unimplementable rather than merely risky**, and it is the strongest argument for splitting edit (b) out into its own piece of work.

## Where this leaves the argument

The maintainers' position in [#884](https://github.com/Equal-Vote/bettervoting/issues/884) — *"the voter abstained from showing any preferences"* — is a defensible reading of **intent**. It is not a defensible implementation of **counting**, because it does not merely label the ballot, it deletes it. The gap between "we classify this ballot as expressing no preference" and "this ballot does not exist" is where every downstream bug in [`05-issue-map.md`](05-issue-map.md) lives.
