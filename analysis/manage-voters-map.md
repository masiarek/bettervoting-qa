# Manage Voters / Add Voters — subsystem map

What the screen is made of, which settings it locks, and the four defects found reading it against
[#1512](https://github.com/Equal-Vote/bettervoting/issues/1512)'s screen recording (2026-08-14).

Source read at `Equal-Vote/bettervoting` `origin/main` @ `7bc75a82`. Nothing here was run in a
browser by us — **the live evidence is the reporter's video on #1512**, frame-by-frame, and is cited
per claim. Where a claim comes only from reading source it says so.

---

## 1. The components

| File | Role |
|---|---|
| `packages/frontend/src/components/Election/Admin/ViewElectionRolls.tsx` | The **Manage Voters** screen: the two access radios, ADD VOTERS / CLEAR VOTER LIST / DRAFT EMAIL BLAST, and the voter table |
| `…/Admin/AddElectionRoll.tsx` | The **Adding Voters** dialog body: the Voter ID / Email checkboxes, the textarea, SUBMIT, and the CSV loader |
| `…/ElectionForm/Details/ElectionAuthForm.tsx` | The open-election auth options (rendered only when access is *open*) |
| `components/ConfirmationDialogProvider.tsx` | The shared yes/no confirm used by CLEAR VOTER LIST, the first-voter gate, and the duplicate prompt |

**Adding Voters is a modal, not a page**, despite the `addRollPage` state name — `ViewElectionRolls.tsx:207`
wraps it in `<Dialog fullWidth maxWidth='md'>` with a `CLOSE` action of its own, *plus* the `SUBMIT`
button that `AddElectionRoll` renders inside it. Two commit-ish buttons in one dialog, at different
depths, is worth knowing before writing steps: **SUBMIT posts the roll; CLOSE just dismisses**, and
neither warns about the other.

## 2. What locks, and when

Adding the first voter is a one-way door while the election is anything but a draft:

- Both radio groups are `disabled` when `election.state !== 'draft' || electionRollData.length > 0`
  (`ViewElectionRolls.tsx:119`, `:145`) — so *access mode* and *voter-identification mode* freeze the
  moment one voter exists.
- The escape hatch is **CLEAR VOTER LIST**, and it only appears while `election.state === 'draft'`
  (`canClearRolls`, `:100`). Draft → the lock is undoable. Finalized → it is not.
- Which is why ADD VOTERS gates the *first* voter behind a confirm
  (`admin_home.add_first_voter_roll_confirm`, `:163`) and not later ones.

Test consequence: **every case below that touches the radios needs a fresh draft election**, and a
case that adds a voter has spent that election's ability to test the radios again.

## 3. The four defects

### 3.1 The duplicate check keys on `email` only — fires on every voter-ID list, and eats rows

The one that matters. `duplicatesExist()` and `removeDuplicates()`
(`AddElectionRoll.tsx:158` and `:173`) both key on `(roll.email || "").trim().toLowerCase()`. In
**admin-managed voter ID** mode `roll.email` is never assigned, so every row keys to `""`:

- any submission of **2 or more rows** reports *"You entered duplicate emails, which is not supported"*
  — while the Email checkbox is unticked and no email was typed;
- answering **YES** runs `removeDuplicates`, which keeps the first row per key — i.e. **one row total**
  — and posts that. The rest are discarded with no message.

Confirmed in the video, not just in source: the roll goes **2 → 3 → 4 → 5** across three submissions
of **3, 2 and 1** rows. Full evidence and frame times:
[`issues/add-voters-duplicate-check-keys-on-email.md`](../issues/add-voters-duplicate-check-keys-on-email.md).
**Unfiled** — no upstream issue covers it as of 2026-08-14.

### 3.2 The dialog's scroll-to-error scrolls the page instead — #1512

`scrollToElement()` (`components/util.tsx:324`) is a page-level scroller: it measures against
`document.documentElement.scrollTop` and ends in `window.scrollTo`. Called from inside a
`<Dialog scroll='paper'>`, whose scroll container is `.MuiDialogContent-root` in a `position: fixed`
overlay, it can only move the page **behind** the modal. Review, including the fact that #1512's
written steps and its attached video are about two different screens:
[`issues/1512-scroll-save-review.md`](../issues/1512-scroll-save-review.md).

Note for this screen specifically: **Adding Voters has no scroll-to-error at all.** Its failures go
to a snackbar (`setSnack`, `AddElectionRoll.tsx:60`), which on a phone renders at the bottom of the
*viewport*, i.e. potentially over the dialog's own buttons. So the #1512 fix does not touch this
dialog, and this dialog's feedback problem needs its own answer.

### 3.3 The confirm dialog blanks itself while closing

`ConfirmationDialogProvider.tsx:46` resolves the promise and immediately sets
`{isOpen: false, title: '', message: '', submit: null, cancel: null}`. Content and button labels are
cleared *synchronously with* the close, so the fade-out renders an **empty dialog with the default
CANCEL / SUBMIT labels** — not the caller's own text and not its NO / YES. Caught three times in a
40-second recording on a mid-range Android; on desktop it is a flicker. Cosmetic, one-line fix
(clear on exit, or keep the content and only flip `isOpen`), but it is why a tester's screenshot can
show a confirm box with nothing in it.

### 3.4 The voter table overflows the viewport horizontally

At 360-ish CSS px the `EnhancedTable`'s Voter ID / Email / Has Voted columns exceed the screen; the
video shows the table clipped at the right edge with its own horizontal scrollbar, and the
`Rows per page … 1–3 of 3` footer partly off-screen. Layout only — no data at risk. Untriaged, and
plausibly already covered by [#704](https://github.com/Equal-Vote/bettervoting/issues/704)
(*"The navbar is too wide, and causes issues on mobile"*) or
[#1170](https://github.com/Equal-Vote/bettervoting/issues/1170) (*Rework Admin Experience*) — check
before filing.

## 4. Copy problems noticed in passing

- *"You entered duplicate emails"* is hard-coded at `AddElectionRoll.tsx:98` and `:146` and says
  **emails** regardless of mode. In voter-ID mode it names a field the admin never filled in — which
  is what turns 3.1 from a wrong prompt into an unintelligible one.
- Both duplicate prompts are English string literals in the component, not `en.yaml` keys, so they are
  outside i18n. The neighbouring confirms (`admin_home.clear_voter_roll_confirm`,
  `admin_home.add_first_voter_roll_confirm`) are translated.
- The dialog's instruction line is *"(1 voter per row, no spaces)"* — it does not say that a row is
  comma-separated when more than one column is ticked, which is the actual format
  (`Incorrect number of columns` is the error you get for guessing wrong).

## 5. Test cases

[`test_cases/BV250-index.md`](../test_cases/BV250-index.md) — 11 cases over 3 election configurations.
