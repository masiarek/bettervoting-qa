# Sandbox — a score outside the method's range is reported, not swallowed

**Sheet row not yet allocated.** The [test-case sheet](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0) is the canonical roster and IDs come from it; this page is written first because the automated version exists ([`testing/tests/sandbox.spec.ts`](https://github.com/Equal-Vote/bettervoting/pull/1522/files) in PR #1522). Give it a `BV####` when the row is added.

## Purpose

Confirm that <https://bettervoting.com/sandbox> refuses a mark the tabulator would silently discard, and that the refusal is **method-aware** — the same number is legal under a ranked method and illegal under a scored one.

## Prerequisites

- Build containing [Equal-Vote/bettervoting#1522](https://github.com/Equal-Vote/bettervoting/pull/1522). **Against any earlier build this case is vacuous** — the sandbox shows results and no message, which is the defect.
- No login. No election needs to exist.

## Master data

| Field | Value |
|---|---|
| Candidates (scored cases) | `A,B,C,D,E` |
| Candidates (ranked case) | `A,B,C,D,E,F` |
| Number of winners | 1 |

## Steps and expected results

| # | Method | Ballots | Expected |
|---|---|---|---|
| 1 | STAR | `5,4,3,2,6` | Error naming the score: *"You are using incorrect score 6. Use scores between 0 and 5."* No results for this input. |
| 2 | STAR | `5,4,3,2,1` | Error clears; a winner headline appears. |
| 3 | STAR | `5,4,3,2,2.5` | *"…Scores must be whole numbers."* — **not** truncated to 2 and counted. |
| 4 | STAR | `5,4,3,2,6` + a trailing newline | The **score** error, not "Each ballot must have the same length…". |
| 5 | Approval | `1,1,0,0,3` | Error bounded at 1, not 5 — Approval marks are 0–1. |
| 6 | IRV, 6 candidates | `1,2,3,4,5,6` | **No error.** Results render. A sixth-place ranking is a legitimate mark. |
| 7 | STAR | `x:5,4,3,2,1` | A message about the ballot count. The page must not freeze on a previous error. |

## Pass/fail

Pass if all seven behave as above. Step 6 is the one that matters most on a regression: it is the case a naive "reject anything above 5" breaks, and it fails **silently** in the direction of over-rejection.

## Actual results

2026-08-15, local dev stack, Chromium: **all pass** (steps 1–4, 6, 7 automated in the spec; 5 by hand). Against `origin/main`'s component the automated positives fail and the ranked case passes — so the suite is not vacuous.

## Notes

The defect is not "a 6 was accepted". The tabulator's `makeBoundsTest` drops the whole ballot and records it as `nOutOfBoundsVotes`, which the page never shows — so results were a correct count of a **smaller election than the one typed in**. Same family as the flat-ballot cases: an invisible reduction of the ballot set.

## Related

- [#1117 issue notes](../issues/1117-sandbox-score-range.md)
- [BV2263-2267 index](BV2263-2267-index.md) — the other invisible-ballot-reduction cases
