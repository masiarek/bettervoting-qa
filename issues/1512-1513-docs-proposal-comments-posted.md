# #1512 / #1513 — comments posted upstream, with the docs proposal

Posted 2026-08-14 as `masiarek`. Both comments carry the link to the draft help page; each is otherwise tailored to its issue.

- [#1513 comment](https://github.com/Equal-Vote/bettervoting/issues/1513#issuecomment-5294378497)
- [#1512 comment](https://github.com/Equal-Vote/bettervoting/issues/1512#issuecomment-5294378628)

Links handed over:

| Link | What it is |
|---|---|
| <https://masiarek.github.io/bettervoting-qa/docs_proposals/help/voter_list.html> | The draft help page, ready to drop into `docs/help/` |
| <https://masiarek.github.io/bettervoting-qa/test_cases/BV250-post-fix-verification.html> | The acceptance suite for both issues |

## What each comment says

**On #1513** — the input format it describes is undocumented, so here is the missing page; its *Duplicates* section deliberately describes post-fix behaviour and must land with the fix or land without that section. Two things to save the implementer time: `handleLoadCsv` calls the same two helpers three lines from the typed path, so the repair belongs in the shared functions; and the negative control (`alpha / bravo / alpha` must still prompt, YES must add two) matters as much as the bug, because deleting the check makes every other symptom disappear. Closes by putting the partial-submission contract to them as a product question — post the valid rows and report what was collapsed, or reject and name the colliding rows.

**On #1512** — thanks for the recording; its written steps and its video are different screens needing different fixes. `scrollToElement()` (`util.tsx:324`) explains the race dialog and why the Wizard is fine, but the Adding Voters dialog never calls it, so repairing that helper closes the issue as written and leaves the filmed screen unchanged. Both cases are kept separate in the suite for that reason. Also offered the blank-confirm-dialog defect (`ConfirmationDialogProvider.tsx:46`) as a separate ticket if wanted, rather than filing it unasked.

## What to watch for

- If a maintainer takes the docs page, it needs one edit on the way in: the Security Options link is absolute so it works from this repo, and should become relative (`security_options.md`) once the page sits beside its target. Noted in [`docs_proposals/README.md`](../docs_proposals/README.md).
- If the partial-submission question gets an answer, it changes the assertions in Suite A — update [`BV250-post-fix-verification.md`](../test_cases/BV250-post-fix-verification.md) rather than leaving both contracts documented.
- The blank-confirm-dialog offer is outstanding. If they decline it, say so on [`BV250j`](../test_cases/BV250j-confirm-dialog-is-never-blank.md) so it isn't re-offered.

## Related

[`BV250-index.md`](../test_cases/BV250-index.md) · [`add-voters-duplicate-check-keys-on-email.md`](add-voters-duplicate-check-keys-on-email.md) · [`1512-scroll-save-review.md`](1512-scroll-save-review.md)
