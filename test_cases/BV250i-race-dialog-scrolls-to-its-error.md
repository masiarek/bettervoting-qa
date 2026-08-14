# BV250i — the race dialog scrolls to its error, on a phone

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — expected to FAIL today; this is #1512 as written**

## Purpose

#1512 as its **written steps** describe it: the race editor on a phone, where pressing SAVE with an incomplete race scrolls the page behind the modal instead of showing the validation message. This is the acceptance case for #1512 proper.

## Prerequisites

Any **draft** election with a multi-race ballot. Narrow viewport (phone, or devtools at 360 × 780 with touch emulation).

## Steps

1. Open the draft election's editor on the narrow viewport.
2. Add a race. Give it a title and **one** candidate only.
3. Scroll the dialog slightly, so the overlay scrollbar hides.
4. Press **SAVE**.

## Expected result

The **dialog's own content** scrolls so that *"Must have at least 2 candidates"* is visible, and the page behind the modal does not move.

## Actual result — today

The dialog does not move; the page behind it does. Root cause: `scrollToElement()` (`util.tsx:324`) is a page-level scroller (`window.scrollTo`) called from inside `<Dialog scroll='paper'>`, whose scroll container is `.MuiDialogContent-root` in a fixed overlay. It can only move the page behind the modal. The same helper is correct in the Wizard styling, which is why the behaviour looks inconsistent between screens.

## Expected after the fix

The validation message is brought into view inside the dialog. Any of the three resolutions #1512 proposes satisfies the user need, and they are not mutually exclusive:

- scroll the **foreground** rather than the background (fixes the cause);
- keep the scrollbar visible (removes the "is there more?" ambiguity);
- label the button **NEXT** rather than SAVE while the form is incomplete (removes the surprise).

Assert on the user need — *the admin can see why the save did not happen* — not on which of the three shipped.

## Pass / fail

**Fail** if the page behind the modal moves.
**Fail** if the admin cannot see the validation message without scrolling by hand.

## Notes

Check the Wizard path too. `scrollToElement` is shared, and the Wizard is where it currently works — a fix must not regress it.

## Related

[BV250h](BV250h-add-voters-dialog-scrolls-itself.md) (the same class of fault on the screen the video actually shows) · [`issues/1512-scroll-save-review.md`](../issues/1512-scroll-save-review.md)
