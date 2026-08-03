# DRAFT — not posted

Ticket drafted 2026-08-02 for `Equal-Vote/bettervoting`. **Nothing has been posted upstream.** Awaiting Adam's review.

Two notes before it goes anywhere:

- **No live BetterVoting election reproduces this yet.** Everything below was executed against the real `Star()` tabulator with hand-built CVR input, and the `marks`-construction premise was read from `getElectionResultsController.ts`. Building an actual election on bettervoting.com with an approved write-in is the obvious next step and would make the report much harder to wave off. Per this repo's conventions, that gap is stated in the ticket itself rather than glossed.
- **Deliberately framed as independent of [#884](https://github.com/Equal-Vote/bettervoting/issues/884).** This is a bug under the current policy, whatever anyone thinks of that policy. The abstention-policy argument is mentioned once, at the end, as a note — not as the ask. Leading with #884 would turn a fixable bug into a rerun of a year-old disagreement.

---

## Title

**Approving a write-in silently discards ordinary ballots as "abstentions" — and can change the winner**

## Body

### Summary

When a write-in candidate is approved in a STAR race, ballots that scored **every official candidate equally and non-zero** are classified as abstentions and dropped from the tally entirely — no score, no pairwise contribution, not counted in the voter total.

Those ballots are not abstentions. Relative to the actual candidate set they express a clear preference: *every official candidate over the write-in.* Discarding them can hand the race to the write-in.

The trigger is that a ballot's `marks` object only contains keys for candidates **that ballot listed**, while the abstention test runs on those raw keys, before the ballot is normalised over the full candidate set.

### Reproduction

Race with two official candidates **A** and **B**, write-in **C** submitted by one voter and approved. Seven ballots:

```
4 × {A:4, B:4}          ← ordinary ballots; no key for C, because these voters didn't write C in
    {A:4, B:2, C:3}
    {A:0, B:3, C:5}
    {A:1, B:2, C:0}
```

Executed against `Star()` at `8d2b3f9`:

| | Current behaviour | If the four `{A:4,B:4}` ballots are counted |
|---|---|---|
| Tally votes | **3** | 7 |
| Abstentions | **4** | 0 |
| Scores | C 8, B 7, A 5 | B 23, A 21, C 8 |
| Finalists | C, B | B, A |
| **Winner** | **C — the write-in** | **B** |

No tie-break is involved in either run (`tieBreakType = none`).

Four of the seven voters gave both official candidates four stars. Every one of those ballots was discarded, and the race was decided by the three ballots that happened to mention the write-in — electing a candidate that exactly one voter scored above zero.

### Root cause

`marks` is built only from the scores a ballot actually carries — [`getElectionResultsController.ts:77-104`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Controllers/Election/getElectionResultsController.ts#L77-L104). A write-in key is added only for the voter who wrote that name in:

```ts
const marks: {[key: string]: number | null} = {}
vote.scores.forEach(score => {
    const isRegularCandidate = race.candidates.some(c => c.candidate_id === score.candidate_id)
    if (isRegularCandidate) { marks[score.candidate_id] = score.score }
    else if (race.enable_write_in && score.write_in_name) { /* … only if this ballot wrote it in */ }
})
```

The abstention test then runs on those raw keys — [`Util.ts:96-103`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Util.ts#L96-L103):

```ts
const marks = Object.values(vote.marks).map(m => m ?? 0);
return marks.every(m => m === (markAllEqualAsAbstention ? marks[0] : 0));
```

and the normalisation over the full candidate set happens **only after a ballot survives the test** — [`Util.ts:120-131`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Util.ts#L120):

```ts
tallyVotes.push({
  ...rawVote,
  marks: Object.fromEntries(candidateIds.map(id => [id, rawVote.marks[id] ?? 0]))
})
```

So `{A:4, B:4}` is tested as `[4, 4]` → "all equal" → abstention, when the ballot the tabulator would actually have counted is `{A:4, B:4, C:0}` → not all equal, and strictly preferring both officials over C.

### Scope

- Affects **STAR** and **STAR-PR**, which pass `makeAbstentionTest(true)` ([`Star.ts:13`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/Star.ts#L13), [`AllocatedScore.ts:26`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/AllocatedScore.ts#L26)).
- Approval, Plurality and IRV are unaffected: their test is "all marks zero", which is invariant under zero-filling missing keys.
- Only ballots that are flat and **non-zero** over the officials are affected. A ballot that is flat at zero would be an abstention either way.

**How often:** in 17,248 randomised STAR elections with 2–3 official candidates, one approved write-in, 3–12 voters, and 40% of ballots flat over the officials, the winner changed in **978 (5.7%)** once those ballots were counted. The rate scales with the share of flat ballots, so it is highly election-dependent — but "voters who like the whole official slate equally" is a normal thing to have on a ballot, not a contrived one.

### Suggested fix

Normalise before testing, rather than after: build the candidate-set-complete `marks` first and run the stat tests against that. In `filterInitialVotes`, compute

```ts
const normalized = { ...rawVote, marks: Object.fromEntries(candidateIds.map(id => [id, rawVote.marks[id] ?? 0])) };
```

and pass `normalized` to the tests, pushing the same object to `tallyVotes`.

This is behaviour-preserving for every ballot that already covers the full candidate set, so it does not touch the [#884](https://github.com/Equal-Vote/bettervoting/issues/884) policy question at all — it just applies that policy to the ballot the tabulator actually counts.

`writeIns.test.ts` currently has no case combining write-ins with the abstention path; the reproduction above would make a good regression test.

### Note

Independently, dropping `markAllEqualAsAbstention` for STAR would also fix this class, since "all marks zero" is invariant under zero-filling and "all marks equal" is not. That is the #884 discussion and shouldn't block this fix either way.

---

## Provenance

| Claim | How established |
|---|---|
| `marks` built only from `vote.scores` | read from `getElectionResultsController.ts:77-104` |
| Abstention test runs pre-normalisation | read from `Util.ts:96-131` |
| The 7-ballot counterexample | **executed** against real `Star()` at `8d2b3f9`, both flag settings |
| 978/17,248 flip rate | **executed** — own two-pass fuzz, seeded PRNG, generator described in the ticket |
| Approval/Plurality/IRV unaffected | reasoned from the `every(m => m === 0)` test; **not** separately fuzzed |
| Live BetterVoting election | **not done** — stated as a gap in the ticket |

A claim that the sandbox CSV parser is a second source of sparse ballots was **checked and dropped**: `Sandbox.tsx:38-48` length-checks each row against `nCandidates` and raises an error, so short rows don't reach the tabulator.
