# Tie-break reporting for auditors — what's reproducible today, and the trap in it

Written to spec a **tie resolution report**: the artefact an auditor needs to verify that a tie in a small election was broken honestly.

The conclusion is more encouraging than expected, with one sharp edge. BV's random tiebreak is **fully deterministic and already reproducible from the JSON export** — we have a working independent replay. But the number a human needs to reproduce it is *not* the number the results page shows, and nothing anywhere says so.

Source read at `bv-copy-fix` @ `88d840d2`.

---

## 1. "Random" is a seeded shuffle, and it is documented as deliberate

`Tabulators/shuffleCandidatesForRandomTiebreak.ts` is 43 lines, half of them a design comment. The whole mechanism:

```js
let seed = (rawVoteCount + hashStringToInt(raceId)) >>> 0;
getTinyRand(0, seed).shuffle(candidates)
candidates.forEach((c, i) => c.tieBreakOrder = i)
```

Called once per race from `getElectionResultsController.ts:141`, with `cvr.length` as `rawVoteCount`.

The file's own header states the intent: *deterministic to ensure that we get the same results regardless of how many times the tabulator is re-run*, and TinyRand was chosen because it is *"written to be language agnostic so that results can be easily reproduced in any programming language."*

That answers the audit questions directly:

| Auditor asks | Answer |
|---|---|
| Was a seed used? | **Yes.** `(rawVoteCount + hash(raceId)) >>> 0` |
| Is the seed in the election config? | **No — it is derived, not configured.** Nothing to set, nothing to leak |
| What was the candidate sequence? | Recorded as `tieBreakOrder` (0-based) on every candidate |
| Can the draw be reproduced? | **Yes**, and we have done it independently |
| Does any ballot's *content* affect it? | **No.** Only the ballot *count* and the race id |

