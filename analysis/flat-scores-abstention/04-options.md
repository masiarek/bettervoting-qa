# 04 — Options, cost, and a recommended sequence

Six options and four de-risking moves. Nothing here is a proposal for merge; it is the decision surface, laid out so the trade can be made explicitly.

The key structural point, repeated because it is the whole argument: **what is being called "the fix" is two independent edits with very different costs, and they have been argued as one.**

```ts
// packages/backend/src/Tabulators/Util.ts:96-103
export const makeAbstentionTest = (markAllEqualAsAbstention:boolean = false) => {
	return [
		'nAbstentions',
		(vote: rawVote) => {
            const marks = Object.values(vote.marks).map(m => m ?? 0);   // <-- edit (b)
            return marks.every(m => m === (markAllEqualAsAbstention ? marks[0] : 0));
                                        //  ^-- edit (a)
        }
	] as const;
}
```

- **(a)** stop passing `true` for STAR — `5,5,5` and `3,3,3` become cast votes. Two characters, two call sites.
- **(b)** stop coercing `null → 0` — explicit `0,0,0` becomes distinct from blank. Touches every voting method and hits a data-model wall on bulk uploads.

---

## Option 0 — Do nothing

**Cost:** none. **Risk:** none today.

Leaves: eight tickets open ([#1053](https://github.com/Equal-Vote/bettervoting/issues/1053), [#1052](https://github.com/Equal-Vote/bettervoting/issues/1052), [#1065](https://github.com/Equal-Vote/bettervoting/issues/1065), [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407), [#1090](https://github.com/Equal-Vote/bettervoting/issues/1090), [#906](https://github.com/Equal-Vote/bettervoting/issues/906), [#777](https://github.com/Equal-Vote/bettervoting/issues/777), plus the reopened half of [#754](https://github.com/Equal-Vote/bettervoting/issues/754)); results pages that say *"No votes have been cast"* and name a winner; and BetterVoting results that cannot be reconciled against any other STAR implementation, which undercuts the platform's own auditability pitch.

**Honest verdict:** not tenable as a permanent answer, but it is the *correct* answer for this week — because shipping the fix before [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) puts `NaN%` on live results pages. Do R2 first.

---

## Option A — Fix the labels only

Keep the tabulation rule exactly as it is. Change only what the voter and the reader are told.

**What changes:** `en.yaml` copy, and the submit-dialog branch in `VotePage.tsx`. Stop calling a `5,5,5` ballot "Abstained"; say what actually happened — *"You gave every candidate the same score, so this ballot does not affect the runoff."*

| | |
|---|---|
| **Fixes** | the voter-facing half of #1053; the confirmation-screen half of #1090 |
| **Leaves broken** | #1052, #1065, #1384, #1407, #906; engine reconciliation; the frontend/backend divergence in [`01-the-rule.md`](01-the-rule.md) |
| **Cost** | an afternoon, no backend risk |
| **Retroactive** | no |

**Verdict:** worth doing whatever else is decided — the current copy is actively misleading. It is *not* a fix, and it should not be allowed to close the tabulation tickets.

---

## Option B — Edit (a) only: all-equal is a cast vote *(recommended)*

`Star.ts:13`: `makeAbstentionTest(true)` → `makeAbstentionTest()`.

After this, a STAR ballot abstains under exactly the rule Approval, Plurality and IRV already use: **all marks zero-or-blank**. `5,5,5` and `3,3,3` become cast votes and land in Equal Support. `0,0,0` and `0,null` still abstain.

| | |
|---|---|
| **Fixes** | #1053, #1052, #1065, #1384, #1407 (library cases 07 and 08 both), most of the LH reconciliation |
| **Leaves broken** | #1090 (explicit `0,0` equal-opposition), the #754 backend residue, an all-`0,0,0` election still reporting zero voters |
| **Cost** | 2 characters × 2 call sites, 3 test assertions to re-baseline, **plus R2 as a hard prerequisite** |
| **Outcome change** | none for single-winner or Bloc STAR (verified by execution — [`02-blast-radius.md`](02-blast-radius.md)); **yes for STAR-PR** |
| **Retroactive** | yes, on displayed numbers — mitigate with R3 |

**It also avoids the ugliest reporting anomaly.** Because `makeAbstentionTest()` still tests *"all marks zero"*, an all-`0,0` protest ballot keeps abstaining, so the "four zero-ballots halve every candidate's average" effect in [`03-reporting-anomalies.md`](03-reporting-anomalies.md) § Anomaly 2 **does not happen under this option** — confirmed by execution. That distortion belongs entirely to edit (b), which is blocked on the data model anyway. This is the single strongest reason to split the change.

**Do STAR and STAR-PR separately.** The flag is per-tabulator, so `AllocatedScore.ts:26` can stay `true` while `Star.ts:13` changes. STAR-PR's quota is derived from the tally count and its allocation is not a set of order-preserving comparisons, so it needs its own test matrix before it moves. Decoupling them turns one blocked change into one shippable change plus one scheduled one.

**Also makes the platform internally consistent**, which is a better argument than "the reference engine does it": right now STAR is the only method on BetterVoting that deletes a ballot for expressing equal support.

---

## Option C — The full fix: (a) + (b)

Also drop the `?? 0`, so only a **truly blank** ballot abstains. Exactly matches Larry Hastings' `starvote`.

| | |
|---|---|
| **Fixes** | everything in Option B, plus #1090 and the #754 residue |
| **Blocked by** | [`OrderedVote = number[]`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/shared/src/domain_model/Vote.ts#L13) — bulk-uploaded ballots have no null channel, so for uploaded elections blank and explicit-zero may be genuinely indistinguishable at rest |
| **Also touches** | Approval, Plurality, IRV — an all-zero Approval ballot ("I approve nobody") becomes a cast vote, changing every plurality/approval percentage |
| **Cost** | data-model work, a migration decision, and a policy call on uploaded elections |

**Verdict:** the right end state, the wrong next step. Split it out and let it have its own thread — it is a *data* question, not a tabulation question.

---

## Option D — Three-bucket reporting *(the thing that actually settles the argument)*

Stop making `nTallyVotes` carry two meanings at once. Report three numbers instead of one:

1. **ballots received** — turnout (`nTallyVotes + nAbstentions + nOutOfBoundsVotes`)
2. **ballots counted in this contest** — `nTallyVotes`
3. **ballots expressing a preference between the finalists** — `nTallyVotes − equalSupport`

Then each chart uses the denominator that matches what it claims:

- the **runoff** percentages against (3), which is what the majority marker already uses — so the label and the marker finally agree;
- the **score** chart against (2);
- **turnout** against (1).

This is what dissolves the objection in [`03-reporting-anomalies.md`](03-reporting-anomalies.md) § Anomaly 1. The winner's headline percentage stops collapsing when the Equal Support bar grows, because it is no longer measured against a denominator that includes voters who by definition had no view.

| | |
|---|---|
| **Fixes** | the reporting objection itself, plus a chunk of #777 (reporting conventions) and #906 |
| **Cost** | one derived field in `summaryData`, changes to `ResultsBarChart`, `STARDetailedResults`, `HeadToHeadWidget`, and ~6 i18n strings |
| **Depends on** | nothing — it can land **before** Option B and makes B's landing uneventful |

**Verdict:** the highest-value work on this page. It is also the only option that a maintainer worried about optics can support without conceding the tabulation argument.

---

## Option E — Make it an election setting

`election.settings.all_equal_is_abstention`, defaulting to today's behaviour.

**Verdict: don't.** It delegates a correctness question to election admins who are less equipped to answer it than the maintainers, makes two elections on the same platform non-comparable, doubles the test surface permanently, and — because results are tabulated live — an admin could flip it *after* votes are cast and change the published numbers. The only thing it buys is avoiding the decision.

Listed here because it will be proposed, and it is worth having the counter-argument written down.

---

## The four de-risking moves

These are small, independently landable, and each removes one objection.

### R1 — Fix the chart's split denominator *(independent bug)*

[`ResultsBarChart.tsx:51`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/components/ResultsBarChart.tsx#L51) computes percentage labels over **all** bars; lines 82-90 compute the majority marker over all bars **except the last**. Two denominators, one chart. Today the discrepancy is invisible because Equal Support is usually small.

Fix: pass an explicit `percentDenominator` for the runoff chart that matches the marker, or render both figures. **This is a bug in its own right and should be filed as one**, independent of abstentions.

### R2 — Fix #1035 first *(hard prerequisite)*

When both finalists are preferred over each other zero times, `ResultsPieChart` divides by a zero total and renders `NaN%`. Today the abstention rule hides this by making the widget never render in the worst case. Option B un-hides it.

Fix: guard the zero-total case in [`STARResultSummaryWidget.tsx:50-53`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/frontend/src/components/Election/Results/STAR/STARResultSummaryWidget.tsx#L50-L53) / `ResultsPieChart` and render a "no preference expressed between the finalists" state instead. Two lines plus a string.

**Nothing else on this page should ship before this does.**

### R3 — Date-gate the rule change

Results are tabulated live per request, so a deploy silently changes the reported numbers of every past election. The codebase already documents the mitigation pattern, in [`shuffleCandidatesForRandomTiebreak.ts:29-30`](https://github.com/Equal-Vote/bettervoting/blob/main/packages/backend/src/Tabulators/shuffleCandidatesForRandomTiebreak.ts#L29-L30):

> *"electionCreateDate is currently unused, but if we ever change the approach for shuffling the candidates then we should use electionCreateDate to ensure that old elections still use the old approach"*

`electionCreateDate` is already threaded into the tabulation path and unused. Gating the abstention rule on it means elections created before the cutover keep their published numbers forever, and the change applies only going forward. This turns the scariest objection into a non-event, and it uses a pattern the maintainers wrote themselves.

### R4 — Pin the decision in fixtures

The eight [`Flat_scores_ties`](https://masiarek.github.io/star-voting-library/01_STAR/Flat_scores_ties/index.html) cases already exist as YAML with verified reference output. Land them as tabulator tests asserting `nTallyVotes`, `nAbstentions`, and the winner, with the policy stated in the test name. Then the next person who wonders why `5,5,5` counts does not have to excavate #884.

---

## Recommended sequence

| Step | What | Why now | Blocks? |
|---|---|---|---|
| 1 | **R2** — guard the zero-denominator pie (#1035) | prerequisite for everything else; currently mislabelled "low priority" | — |
| 2 | **R1** — fix the chart's split denominator | independent bug; removes most of the "looks strange" objection in advance | — |
| 3 | **Option A** — fix the misleading copy | zero backend risk; stops telling full-support voters they abstained | — |
| 4 | **Option D** — three-bucket reporting | makes step 5 visually uneventful; settles the actual disagreement | needs 1, 2 |
| 5 | **Option B (STAR only)** + **R3** date gate + **R4** fixtures | the tabulation fix, now boring | needs 1, 4 |
| 6 | **Option B for STAR-PR**, with its own test matrix | quota change needs evidence, not argument | needs 5 |
| 7 | **Option C** — the `null` vs `0` data question | separate thread; starts with "what do bulk uploads store?" | needs 6 |

Steps 1–3 are uncontroversial and can start today. Step 4 is the one worth arguing *for*, because it is what lets step 5 happen without anyone having to lose the #884 argument.

---

## What to ask upstream

Three questions, in the order that unblocks the most:

1. **Was STAR-PR in scope for #884?** The ticket text and the linked code are both about `star.ts`; `AllocatedScore.ts` also passes `true`, and there the rule changes the quota and can change who is seated. If that was not deliberate, it is a separate bug.
2. **What does a bulk-uploaded blank become — `0` or `null`?** `OrderedVote = number[]` suggests there is no null channel. If so, #1090 and #754 are undecidable for uploaded elections and should be scoped to UI-cast ballots only.
3. **Would a date-gated change be acceptable**, given the pattern already documented in `shuffleCandidatesForRandomTiebreak.ts`? If yes, the retroactivity objection disappears and the conversation is only about new elections.
