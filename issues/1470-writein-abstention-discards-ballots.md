# #1470 — write-in abstention discards ordinary ballots

**Posted upstream 2026-08-02: [Equal-Vote/bettervoting#1470](https://github.com/Equal-Vote/bettervoting/issues/1470)**
**Fix written 2026-08-20**, on branch `fix/1470-write-in-abstention-normalization`, commit `c2fc5bd8`, off upstream `main` @ `454a38ae`, in clone `bv-1470`. **Local only — not pushed, no PR, nothing posted on the issue** (🚦 [PR freeze](../docs_proposals/PARKED_ready_for_bv.md)). See [The fix](#the-fix--written-parked-under-the-pr-freeze) below.

Live repro: **[bettervoting.com/43jp39/results](https://bettervoting.com/43jp39/results)** (BV-WI1, created 2026-08-02, publicly readable, results verifiable with one unauthenticated `curl`).

Filed as a bug **independent of [#884](https://github.com/Equal-Vote/bettervoting/issues/884)** — it is wrong under the current policy, whatever anyone decides about that policy. The suggested fix (normalise `marks` over the candidate set *before* running the stat tests rather than after) is behaviour-preserving for any ballot that already covers every candidate, so it needs no policy decision. #884 is mentioned once, in a closing note.

## Housekeeping

- **Claimed and closed, 2026-08-02.** Ownership transferred to the signed-in `Admin1` account, and the election was then set to `closed`. Closing matters: it was `state: open` with `voter_access: open`, so anyone reading #1470 could have cast a ballot and altered the tallies the issue cites. Results remain publicly readable (`public_results: true`) and verified unchanged after closing — race 1 `tally=3, winner=Cedar`; race 2 `tally=7, winner=Ben`.
- **The claim key is deliberately not in this repo** — it grants ownership and this repo is public. It is in the session notes, and it is now spent: `owner_id` is an account id rather than a `v-` temp id, so `tempUserAuth` can never be satisfied again and `canClaimElection` can never be re-granted. **The claim is one-way** — only a `system_admin` could move ownership now.
- **`vgwvjr` is an orphan.** A first attempt set `owner_id` to a bare UUID. The guest-ownership gate (`elections.controllers.ts:86-97`) requires `owner_id` to follow the `v-` temp-id convention **and** a `{election_id}_claim_key` cookie hashing to the stored `claim_key_hash`; a bare UUID can never obtain the owner role. It holds the same ballots but its write-in could not be approved, and it can't be administered or deleted. Harmless, but it's there.
- **Correction worth carrying forward:** administering a guest-created election needs the claim-key cookie as well as `temp_id`. The earlier `mj26yj` retest election has a bare-UUID owner too, so it is in the same position.

## The fix — written, parked under the PR freeze

Exactly the normalise-first change the issue proposed, applied in `filterInitialVotes`
(`packages/backend/src/Tabulators/Util.ts:117`, at `main` @ `454a38ae`): build the
candidate-set-complete `marks` **before** the stat tests run, test that object, and push the same
object to `tallyVotes`.

```diff
   rawVotes.forEach(rawVote => {
+    const normalizedVote: vote = {
+      ...rawVote,
+      marks: Object.fromEntries(candidateIds.map(id => [id, rawVote.marks[id] ?? 0]))
+    };
     // using a classic loop so that I can return out of it
     for(let i = 0; i < tests.length; i++){
       let [statName, statTest] = tests[i];
-      if(statTest(rawVote)){
+      if(statTest(normalizedVote)){
         summaryStats[statName] = (summaryStats[statName] ?? 0)+1;
         return;
       }
     }
     summaryStats.nTallyVotes++;
-    tallyVotes.push({
-      ...rawVote,
-      marks: Object.fromEntries(candidateIds.map(id => [id, rawVote.marks[id] ?? 0]))
-    })
+    tallyVotes.push(normalizedVote)
   })
```

### Before

1. **Production, live, 2026-08-20** — [`../analysis/1470-probe/live-43jp39.out`](../analysis/1470-probe/live-43jp39.out): race 1 (Cedar an approved write-in) `tally=3, abstentions=4, winner=Cedar (8, Ben 7, Ann 5)`; race 2 (Cedar official, same seven ballots) `tally=7, abstentions=0, winner=Ben (23, Ann 21, Cedar 8)`. Unchanged since filing.
2. **The new tests against unpatched `main`** — [`../analysis/1470-probe/jest-before.out`](../analysis/1470-probe/jest-before.out): both result assertions fail with `nAbstentions: Expected 0, Received 4` — the tabulator-level reproduction in `Star.test.ts` and the end-to-end write-in flow in `writeIns.test.ts` (cast 7 ballots, approve the write-in, fetch results).

### After

[`../analysis/1470-probe/jest-after.out`](../analysis/1470-probe/jest-after.out): all 49 tests in the two suites pass — the four flat ballots count, race totals equal the official-candidate twin (`Ben 23, Ann 21, Cedar 8`, Ben elected, `nTallyVotes 7, nAbstentions 0`). Full backend suite `179 passed, 179 total` (main's 174 plus the 5 added); `npx tsc --noEmit` clean.

### Tests added

All on the same commit. Three groups:

- **`Star.test.ts` — "Ballots that never mentioned the write-in still count"**: the 43jp39 profile fed straight to `Star()` with marks objects that genuinely lack the Cedar key (the existing `mapMethodInputs` helper can't produce a missing key — it writes `null`, which the tests already read as 0 — which is why no existing test ever hit this).
- **`Star.test.ts` — "A ballot that is flat and non-zero over the FULL candidate set is still an abstention"**: pins that the [#884](https://github.com/Equal-Vote/bettervoting/issues/884)/[#1508](https://github.com/Equal-Vote/bettervoting/issues/1508) `markAllEqualAsAbstention` policy is untouched — a fix that "simplified" the policy away would fail it.
- **`writeIns.test.ts` — "Approving a write-in must not discard flat official-slate ballots (#1470)"**: the full API flow (create, cast seven ballots, `setWriteInResults`, `GET /API/ElectionResult`) asserting `nTallyVotes 7, nAbstentions 0`, scores `Bob 23 / Alice 21 / Cedar 8`, Bob elected. Closes the gap the issue named: `writeIns.test.ts` had no case combining write-ins with the abstention path.

### Blast radius

- **Which ballots change classification:** only ballots whose `marks` lack a key for some candidate in the race. For a ballot that covers every candidate, zero-filling is a no-op and every stat test reads exactly what it read before (`makeAbstentionTest` already coerced `null` to 0; `makeBoundsTest` skipped `null`, and a filled-in 0 is in bounds for every method — every tabulator passes `minValue: 0`).
- **Methods:** STAR and Allocated Score (`makeAbstentionTest(true)`) are where winners can change — the flat-over-officials class now counts. Approval, Plurality, IRV/STV and Ranked Robin use the all-marks-zero test, which is invariant under zero-filling (a ballot with no key and a ballot with an explicit 0 were already the same to it); their counts cannot move.
- **Key filtering:** normalisation also drops any mark key that is *not* in the candidate set before the tests run. No live caller produces such keys today — `getElectionResultsController` only emits official-candidate and approved-write-in ids, and the sandbox length-checks each CSV row — so this is a behaviour change only for hypothetical future callers, and the right one (a disregarded score should not decide whether a ballot is an abstention).
- **Sibling issue [#1478](https://github.com/Equal-Vote/bettervoting/issues/1478)** (a partial ballot whose marks are all equal is dropped): the same root cause whenever the partial ballot reaches the tabulator as *missing keys*. Whether the BV2105 `r4dqvd` ballots are stored as missing keys or as explicit `null`s decides whether this fix also closes that report — worth re-testing #1478 after this deploys rather than assuming.
- **Retroactivity:** results are tabulated per request (nothing cached), so the day this deploys, `43jp39` race 1 flips from `Cedar (3 tallied, 4 abstentions)` to `Ben 23 / Ann 21 / Cedar 8 (7 tallied, 0 abstentions)` — identical to race 2. That flip is the deployment check; [BV2263](../test_cases/BV2263-writein-discards-ballots.md) carries it as the post-fix verification.

### What could not be verified

| Claim | How established |
|---|---|
| Live before-numbers on 43jp39 | **executed** — production API, 2026-08-20 |
| Both new result assertions fail on unpatched `main` | **executed** — jest, Util.ts reverted to `origin/main`, tests kept |
| All green with the fix; full suite; tsc | **executed** — 49/49, 179/179, tsc exit 0 |
| Approval/Plurality/IRV/RR counts cannot move | reasoned from the all-zero test's invariance under zero-fill; **not** separately fuzzed |
| #1478 is the same root cause | **prediction** — depends on how those ballots' marks are stored; re-test after deploy |
| The results page flip on 43jp39 | **prediction** — per-request tabulation read from source; not seen in a browser against a patched stack |

## What was posted

Everything below the line is the issue body as filed.

---

## Title

**Approving a write-in silently discards ordinary ballots as "abstentions" — and can change the winner**

## Body

### Summary

When a write-in candidate is approved in a STAR race, ballots that scored **every official candidate equally and non-zero** are classified as abstentions and dropped from the tally entirely — no score, no pairwise contribution, not counted in the voter total.

Those ballots are not abstentions. Relative to the actual candidate set they express a clear preference: *every official candidate over the write-in.* Discarding them can hand the race to the write-in.

The trigger is that a ballot's `marks` object only contains keys for candidates **that ballot listed**, while the abstention test runs on those raw keys, before the ballot is normalised over the full candidate set.

### Reproduction — live on bettervoting.com

**<https://bettervoting.com/43jp39/results>**

One election, **two races, same seven ballots, same voters**. The only difference is whether Cedar is a write-in or an official candidate:

| | Race 1 — Cedar is an approved **write-in** | Race 2 — Cedar is an **official candidate** |
|---|---|---|
| Voters reported | **3** | **7** |
| Abstentions | **4** | 0 |
| Scores | Cedar 8, Ben 7, Ann 5 | Ben 23, Ann 21, Cedar 8 |
| **Winner** | **Cedar** | **Ben** |
| Tie-break | none | none |

The ballots (identical in both races):

```
4 × Ann 4, Ben 4      ← these voters did not write Cedar in
    Ann 4, Ben 2, Cedar 3
    Ann 0, Ben 3, Cedar 5
    Ann 1, Ben 2, Cedar 0
```

Four of the seven voters gave both official candidates four stars. In race 2 those ballots count, because Cedar is simply left blank on them. In race 1 they are **discarded as abstentions**, and the race is decided by the three ballots that happened to mention the write-in — electing a candidate exactly one voter scored above zero.

Nothing here is contrived: write-ins are a normal feature, and "I like both of the official candidates equally" is the most ordinary ballot there is.

Anyone can verify without logging in:

```bash
curl -s https://bettervoting.com/API/ElectionResult/43jp39 \
  | jq '.results[] | {tally: .summaryData.nTallyVotes, abstentions: .summaryData.nAbstentions, winner: .elected[0].name}'
```

The same numbers reproduce by running `Star()` directly at `8d2b3f9` on the equivalent CVR.

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
| The 7-ballot counterexample | **executed** against real `Star()` at `8d2b3f9`, both flag settings — **and reproduced live** on bettervoting.com (`43jp39`), numbers identical |
| 978/17,248 flip rate | **executed** — own two-pass fuzz, seeded PRNG, generator described in the ticket |
| Approval/Plurality/IRV unaffected | reasoned from the `every(m => m === 0)` test; **not** separately fuzzed |
| Live BetterVoting election | **done** — `43jp39`, created via the public API as a guest, write-in approved via `setWriteInResults`, results readable anonymously |

A claim that the sandbox CSV parser is a second source of sparse ballots was **checked and dropped**: `Sandbox.tsx:38-48` length-checks each row against `nCandidates` and raises an error, so short rows don't reach the tabulator.
