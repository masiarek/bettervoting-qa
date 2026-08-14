# BV250b — "remove duplicates" adds one voter and silently discards the rest

> **Baseline capture — written before any fix.** *Actual result* is what BetterVoting does today
> (`main` @ `7bc75a82`), evidenced frame-by-frame from the screen recording on
> [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512). When the fix lands, re-run and
> *Expected after the fix* is the assertion.
>
> **Sheet row still needed** — see [`BV250-sheet-rows.tsv`](BV250-sheet-rows.tsv).

- Index: [`BV250-index.md`](BV250-index.md) · map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Finding: [`issues/add-voters-duplicate-check-keys-on-email.md`](../issues/add-voters-duplicate-check-keys-on-email.md) — **unfiled**
- BPML: [Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit?gid=0#gid=0) — "Add voters to the roll" needs an entry
- status: **Ready to run — expected to FAIL**

## Purpose

Quantify what [BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md)'s prompt costs. The
answer is that accepting it keeps one row out of N and throws the others away without saying so.

**This is the case that matters.** A wrong prompt is an annoyance; a voter roll that is quietly
shorter than the list the admin pasted is an election that turns people away at the door.

## Prerequisites

Configuration **V1** — a throwaway **draft** election, restricted to a pre-defined voter list,
**Admin-managed voter IDs**, Email unticked. Admin login from the sheet.

**Record the roll count before you start.** The whole case is arithmetic.

## Master data

**Input** — three distinct voter IDs, nothing repeated:

```
alpha
bravo
charlie
```

## Steps

1. Manage Voters. Note the table footer: `1–N of N`. Write N down.
2. **ADD VOTERS**, type the three rows, **SUBMIT**.
3. At *"You entered duplicate emails, which is not supported. Would you like us to remove
   duplicates?"*, click **YES**.
4. **CLOSE** the dialog and read the table footer again.
5. Read the Voter ID column and note *which* of the three arrived.

## Expected result

The roll grows by **3**, and `alpha`, `bravo`, `charlie` are all present.

If the product genuinely believes there were duplicates, it must say how many it removed before it
removes them — a roll is not a place for a silent truncation.

## Actual result — today

The roll grows by **1**. Two rows are gone: no message, no count, no entry in the table, nothing in
the UI that distinguishes this from success.

Evidence from the reporter's video (Vivaldi on Android, election `bettervoting.com/44v…`):

| Video time | Submitted | Roll after |
|---|---|---|
| 0.5 s | — | **1–2 of 2** |
| 2–15 s | `3`, `4`, `5` — three rows | **1–3 of 3** at 19.5 s |
| 23–29 s | `4`, `5` — two rows | **1–4 of 4** at 31 s |
| 33–36 s | `5` — one row | **1–5 of 5** at 39 s |

![Before: 1 to 2 of 2](screenshots/BV250-roll-before-2-voters.png)

![After submitting three rows: 1 to 3 of 3](screenshots/BV250-roll-after-3-voters.png)

Three submissions, six rows typed, three voters added. The reporter ends up entering them one at a
time — and files an issue about the scrollbar, because nothing on screen says the roll was truncated.

### What is wrong

`removeDuplicates()` (`AddElectionRoll.tsx:158`) keys on
`(roll.email || "").trim().toLowerCase()`, exactly as `duplicatesExist()` does. With `email`
`undefined` on every row, all rows key to `""` and the function returns **the first row only**. That
one row is posted; the rest never reach `postRoll`.

The **NO** branch (`:99`) returns from `onSubmit` without posting anything. So the two answers on
offer are "add one voter" and "add none" — [BV250c](BV250-index.md#bv250c--answering-no-adds-nothing-and-says-nothing).

**Observed vs derived:** the counts above are observed. That the survivor is specifically the *first*
row is read from source — check it in step 5 and record what you see, because it is the difference
between "keeps one" and "keeps an arbitrary one".

## Expected after the fix

Three voters added, no prompt (the key includes `voter_id`). And when duplicates *are* real
(`alpha / bravo / alpha`), the admin is told what was removed before it happens — a count at minimum,
the colliding values ideally.

## Pass / fail

**Fail** if the roll grows by anything other than 3.
**Fail** even if it grows by 3 but the dialog claimed to remove duplicates — that would mean the
message and the behaviour disagree, which is its own bug.

## Notes

- Do this on a **draft** election. CLEAR VOTER LIST is the only reset, and it disappears the moment
  the election is finalized.
- The CSV path has the same two calls (`:137`, `:146`), so
  [BV250g](BV250-index.md#bv250g--csv-import-takes-the-same-path) is expected to fail identically —
  worth running in the same sitting, since an admin importing a CSV is importing a *long* list.
- **Open question for the fix, not for this case:** should a partial roll submission be possible at
  all? Rejecting the whole submission and naming the colliding rows may be the safer contract for a
  voter roll. Settle it before the patch is written; it changes the patch.

## Related

[BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md) ·
[BV250d](BV250-index.md#bv250d--a-genuinely-duplicated-voter-id-is-caught) (the positive control that
must keep passing) · [#1512](https://github.com/Equal-Vote/bettervoting/issues/1512)
