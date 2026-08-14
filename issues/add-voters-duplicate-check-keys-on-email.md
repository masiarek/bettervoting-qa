# Add Voters: the duplicate check keys on email only — so a voter-ID list is always "duplicates", and all but one row is silently discarded

**Status: UNFILED (ours).** Found 2026-08-14 while reviewing
[#1512](https://github.com/Equal-Vote/bettervoting/issues/1512), whose screen recording documents it
without naming it. No upstream issue covers it — searched *duplicate voter*, *voter roll*, *add
voters*.

**Severity: data loss, silent, on the happy path of every admin-managed-voter-ID election.**

---

## The bug

`packages/frontend/src/components/Election/Admin/AddElectionRoll.tsx`, upstream `main` @ `7bc75a82`
(function last touched 2026-05-21, `afa5c8c4`):

```ts
function duplicatesExist(pendingRolls: RollInput[]): boolean {     // :173
    const seen = new Set<string>();
    for (const roll of pendingRolls) {
        const email = (roll.email || "").trim().toLowerCase();     // only ever email
        if (seen.has(email)) return true;
        ...
```

`removeDuplicates()` (`:158`) keys the same way.

The dialog builds each row from whichever columns are ticked (`:76`–`:88`). In **admin-managed voter
ID** mode only `roll.voter_id` is assigned; `roll.email` stays `undefined`. Every row therefore keys
to the empty string, so:

1. **`duplicatesExist` returns true for any submission of 2 or more rows** — the second row always
   collides with the first. The admin is told *"You entered duplicate emails, which is not supported.
   Would you like us to remove duplicates?"* while the Email checkbox is unticked and no email exists
   anywhere in the input.
2. **Answering YES calls `removeDuplicates`, which keeps one row per key — so exactly one row** — and
   posts it. The other rows are dropped with no message, no count, and no trace.

Answering NO returns from `onSubmit` without posting anything, so the two available answers are
"add one voter" and "add none". There is no path that adds the list.

The CSV import path (`:137`, `:146`) has the same two calls and the same outcome.

## Evidence — the reporter's video on #1512

Screen recording attached to #1512
([user-attachments/effc8f69…](https://github.com/user-attachments/assets/effc8f69-9e02-4473-8e18-c547beb42136)),
40 s, Vivaldi on Android, election `bettervoting.com/44v…` (id truncated by the URL bar).
Mode: **Yes** to a pre-defined voter list, **Admin-managed voter IDs**. The Email checkbox is
unticked in every frame.

| Video time | What is on screen | Roll count |
|---|---|---|
| 0.5 s | Voter table before any of this | **1–2 of 2** (IDs 1, 2) |
| 2–9 s | Types `3`, `4`, `5` into Voter Data — three rows | |
| 12–15 s | SUBMIT, then *"You entered duplicate emails…"* NO / YES | |
| 19.5 s | Back on Manage Voters | **1–3 of 3** (IDs 1, 2, 3) |
| 23–29 s | Second attempt, two rows (`4`, `5`), same prompt, twice | |
| 31 s | | **1–4 of 4** |
| 33–36 s | Third attempt, one row (`5`) | |
| 39 s | | **1–5 of 5** |

Three rows in, one voter added. Then two rows in, one voter added. The reporter ends up entering the
voters one at a time — which reads in the video as a person patiently working around something, and
is why the issue they eventually filed is about the scrollbar.

![Duplicate prompt, in voter-ID mode, with no email anywhere](../test_cases/screenshots/BV250-duplicate-prompt-voter-id-mode.png)

![Before: 1 to 2 of 2](../test_cases/screenshots/BV250-roll-before-2-voters.png)

![After submitting three rows: 1 to 3 of 3](../test_cases/screenshots/BV250-roll-after-3-voters.png)

**What is observed vs. derived.** The prompt, the row counts and the one-voter-per-submission arc are
observed in the video. That `removeDuplicates` keeps *the first* row specifically, and that NO posts
nothing, are read from source — consistent with the counts but not separately demonstrated. Confirm
both when the case is run (BV250a / BV250b).

## Why it has survived

- Email mode is the mode the code was written for, and there it is correct: real email keys, real
  duplicate detection.
- In voter-ID mode the failure is **quiet and plausible**. The admin is told the input was bad, is
  offered a fix, accepts it, and gets a shorter list — which looks like the fix working.
- The roll table shows the result, but an admin who just asked for "duplicates removed" has no reason
  to count.
- It only bites lists of 2 or more rows, and the natural first thing anyone types when trying the
  feature is one row.

## Suggested fix

Key on the columns actually in play rather than on email:

```ts
const rollKey = (roll: RollInput) =>
    [roll.voter_id, roll.email, roll.precinct]
        .map(v => (v || "").trim().toLowerCase())
        .join(" ");
```

Two things worth fixing in the same pass, because they are what made this unreadable to the reporter:

- **The message names the wrong field.** *"duplicate emails"* is hard-coded at `:98` and `:146`; it
  should name the column that actually collided, and it should be an `en.yaml` key like its
  neighbours (`admin_home.clear_voter_roll_confirm`) rather than an English literal in a component.
- **Say what was dropped.** `removeDuplicates` should report the count it removed — *"3 rows, 2
  duplicates removed, 1 voter added"* — so a silent discard becomes a visible one. This is the part
  that turns a wrong prompt into lost data, and it stays wrong even after the key is fixed if
  someone genuinely does paste duplicates.

## Before filing

Per this repo's ground rules this is a plain functional defect, not a guard or access finding, so it
goes straight to a GitHub issue rather than to Slack first. Two things to do before that:

1. **Reproduce live** on a throwaway draft election (BV250a/b) — the repo's own convention is that a
   source-read prediction stays a prediction until a screenshot says otherwise, and two predictions
   in this repo have already been refuted that way.
2. **Cross-reference #1512** rather than commenting on it. It is a different defect on the same
   screen, and the reporter's video is the best evidence for both.
