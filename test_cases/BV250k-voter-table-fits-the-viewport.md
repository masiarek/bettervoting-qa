# BV250k — the voter table fits the viewport

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — check for a duplicate issue before filing**

## Purpose

The Voters table is how an admin verifies a roll — it is the readback for [BV250e](BV250e-roll-table-reflects-submission.md), and therefore the only place #1513's data loss is visible. If it does not fit the screen, the count that would reveal the loss is the part that runs off the edge.

## Prerequisites

Configuration **V1** with **3 or more** voters on the roll. Narrow viewport.

## Steps

1. Open Manage Voters on the narrow viewport with a populated roll.
2. Try to read: the **Voter ID** column, the **Email** column, **Has Voted**, and the `Rows per page … 1–N of N` footer.

## Expected result

All four are reachable without scrolling the **page** horizontally.

## Actual result — today

The table is clipped at the right edge with its own horizontal scrollbar, and the footer runs off-screen. Layout only.

## Expected after the fix

Not blocked on #1512 or #1513.

## Pass / fail

**Fail** if the `1–N of N` count cannot be read without horizontal page scrolling — that is the number BV250e asserts on.

## Notes

**Check for a duplicate before filing.** Plausibly already covered by [#704](https://github.com/Equal-Vote/bettervoting/issues/704) or [#1170](https://github.com/Equal-Vote/bettervoting/issues/1170).

## Related

[BV250e](BV250e-roll-table-reflects-submission.md) · [BV250j](BV250j-confirm-dialog-is-never-blank.md)
