# BV250e — the roll table reflects exactly what was submitted

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run**

## Purpose

Close the loop on the submission path: not "did the dialog accept it" but "is the roll what the admin typed." This is the case that would have caught #1513 in the first place, because the defect is invisible in the dialog and visible only in the count.

Second arm: confirm what locks once the election is no longer a draft.

## Prerequisites

Configuration **V1** (draft) for the first arm, **V3** (finalized/open, roll already populated) for the second.

## Master data

**Input** — five IDs, deliberately mixed in shape:

```
alpha
bravo
charlie
delta-4
echo_5
```

Record the roll count *before* submitting.

## Steps

**Arm 1 (V1, draft)**

1. Manage Voters → **ADD VOTERS** → type the five rows → **SUBMIT** (answer the prompt YES if it fires; note that it did).
2. Read the Voters table back: count, IDs, and the `Has Voted` column.

**Arm 2 (V3, finalized)**

3. Open a finalized election that already has a roll.
4. Check the two access radio groups and look for CLEAR VOTER LIST.

## Expected result

**Arm 1:** roll count rises by exactly **5**. All five IDs present, spelled as typed, including the hyphen and the underscore. Every row `Not Voted`.

**Arm 2:** both radio groups **disabled** (`ViewElectionRolls.tsx:119`, `:145`), and **CLEAR VOTER LIST absent** — the lock is only undoable in draft.

## Actual result — today

**Arm 1 fails**: the roll rises by **1** (`alpha`). This is #1513 seen from the table rather than from the dialog.

**Arm 2** is expected to pass; it is documenting a deliberate one-way door, not a defect.

## Expected after the fix

Roll rises by 5. Arm 2 unchanged.

## Pass / fail

**Fail** if the count differs from the number of rows submitted by even one, with no message explaining the difference.
**Fail** if any ID is altered (trimmed, case-folded, truncated) without that being stated.

## Notes

The arithmetic is the assertion here — deliberately, because the reporter of #1512 watched this exact counter go 2 → 3 → 4 → 5 while submitting six IDs and did not read it as data loss. Nothing on screen invited them to.

## Related

[BV250b](BV250b-duplicate-removal-discards-rows.md) · [BV250g](BV250g-csv-import-takes-the-same-path.md) · [BV250k](BV250k-voter-table-fits-the-viewport.md)
