# 05 — The ticket web, and the join onto the existing index

> **Read the roster first, not here.** `star-voting-library` already carries the canonical abstention ticket map — [`07_Concepts/tabulation_engines/BV/abstain_issues_index.md`](https://github.com/masiarek/star-voting-library/blob/master/07_Concepts/tabulation_engines/BV/abstain_issues_index.md) — organised by theme (policy · UI mislabel · export ambiguity · tabulation semantics), with BV test IDs, live elections, and the reproduced library cases. This page does **not** mirror it.

What this page adds is the thing the roster doesn't have: **causal attribution.** Which half of the rule produces each ticket, and therefore which tickets close together. That is the join, and it is what turns eleven separate triage decisions into one.

---

## 🔴 First, the thing that is actually blocking #1407

**Every evidence link posted on [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407) is a dead 404.** The repo was renamed `masiarek/YAML` → `masiarek/star-voting-library`; GitHub's repo-level redirect still works, but the `01_Single_winner/` tree was reorganised into `01_STAR/`, so the *paths* no longer resolve.

Checked 2026-08-02, following redirects:

| Link posted on | Path | Status |
|---|---|---|
| #1407 | `01_Single_winner/pet_real_bv_election/small_abstention_c2_b5_lesson.md` | **404** |
| #1407 | `01_Single_winner/pet_real_bv_election/small_case_abstention_lesson.md` | **404** |
| #1407 | `01_Single_winner/runoff_overturns_leader/Runoff_07_flat_ballot_bv_bug_tf73v9.md` | **404** |
| #1407 | `01_Single_winner/pet_real_bv_election/LH_BV_reconciliation_issue.md` | **404** |
| #884 | `00_start_here/tabulation_engines/BV/abstain_issues_index.md` | **404** — moved to `07_Concepts/` |
| #884, #1053, #1090 | `01_STAR/abstain_bugs/bv11_6xhfp8_full_equal_support.md` | 200 ✅ |

@jacksonloper said so on the ticket on 2026-07-15 — *"getting 404s from those links"* — and #1407 has been silent since. **The issue is not stalled on disagreement. It is stalled because its entire evidence base is unreachable.**

Fixing four URLs is the highest-value, lowest-risk action available on this whole topic, and it costs one comment.

---

## The root

| Ticket | State | What it is |
|---|---|---|
| [#884 — Update abstain behavior for STAR](https://github.com/Equal-Vote/bettervoting/issues/884) | **closed** | The policy decision: count as abstain "if they're all equal as well (all threes, all zeros, mix of zeros and nulls)". Decided by Sara, Annie, Ruben & Arend. Adam dissented on the record at the time |

Because #884 is *closed*, each consequence gets triaged as a fresh, isolated bug — and each one looks small enough to defer. That is the mechanism by which this has not moved in a year.

## Causal attribution — which half of the rule causes what

The rule is two edits (see [`04-options.md`](04-options.md)). Sorting the tickets by which one causes them is what makes the fix schedulable:

### Caused by edit (a) — `markAllEqualAsAbstention`

These close together, with a two-character change plus the R2 prerequisite. **None of them is on the existing roster.**

| Ticket | State | Symptom |
|---|---|---|
| [#1053](https://github.com/Equal-Vote/bettervoting/issues/1053) | open, relabelled **Discussion** | `5,5` full-support ballot told it abstained; `nTallyVotes: 0` and a winner declared |
| [#1407](https://github.com/Equal-Vote/bettervoting/issues/1407) | open | Flat ballots dropped; BV and the reference engine cannot be reconciled |
| [#1052](https://github.com/Equal-Vote/bettervoting/issues/1052) | open, **High Priority** | *"no ballots have been cast"* with 3 ballots present |
| [#1065](https://github.com/Equal-Vote/bettervoting/issues/1065) | open | Same, Bloc STAR, three `5,5,5` ballots |
| [#1384](https://github.com/Equal-Vote/bettervoting/issues/1384) | **closed** | Same again, `5,5` / `4,4` ballots — closed without the rule changing |

### Caused by edit (b) — the `?? 0` coercion

These need the data-model conversation and cannot close with (a).

| Ticket | State | Symptom |
|---|---|---|
| [#1090](https://github.com/Equal-Vote/bettervoting/issues/1090) | open | Explicit `0,0` "equal opposition" filed as abstention; CSV can't distinguish `0` from blank |
| [#754](https://github.com/Equal-Vote/bettervoting/issues/754) | **closed** | Closed on the frontend half only. The backend still drops `[0, null]` — see [`01-the-rule.md`](01-the-rule.md) |
| [#894](https://github.com/Equal-Vote/bettervoting/issues/894) | **closed** | Plurality: "all three votes are abstentions, yet we claim victory"; wrong voter count |
| [#791](https://github.com/Equal-Vote/bettervoting/issues/791), [#1160](https://github.com/Equal-Vote/bettervoting/issues/1160) | open | Export ambiguity — on the roster; both are downstream of the same coercion |

### Caused by the denominator, not the rule

| Ticket | State | Symptom |
|---|---|---|
| [#906](https://github.com/Equal-Vote/bettervoting/issues/906) | open | Average Supporter Profile doesn't reconcile — `nTallyVotes` is the denominator |
| [#777](https://github.com/Equal-Vote/bettervoting/issues/777) | open, Discussion | The umbrella: what should the reporting vocabulary be. Option D in `04-options.md` is a concrete answer to it |

### The prerequisite, misfiled as a sibling

| Ticket | State | Why it inverts the priority order |
|---|---|---|
| [#1035](https://github.com/Equal-Vote/bettervoting/issues/1035) | open, marked *"low priority"* | An independent zero-denominator bug in the runoff pie. Today's abstention rule **hides** it by making the widget never render in the worst case. Fixing the abstention rule without fixing this ships `NaN%` onto live results pages. It is a two-line guard and it gates everything else |

## Adjacent, frequently conflated, actually separate

| Ticket | Why it's separate |
|---|---|
| [#1379](https://github.com/Equal-Vote/bettervoting/issues/1379) | Tie-break *protocol* — BV deliberately skips head-to-head for 3+-way ties. WAI; the LH divergence is lot-vs-random |
| [#1063](https://github.com/Equal-Vote/bettervoting/issues/1063) | Reproducibility of the random rung. Orthogonal — though flat-score elections reach that rung most often |
| [#1432](https://github.com/Equal-Vote/bettervoting/issues/1432) | Display of `roundResults.logs`. Would make these cases legible either way |
| [#1420](https://github.com/Equal-Vote/bettervoting/issues/1420) | v2 export. Relevant only in that the `nAbstentions` / `nTallyVotes` semantics should be documented in v2 whatever the rule becomes |

## Reverse index — where each ticket is covered

For when you have an issue number and want the analysis. `SVL` = [star-voting-library](https://github.com/masiarek/star-voting-library), `BVQA` = this repo.

| Issue | Roster | Reproduction (SVL) | Analysis (BVQA) |
|---|---|---|---|
| #884 | ✅ theme A | `01_STAR/abstain_bugs/` | `01-the-rule.md`, `04-options.md` |
| #1053 | ✅ theme B | `abstain_bugs/bv11_6xhfp8_full_equal_support.md` | `03-reporting-anomalies.md` |
| #1090 | ✅ theme B | `abstain_bugs/bv655_jfrk9t_equal_opposition.md` | `01-the-rule.md` (edit (b)) |
| #894 | ✅ theme D | `abstain_bugs/bv1570_6hv7jf_undecided_plurality.md` | this page |
| #791, #1160, #518, #252, #627, #1421 | ✅ | — | not covered here (label/export cluster) |
| #1407 | — | `Flat_scores_ties/` cases 07, 08 | **all five pages** |
| #1052, #1065, #1384 | — | `Flat_scores_ties_06`, `_08` | `02-blast-radius.md`, `03-reporting-anomalies.md` |
| #1035 | — | `Flat_scores_ties_02`, `_07` | `03-reporting-anomalies.md` § Anomaly 3 — **prerequisite** |
| #906, #777 | — | — | `04-options.md` Option D |

**Net:** the roster carries six tickets this analysis doesn't touch (the label/export cluster); this analysis carries eight the roster doesn't (the counts-and-charts cluster). They are complementary, not overlapping — keep both, and keep the roster canonical for "which tickets exist".

## The one-paragraph pitch for reopening #884

> #884 decided a *labelling* question — "did this voter express a preference?" — and the implementation answered a *counting* question, by removing the ballot from the tally entirely. Nine tickets since then are consequences of that gap, four of which have been closed without the underlying rule changing. The label may well be right. The deletion is not: it is what produces "0 tallied votes" pages that still name a winner, and it is why BetterVoting results cannot be reconciled against any other STAR implementation. Reopening #884 to separate the two questions would let eight tickets close — and, verified by running BV's own tabulator, without changing the winner of a single single-winner or Bloc STAR election.
