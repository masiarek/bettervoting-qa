# BV250d — a genuinely duplicated voter ID is caught

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — the negative control; must pass BEFORE and AFTER the fix**

## Purpose

The reason the duplicate check exists. Everything else in the BV250a–c group argues that the check fires when it should not; this case is the one that must keep passing, and it is the case a careless fix breaks.

A fix that simply deletes the check makes BV250a, b and c pass and this one fail. Run it in the same session as BV250a — the pair is the actual acceptance criterion.

## Prerequisites

Configuration **V1** (draft, closed list, admin-managed voter IDs, Email unticked), roll empty or counted first.

## Master data

**Input**

```
alpha
bravo
alpha
```

Three rows, two distinct. `alpha` is genuinely repeated.

## Steps

1. Manage Voters → **ADD VOTERS**.
2. Type the three rows above.
3. **SUBMIT**.
4. Answer **YES** to the duplicate prompt.
5. Count the roll and read the IDs.

## Expected result

1. The prompt **does** fire — correctly, this time.
2. The prompt names **voter ID**, not email, because voter ID is the field in use.
3. **YES adds two voters:** `alpha` and `bravo`.

## Actual result — today

The prompt fires (for the wrong reason — every row keys to `""`), and YES adds **one** voter. The right outcome cannot be distinguished from the wrong one by the prompt alone, which is why this case must be read together with BV250a.

## Expected after the fix

Two voters. Prompt text names the duplicated **voter ID**, ideally quoting it.

## Pass / fail

**Fail** if no prompt appears — the check has been removed rather than repaired.
**Fail** if YES adds one voter or three.
**Fail** if the prompt still says "emails" in voter-ID mode; that is a partial fix that leaves the admin unable to act.

## Notes

Run the email arm too (configuration **V2**, `a@x.com / b@x.com / a@x.com`): the key is already correct there, so it should behave identically before and after. If the fix changes V2's behaviour, it has moved the bug rather than fixed it.

## Related

[BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md) · [BV250b](BV250b-duplicate-removal-discards-rows.md) · [BV250g](BV250g-csv-import-takes-the-same-path.md)
