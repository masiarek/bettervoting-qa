# BV250j — the confirm dialog is never blank

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — cosmetic, not filed upstream**

## Purpose

The shared confirm dialog blanks its own text and button labels while it is closing, so a fade-out renders an **empty box with the default CANCEL / SUBMIT labels**. Cosmetic — but it is why a tester's screenshot can show a confirm dialog with nothing in it, and a tester who does not know that will file it as something worse.

## Prerequisites

Configuration **V1**, narrow viewport **or** a throttled CPU (devtools → Performance → 4× slowdown makes it reliable).

## Steps

1. Trigger any confirm on this screen — **CLEAR VOTER LIST** is the easiest.
2. Answer it, and watch the box **close**.
3. Record it if you can; the window is a few frames.

## Expected result

The box carries its own text and its own button labels for as long as it is on screen.

## Actual result — today

`ConfirmationDialogProvider.tsx:46` clears title, message and both labels synchronously with `isOpen: false`, so the closing animation renders the empty default. Caught three times in a 40-second recording on a mid-range Android.

![The blank confirm dialog, mid-close](screenshots/BV250-blank-confirm-dialog.png)

## Expected after the fix

Not filed upstream — offered in the [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) comment as a separate ticket if the maintainers want it. If it is picked up: keep the content mounted until the exit transition completes.

## Pass / fail

**Fail** if any frame of the closing animation shows an empty dialog or the default labels.

## Notes

This affects **every** confirm in the app, not just Manage Voters — it is in the shared provider. Worth mentioning if it is ever filed.

## Related

[BV250h](BV250h-add-voters-dialog-scrolls-itself.md) · [BV250k](BV250k-voter-table-fits-the-viewport.md)