**Independent replay exists.** [`tools_adam/bv_replay_tiebreak.py`](https://github.com/masiarek/star-voting-library/blob/master/STARVote_LH_tabulation_engine/tools_adam/bv_replay_tiebreak.py) in the library is a stdlib-only Python port of TinyRand + the seed formula. It takes a frozen `_bv_export.json` and reprints the order. Verified live at 3 candidates (BV2261 `y2fbpc`) and 9 (BV2262 `2gvwr9`, all nine positions matched).

So the honest headline for an auditor is: **BV's tiebreak is more auditable than most, and the report is a rendering job, not new machinery.**

---

## 2. The trap: the displayed vote count is the wrong one

The seed's first term is the **raw** ballot count — `cvr.length`, every ballot as cast. The results page shows **tally** votes, which is a filtered subset. The source flags the distinction explicitly (`shuffleCandidatesForRandomTiebreak.ts:13-15`):

> Raw votes is not to be confused with Tally Votes … The Tally Votes filters out invalid votes from the Raw Votes so the count is often smaller.

And the results shape carries the three parts separately (`ITabulators.ts:60-63`):

```ts
// nVotes = nOutOfBoundsVotes + nAbstentions + nTallyVotes
nOutOfBoundsVotes: number,
nAbstentions: number,
nTallyVotes: number,
```

**There is no `nVotes` field.** The identity lives in a comment. So:

- An auditor who reads the vote count **off the results page** gets `nTallyVotes` and computes the **wrong seed** — silently, with no error, producing a plausible-but-wrong order. The natural conclusion is *"BV's tiebreak doesn't reproduce"*, i.e. an integrity accusation caused entirely by a reporting gap.
- Reproducing it correctly requires summing **three** fields, and knowing to.
- Our replay tool sidesteps this by counting `len(data["Ballots"])` from the JSON export (`bv_replay_tiebreak.py:148`) rather than trusting any displayed total — which is why it worked, and why the trap didn't surface until now.

**This is the single most valuable thing a tie report could state**, and it is in neither #1432 nor anywhere else.

---

## 3. Second finding: no algorithm version is recorded

`shuffleCandidatesForRandomTiebreak` takes `electionCreateDate` as its **first argument and never uses it**. The reason is in a comment at :31-32:

> electionCreateDate is currently unused, but if we ever change the approach for shuffling the candidates then we should use electionCreateDate to ensure that old elections still use the old approach

The forethought is good. But **nothing in the export records which shuffle version produced a given result.** The day the approach changes, every historical audit becomes silently irreproducible — a replay tool will compute a valid-looking order that simply isn't the one that decided the election, with no signal that anything moved.

A tie report should carry an explicit `tiebreak_algorithm_version` (or at minimum the `election.create_date` the dispatch would key on). Cheap now; unrecoverable later.

---

## 4. What a tie resolution report should contain

Per race where `tieBreakType != 'none'`:

**Reproducibility block** — the new part, none of it currently surfaced:

| Field | Source | Why |
|---|---|---|
| `tieBreakType` | already tracked per round | which rung decided it: `score` / `head_to_head` / `five_star` / `random` |
| `rawVoteCount` | `cvr.length` | **the seed input.** Must be stated explicitly, *not* left to be inferred from a displayed total |
| `nTallyVotes`, `nAbstentions`, `nOutOfBoundsVotes` | already in results | shows the auditor *why* raw ≠ displayed, so the gap reads as expected rather than as a discrepancy |
| `raceId` | already exported | the other seed input |
| computed `seed` | derivable | stating it turns a re-derivation into a one-line check |
| `tieBreakOrder` per candidate, ascending | already computed | the sequence itself |
| `tiebreak_algorithm_version` | **does not exist** | §3 |
| the ballot count is the *only* ballot-derived input | — | worth stating in words: no ranking, score or preference touches the draw. It is what makes the draw non-manipulable by a voter |

**Narrative block** — this is #1432's existing ask, already well specified there: render `roundResults.logs` (`score_tied`, `pairwise_too_many_candidates`, `five_star_tied`, `random_first`, …) so a reader sees *"3-way score tie → five-star count → random shuffle"*.

**One consequence worth stating plainly in the report**, because it surprises people and sounds like a defect when discovered late: the tiebreak order **changes with every ballot cast** (it is seeded on the count — the source calls this *"the tiebreak priority is reset after every vote"*, `:13`). So it **cannot be published before polls close**, and any pre-announced order would be meaningless. That is a deliberate anti-manipulation property, not an omission — but an auditor who works it out unaided will assume the worst.

---

## 5. On the "predefined tiebreak list" feature

Correct that BV has no predefined/pre-registered tiebreak order today — the order is *derived*, never *configured*. Two notes for when it is built:

1. **It is a different trust model, not a better one.** A derived order can't be gamed by whoever configures the election, because nobody chooses it; a predefined list can be, unless it is committed before voting opens. If the feature lands, the report needs the **commitment timestamp**, not just the list — a list exported alongside the result proves nothing about when it was fixed.
2. **The report should say which mode was used.** Once both exist, `derived` vs `predefined` becomes a required field, and old elections must keep reporting `derived`. Same versioning concern as §3.

Worth adding to the feature request now, while it is cheap.

---

## 6. Where this goes

- **#1432 already covers the narrative half** ([Surface tie-break explanations in results UI + JSON/CSV export](https://github.com/Equal-Vote/bettervoting/issues/1432)) and covers it well — it correctly identifies the logs as already-computed and the work as plumbing. **Comment on it** with §2 and §3 rather than opening a rival issue.
- §2 is the priority. A wrong-seed reproduction attempt looks like evidence of dishonesty, which is the exact failure a tie report exists to prevent.

### On a separate "extended / detailed reports & stats" issue

Worth doing **as an epic that indexes the existing issues**, not as a fresh wishlist. There are **88 open issues** matching `report|export|csv|download|statistics|quorum`, most labelled `Complexity: Missing`, many filed by us and mutually overlapping. A 89th list of desirable reports would join the pile; a tracking issue that groups them into themes — ballot data export · voter status & quorum · tabulation transparency · text/interchange formats — and names the first slice of each makes the other 88 navigable and is a real contribution.

That framing also survives the obvious objection, which is worth pre-empting in the issue body itself: the value is in the *index*, not in new asks.

---

## Related

- [`analysis/reporting-and-voter-status-map.md`](reporting-and-voter-status-map.md) — the roll/email/quorum half
- Upstream: [#1432](https://github.com/Equal-Vote/bettervoting/issues/1432) · [#1379](https://github.com/Equal-Vote/bettervoting/issues/1379) (the 3-way score tie it split from)
- Library: `05_Ranked_Robin/01_Learn/rr_tiebreak_lh_vs_bv.md` — LH vs BV tiebreak ladders; `tools_adam/bv_replay_tiebreak.py` — the replay
