# #1407 / #884 — link fix posted 2026-08-02

Two comments posted upstream, both purely corrective — no new argument, no new tickets.

- [#1407 comment](https://github.com/Equal-Vote/bettervoting/issues/1407#issuecomment-5161778279)
- [#884 comment](https://github.com/Equal-Vote/bettervoting/issues/884#issuecomment-5161778346)

## Why

@jacksonloper commented on #1407 on 2026-07-15: *"getting 404s from those links"*. The thread has been silent since. All four evidence links in the issue body were dead, so the issue had no readable basis.

Cause: the repo was renamed `masiarek/YAML` → `masiarek/star-voting-library`, **and** the `01_Single_winner/` tree was reorganised into `01_STAR/`. GitHub's repo-level redirect survives a rename, so `masiarek/YAML/...` still redirects — but the redirect lands on a path that no longer exists, producing a 404 rather than an obvious "repo moved". That is why it wasn't noticed: the links look like they should work.

The same rename killed the `abstain_issues_index.md` link in the #884 comment (moved `00_start_here/` → `07_Concepts/`). The `01_STAR/abstain_bugs/` links in that comment were unaffected.

## Link audit, 2026-08-02 (following redirects)

| Posted on | Old path | Status | Replacement |
|---|---|---|---|
| #1407 | `01_Single_winner/pet_real_bv_election/small_abstention_c2_b5_lesson.md` | 404 | `01_STAR/pet_real_bv_election/small_abstention_c2_b5_lesson.md` |
| #1407 | `01_Single_winner/pet_real_bv_election/small_case_abstention_lesson.md` | 404 | `01_STAR/pet_real_bv_election/small_case_abstention_lesson.md` |
| #1407 | `01_Single_winner/runoff_overturns_leader/Runoff_07_flat_ballot_bv_bug_tf73v9.md` | 404 | `01_STAR/runoff_reversal_bv_cases/Runoff_07_flat_ballot_bv_bug_tf73v9.md` |
| #1407 | `01_Single_winner/pet_real_bv_election/LH_BV_reconciliation_issue.md` | 404 | `01_STAR/pet_real_bv_election/LH_BV_reconciliation_issue.md` |
| #884 | `00_start_here/tabulation_engines/BV/abstain_issues_index.md` | 404 | `07_Concepts/tabulation_engines/BV/abstain_issues_index.md` |
| #884, #1053, #1090 | `01_STAR/abstain_bugs/bv11_6xhfp8_full_equal_support.md` | 200 ✅ | — |

All five replacements verified 200.

The #1407 comment also points at [Flat scores, ties & tie-breaking](https://masiarek.github.io/star-voting-library/01_STAR/Flat_scores_ties/index.html), which post-dates the issue and contains the closest cases (07 fully-flat, 08 every-ballot-flat).

## Worth doing once

Any other comment linking `masiarek/YAML` paths under a directory that has since moved is silently broken the same way. A sweep of Adam's upstream comments for `masiarek/YAML/blob/master/01_Single_winner/` and `/00_start_here/` would catch the rest. Not done yet.

## Not posted

The analysis in [`analysis/flat-scores-abstention/`](../analysis/flat-scores-abstention/) — the two-edits split, the verified winner-invariance result, #1035 as a prerequisite, and the `ResultsBarChart` split-denominator bug — was deliberately held back. Adam's call, 2026-08-02: fix the links first, decide on the argument separately.
