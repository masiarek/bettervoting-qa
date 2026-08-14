# BV250f — two ticked columns require a comma per row

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — assert on the requirement, not the literal string**

## Purpose

The input format is only documented by the error you get for breaking it. Check that an admin who ticks both columns can work out what to type next.

## Prerequisites

Configuration **V2** — closed list, **BetterVoting-managed voter IDs** (email mode).

## Master data

Tick **both** Voter ID and Email.

**Input** — a row with no comma:

```
alpha
```

## Steps

1. Manage Voters → **ADD VOTERS**.
2. Tick Voter ID **and** Email.
3. Type the single row above.
4. **SUBMIT**.

## Expected result

An error that tells the admin the row must contain one value per ticked column, separated by a comma — i.e. enough to fix the input without reading the source.

## Actual result — today

Snackbar: `Incorrect number of columns: alpha`. The dialog's own instruction line reads *"(1 voter per row, no spaces)"* and never states that the row is comma-separated.

The requirement is unmet: the message names the fault but not the format, and the on-screen instruction is silent on the one thing that matters.

## Expected after the fix

Not blocked on #1512 or #1513 — this is independent copy. Any wording that names the expected format passes.

## Pass / fail

**Pass** if a first-time admin can correct the input from what is on screen.
**Fail** if the only way to learn the format is to read `AddElectionRoll.tsx`.

> **Assert on the requirement, not the string.** This copy has not been approved; a test pinned to the literal text fails on every review tweak and trains people to ignore it.

## Notes

Also worth noting while here: the snackbar is used for this error but `alert()` is used for the CSV guards (see [BV250g](BV250g-csv-import-takes-the-same-path.md)) — two mechanisms on one screen.

## Related

[BV250g](BV250g-csv-import-takes-the-same-path.md)
