# BV250c — answering NO adds nothing and says nothing

- Index: [`BV250-index.md`](BV250-index.md) · post-fix suite: [`BV250-post-fix-verification.md`](BV250-post-fix-verification.md)
- Map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Upstream: [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (scroll) · [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) (duplicate key)
- status: **Ready to run — expected actual is a PREDICTION from source**

## Purpose

Establish what the *other* answer to the duplicate prompt does. [BV250b](BV250b-duplicate-removal-discards-rows.md) shows YES keeps one row; this case checks whether NO leaves the admin anywhere useful. Together they establish that in voter-ID mode the prompt offers a choice between "add one voter" and "add none" — neither of which is what the admin asked for.

## Prerequisites

A **draft** election you can throw away (configuration **V1** — closed list, admin-managed voter IDs, Email unticked). Adding the first voter locks both access radios; in draft the lock is undoable via CLEAR VOTER LIST.

## Master data

**Input**

```
alpha
bravo
charlie
```

Three distinct IDs. Note the roll count before you start.

## Steps

1. Manage Voters → **ADD VOTERS**.
2. Type the three rows. Leave Email unticked.
3. **SUBMIT**. The duplicate prompt fires (that is [BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md)).
4. Answer **NO**.
5. Read the roll count, and read the dialog.

## Expected result

Either the three voters are added, or the admin is told plainly that nothing was added and why. A dialog that closes silently having done neither is a failure.

## Actual result — today

**Predicted from source, not yet observed in the browser.** `onSubmit` (`AddElectionRoll.tsx:99`) returns without posting when the answer is NO. So: roll unchanged, dialog stays open with the text still in it, no message.

> **Marked as a prediction.** Confirm in the browser before quoting it upstream — this repo has had two predictions refuted by screenshots.

## Expected after the fix

The prompt should not fire at all for this input (see BV250a). If a later build still prompts here, NO must at minimum leave a message saying nothing was submitted.

## Pass / fail

**Fail** if the roll is unchanged *and* nothing on screen says so.
**Pass** if the rows are added, or if the refusal is stated.

## Notes

The NO branch is not itself a data-loss bug — nothing is destroyed. It matters because it is the only escape from a prompt that should never have fired, and it is a dead end.

## Related

[BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md) · [BV250b](BV250b-duplicate-removal-discards-rows.md) · [BV250d](BV250d-genuine-duplicate-is-caught.md)
