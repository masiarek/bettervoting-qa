# BV250g — CSV import takes the same path

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — expected actual is a PREDICTION from source**

## Purpose

#1513 is usually described as a typing bug. It is not — `handleLoadCsv` (`AddElectionRoll.tsx:137`, `:146`) calls the same `duplicatesExist` / `removeDuplicates` pair. This case proves the CSV entry point is affected too, which matters more in practice: a CSV is normally a long list, so the loss is larger and the count is less likely to be watched.

**A fix that repairs only the typed path leaves this one broken.**

## Prerequisites

Configuration **V1** (draft, closed list, admin-managed voter IDs).

## Master data

A `.csv` with a header and three distinct rows:

```csv
voter_id
alpha
bravo
charlie
```

Plus two malformed files for the guard checks: one with header `voterid` (no underscore), and one non-text file (any `.png`).

## Steps

1. Manage Voters → **ADD VOTERS** → import the good CSV.
2. Answer the prompt if it fires. Count the roll.
3. Import the bad-header CSV.
4. Import the non-text file.

## Expected result

1. **Three voters added, no prompt.**
2. Bad header → an error naming the expected header.
3. Non-text file → an error naming the expected file type.

## Actual result — today

**Predicted from source, not yet observed.** Step 1 raises the same duplicate prompt and adds **one** voter. Steps 3 and 4 are guarded (`Invalid headers` / `Invalid data type`) but report via `alert()` rather than the snackbar used everywhere else on the screen.

> **Marked as a prediction.** Confirm in the browser before quoting upstream.

## Expected after the fix

Three voters, no prompt. The two guards keep firing.

## Pass / fail

**Fail** if the CSV path behaves differently from the typed path in either direction — the fix should be in the shared functions, so both entry points move together.

## Notes

If the fix lands only on the typed path, that is worth its own upstream comment: the two callers are three lines apart and the shared helpers are the natural place to repair.

## Related

[BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md) · [BV250b](BV250b-duplicate-removal-discards-rows.md) · [BV250e](BV250e-roll-table-reflects-submission.md)
