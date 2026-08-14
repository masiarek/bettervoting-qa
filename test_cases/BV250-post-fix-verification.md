# BV250 — post-fix verification for #1512 and #1513

**What to run once the fixes land.** The [BV250 index](BV250-index.md) describes the eleven cases and how BetterVoting behaves *today*; this page is the acceptance list — the same cases ordered by what has to be true before either issue is closed, plus the user stories they stand for and the traps a plausible fix falls into.

- Upstream: [#1512 — Odd scroll/save behavior](https://github.com/Equal-Vote/bettervoting/issues/1512) · [#1513 — Add Voters: duplicate check keys on email only](https://github.com/Equal-Vote/bettervoting/issues/1513)
- Subsystem map: [`analysis/manage-voters-map.md`](../analysis/manage-voters-map.md)
- Baseline (today's behaviour, written before any fix): [`BV250-index.md`](BV250-index.md)
- Evidence: the reporter's screen recording on #1512 — <https://github.com/user-attachments/assets/effc8f69-9e02-4473-8e18-c547beb42136>

> **The two issues are on different screens and can be fixed independently.** #1513 is the Adding Voters dialog (data loss); #1512 is the race editor (scroll). They arrived together only because one reporter hit both in one session. Run each suite against whichever landed — do not wait for both.

---

## User stories

What the test cases are for, in the admin's words. Each one is the sentence that should be true after the fix; the cases are how you check.

| # | As an election admin… | I want… | so that… | Verified by |
|---|---|---|---|---|
| **US-1** | running a closed election identified by voter IDs | to paste my list of voter IDs and have all of them added | my roll matches the list I was given | [BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md), [BV250b](BV250b-duplicate-removal-discards-rows.md), [BV250e](BV250e-roll-table-reflects-submission.md) |
| **US-2** | who really did paste the same voter twice | to be told which entry repeats, and to be able to proceed without it | I can fix my list instead of guessing | [BV250d](BV250d-genuine-duplicate-is-caught.md) |
| **US-3** | who is warned about something | to be told about a field I actually filled in | the warning means something I can act on | [BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md), [BV250d](BV250d-genuine-duplicate-is-caught.md) |
| **US-4** | who declines a prompt | to know what happened to my submission | I do not walk away believing voters were added | [BV250c](BV250c-answering-no-adds-nothing.md) |
| **US-5** | importing a CSV of several hundred voters | the same guarantees as typing them in | the entry point does not change the outcome | [BV250g](BV250g-csv-import-takes-the-same-path.md) |
| **US-6** | reviewing my roll before opening the election | to see the full list and its count on my screen | I can confirm the roll before anyone votes | [BV250e](BV250e-roll-table-reflects-submission.md), [BV250k](BV250k-voter-table-fits-the-viewport.md) |
| **US-7** | building a ballot on my phone | to see why a save did not go through | I am not left pressing a button that appears to do nothing | [BV250i](BV250i-race-dialog-scrolls-to-its-error.md), [BV250h](BV250h-add-voters-dialog-scrolls-itself.md) |
| **US-8** | using any dialog in the app | it to keep its text and buttons until it is gone | a screenshot of my screen shows what I actually saw | [BV250j](BV250j-confirm-dialog-is-never-blank.md) |
| **US-9** | who has finalized an election | the roll settings to stay locked | the identification scheme cannot change under a live election | [BV250e](BV250e-roll-table-reflects-submission.md) arm 2 |

---

## Suite A — after #1513 (Add Voters duplicate key)

Run in this order; A1 and A2 together are the whole acceptance test, and A3 is the one a careless fix breaks.

| Order | Case | Scenario | Must be true after the fix |
|---|---|---|---|
| A1 | [BV250a](BV250a-voter-id-list-flagged-as-duplicate-emails.md) | 2 distinct voter IDs, Email unticked | Both added. **No prompt at all.** |
| A2 | [BV250b](BV250b-duplicate-removal-discards-rows.md) | 3 distinct voter IDs | Roll grows by **3**. Nothing discarded, silently or otherwise. |
| A3 | [BV250d](BV250d-genuine-duplicate-is-caught.md) | `alpha / bravo / alpha` | Prompt **does** fire, names the **voter ID**, and YES adds **2**. |
| A4 | [BV250c](BV250c-answering-no-adds-nothing.md) | Answer NO to any surviving prompt | Nothing is added **and the admin is told so**. |
| A5 | [BV250g](BV250g-csv-import-takes-the-same-path.md) | 3-row CSV, same data | Identical to A2. Both entry points move together. |
| A6 | [BV250e](BV250e-roll-table-reflects-submission.md) | 5 mixed-shape IDs, read the table back | Count and spelling match the input exactly. |
| A7 | [BV250d](BV250d-genuine-duplicate-is-caught.md) email arm (cfg V2) | 3 emails, one repeated | **Unchanged** from before the fix — the key was already correct there. |

### Three ways this fix goes wrong

1. **Deleting the check.** Makes A1, A2 and A4 pass and **A3 fail**. A3 is the reason the check exists; run it in the same session, not as an afterthought.
2. **Fixing only the typed path.** `handleLoadCsv` (`AddElectionRoll.tsx:137`, `:146`) calls the same two helpers three lines away. A5 is the guard.
3. **Fixing detection but not the message.** A prompt that correctly identifies a repeated voter ID and still says *"duplicate emails"* leaves the admin unable to act. A1 and A3 both fail this on the wording, deliberately.

### One design question the fix has to answer first

**Should a partial submission be possible at all?** Today YES posts a silently truncated list. Two defensible contracts, and they need different assertions — settle it before writing the test result:

- **Post the valid rows, report the rest.** A2 expects 3 added; A3 expects 2 added *plus a statement that `alpha` was collapsed*.
- **Reject the whole submission and name the colliding rows.** A3 then expects **0** added and the list returned for editing.

For a voter roll the second is arguably safer — but it is a product decision, not a QA one. Raised as open question 2 on the [index](BV250-index.md#open-questions).

---

## Suite B — after #1512 (scroll/save)

| Order | Case | Scenario | Must be true after the fix |
|---|---|---|---|
| B1 | [BV250i](BV250i-race-dialog-scrolls-to-its-error.md) | Race with 1 candidate → SAVE, narrow viewport | The validation message is brought into view **inside the dialog**; the page behind it does not move. |
| B2 | [BV250h](BV250h-add-voters-dialog-scrolls-itself.md) | Empty SUBMIT in Adding Voters, narrow viewport | Feedback is visible without hunting; the background does not scroll; the snackbar does not cover the dialog's own buttons. |
| B3 | Wizard regression | Any Wizard step that scrolls to an error | **Unchanged.** `scrollToElement` is shared and currently correct there. |

**The trap:** #1512's root cause is `scrollToElement()` (`util.tsx:324`) — `window.scrollTo` called from inside `<Dialog scroll='paper'>`, whose real scroll container is `.MuiDialogContent-root` in a fixed overlay. Repairing it fixes **B1**. It does **not** fix **B2**, because the Adding Voters dialog never calls it — that dialog has no scroll-to-error at all and reports through a viewport-pinned snackbar. So #1512 can be closed correctly while the screen in its own video is still wrong. Report B2's result explicitly either way.

Assert on the user need — *the admin can see why the save did not happen* — not on which of the issue's three proposed resolutions shipped. They are not mutually exclusive.

---

## Suite C — independent of both fixes

Neither is blocked; run them whenever the environment is up.

| Case | Scenario | Notes |
|---|---|---|
| [BV250f](BV250f-two-columns-require-a-comma.md) | Both columns ticked, row with no comma | Assert the admin can work out the format from the screen. Copy unapproved — do not pin to the literal string. |
| [BV250j](BV250j-confirm-dialog-is-never-blank.md) | Watch any confirm close | Cosmetic; offered upstream but not filed. Affects every confirm in the app. |
| [BV250k](BV250k-voter-table-fits-the-viewport.md) | Roll of 3+, narrow viewport | **Check [#704](https://github.com/Equal-Vote/bettervoting/issues/704) / [#1170](https://github.com/Equal-Vote/bettervoting/issues/1170) for a duplicate before filing.** |

---

## Environments

Three election configurations, as in the [index](BV250-index.md#test-elections-needed-3-configurations):

| Cfg | State | Voter access | Identification | Used by |
|---|---|---|---|---|
| **V1** | draft | closed (pre-defined list) | **Admin-managed voter IDs** | A1–A6, B2, C (f is V2) |
| **V2** | draft | closed | **BetterVoting-managed IDs** (email) | A7, BV250f |
| **V3** | finalized / open | closed, roll populated | — | BV250e arm 2 |

- **Adding the first voter is a one-way door on a non-draft election** — both radio groups disable on `state !== 'draft' || rolls.length > 0`, and CLEAR VOTER LIST exists only in draft. **Make a fresh draft per run**, or clear the roll between cases.
- **B1, B2, BV250j and BV250k need a real narrow viewport** — a phone, or devtools at 360 × 780 **with touch emulation**. A desktop window narrowed to 360 px does not reproduce the auto-hiding overlay scrollbar, which is half of why the reporter's session was confusing.
- Method, candidates and race count are irrelevant to Suite A. Use the smallest template.
- Test accounts live in the sheet's testing-credentials tab, never on a page here.

## Exit criteria

**#1513 may close when** A1–A6 pass, A7 is unchanged, and the partial-submission contract above is stated somewhere a reader of the code will find it.

**#1512 may close when** B1 passes and B3 is unchanged — **and** B2's result is reported, whichever way it went, so that the Adding Voters dialog is not silently assumed fixed.

## Reusable as user documentation

Several of these cases exist because the product's own copy cannot answer the question the tester is asking — [BV250f](BV250f-two-columns-require-a-comma.md) (what separates two columns?) and [BV250g](BV250g-csv-import-takes-the-same-path.md) (what header does the CSV need?) are pure documentation gaps wearing a test case's clothes. A draft help page answering them is in [`docs_proposals/help/voter_list.md`](../docs_proposals/help/voter_list.md); the [proposal](../docs_proposals/README.md) explains why it should not ship until #1513 lands.

## Recording results

One line per case, in the case page's own *Actual result* section, with the build under test (`main` @ short SHA) and the date. Two conventions this repo keeps:

- **Mark predictions as predictions.** BV250c and BV250g state expectations derived from reading source, not from running the product. Two predictions in this repo have already been refuted by screenshots.
- **Say when a case is vacuous.** A case run against a build where the fix is not present proves nothing; note the required build rather than logging a pass.
