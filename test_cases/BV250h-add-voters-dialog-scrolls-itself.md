# BV250h — the Adding Voters dialog scrolls itself, not the page

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — needs a real narrow viewport**

## Purpose

#1512 is filed against the race editor, but its video is entirely on this screen. This case covers the Adding Voters dialog on a phone — and specifically establishes that **fixing `scrollToElement` does not fix this dialog**, because this one has no scroll-to-error at all. Its failures go to a snackbar.

## Prerequisites

Configuration **V1**, on a **real narrow viewport**: a phone, or devtools at **360 × 780 with touch emulation**. A desktop window narrowed to 360 px does **not** reproduce the auto-hiding overlay scrollbar that made the reporter's session confusing — that is a mobile-browser behaviour, and its absence is half of why the reporter could not tell the dialog had more content.

## Steps

1. Open the election on the narrow viewport → Manage Voters → **ADD VOTERS**.
2. Note where the page **behind** the modal is scrolled to. A landmark near the top of the page is enough.
3. Scroll inside the dialog to see its full height.
4. Press **SUBMIT** with the Voter Data field **empty**.
5. Look for the feedback, and re-check the landmark from step 2.

## Expected result

1. Whatever feedback the empty submission produces is **visible without hunting** — the admin does not have to guess that something happened off-screen.
2. The page behind the modal **has not moved**.
3. The feedback does not land on top of the dialog's own buttons.

## Actual result — today

The background page moves (visible in the reporter's video at 18–20 s). The dialog's errors surface in a snackbar pinned to the bottom of the **viewport**, which on a short screen can sit over the dialog's own NO / YES / SUBMIT controls.

## Expected after the fix

Depends on what #1512's fix touches. If it only repairs `scrollToElement()` (`util.tsx:324`), **this case still fails** — that helper is not called here. Say so explicitly when reporting the result; it is the most likely way for #1512 to be closed while the screen in its own video stays broken.

## Pass / fail

**Fail** if the page behind the modal scrolls when the admin interacts with the modal.
**Fail** if feedback for an invalid submission is not reachable without scrolling to find it.

## Notes

Take a screen recording rather than screenshots. The defect is a transition — a still frame of a scrolled background looks like a normal page.

## Related

[BV250i](BV250i-race-dialog-scrolls-to-its-error.md) (the same fault on the screen #1512 names) · [BV250j](BV250j-confirm-dialog-is-never-blank.md) · [`issues/1512-scroll-save-review.md`](../issues/1512-scroll-save-review.md)
