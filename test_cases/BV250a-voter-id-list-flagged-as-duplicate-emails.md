# BV250a — a voter-ID list of two rows is reported as duplicate emails

> **Baseline capture — written before any fix, from source plus the reporter's video.**
> Everything under *Actual result* is what BetterVoting does today (`main` @ `7bc75a82`). When the fix
> lands, re-run these steps and *Expected after the fix* is the assertion.
>
> **Sheet row still needed.** `BV250` was allocated as the next free family after `BV240`; it is not
> yet a row in the [test-case sheet](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0).
> Paste-ready: [`BV250-sheet-rows.tsv`](BV250-sheet-rows.tsv). Renumber here and in the tsv together
> if it collides.

- Index: [`BV250-index.md`](BV250-index.md) · map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Finding: [`issues/add-voters-duplicate-check-keys-on-email.md`](../issues/add-voters-duplicate-check-keys-on-email.md) — **unfiled**
- BPML: [Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit?gid=0#gid=0) has no "Add voters to the roll" use case yet
- Evidence: the screen recording on [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512), 12–15 s
- status: **Ready to run — expected to FAIL**

## Purpose

Prove that the duplicate check keys on a field that admin-managed-voter-ID elections never populate,
so it fires on input that contains no duplicates and no emails.

This is the diagnostic half. [BV250b](BV250b-duplicate-removal-discards-rows.md) is the half that
loses data.

## Prerequisites

1. A **draft** election you can throw away. Adding the first voter locks both access radios
   (`ViewElectionRolls.tsx:119`, `:145`); in draft that lock is undoable via CLEAR VOTER LIST, on a
   finalized election it is not.
2. Admin login — the sheet's testing-credentials tab, not here.
3. Nothing else: method, candidates and race count are irrelevant.

## Master data

Configuration **V1**, shared with BV250b–e and g–h.

| Field | Value | Notes |
|---|---|---|
| State | **draft** | so the roll can be cleared between runs |
| Restricted to a pre-defined voter list | **Yes** | |
| Voter identification | **Admin-managed voter IDs** | the variable under test |
| Email checkbox in the dialog | **unticked** | it defaults this way in this mode |
| Existing roll | empty, or note the count first | |

**Input**

```
alpha
bravo
```

Two rows, distinct, no commas, no emails anywhere.

## Steps

1. Open the election's admin page and go to **Manage Voters**.
2. Confirm **Yes** to the pre-defined voter list and **Admin-managed voter IDs**.
3. Click **ADD VOTERS**. (If the roll is empty you get a *"Confirm Adding First Voters"* prompt
   first — accept it. That prompt is correct and is not what this case is about.)
4. Leave **Voter ID** ticked and **Email** unticked. Type the two rows above into **Voter Data**.
5. Click **SUBMIT**.

## Expected result

Both voters are added. The roll goes up by two. **No prompt of any kind** — there is nothing
duplicated in the input.

## Actual result — today

A confirmation dialog:

> **You entered duplicate emails, which is not supported. Would you like us to remove duplicates?**
> NO · YES

![Duplicate prompt in voter-ID mode, with no email anywhere on the form](screenshots/BV250-duplicate-prompt-voter-id-mode.png)

The Email checkbox is unticked in that screenshot, and no email was typed.

### What is wrong

`duplicatesExist()` (`AddElectionRoll.tsx:173`) keys every row on
`(roll.email || "").trim().toLowerCase()`. In this mode `roll.email` is never assigned (`:76`–`:88`
only sets `voter_id`), so every row keys to `""` and the second row always collides with the first.

Two separate faults, and they should be fixed together:

1. **the key ignores the columns actually in use** — voter ID and precinct are never consulted;
2. **the message names a field that is not on the form**, which is what makes it unreadable rather
   than merely wrong. The string is a hard-coded English literal at `:98`, outside i18n, unlike the
   translated confirms next to it.

## Expected after the fix

Two voters added, no prompt. And the negative control still holds:
[BV250d](BV250-index.md#bv250d--a-genuinely-duplicated-voter-id-is-caught) submits
`alpha / bravo / alpha` and **must** still prompt — naming voter ID, not email.

## Pass / fail

**Fail** if the prompt appears at all for input with no repeated values.
Also **fail** if the prompt appears with correct detection but still says "emails" while in voter-ID
mode — that is a partial fix and leaves the admin no way to act on it.

## Notes

- Run the **email arm** in the same session for contrast: configuration V2, three distinct addresses.
  The key is correct there, so it should pass, and the contrast is the whole diagnosis.
- Reset between runs with **CLEAR VOTER LIST** (draft only). It confirms with a translated dialog
  naming the voter count — that one is correct and worth eyeballing while you are here.
- If you catch the confirm dialog mid-close it may render **blank with CANCEL / SUBMIT** labels. That
  is [BV250j](BV250-index.md#bv250j--the-confirm-dialog-is-never-blank), a separate cosmetic defect —
  not a failure of this case.

## Related

[BV250b](BV250b-duplicate-removal-discards-rows.md) (the data loss) ·
[BV250g](BV250-index.md#bv250g--csv-import-takes-the-same-path) (CSV twin) ·
[#1512](https://github.com/Equal-Vote/bettervoting/issues/1512) (the issue whose video shows this)
