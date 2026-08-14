# Add Voters duplicate-check probe

Reproduces [#1513](https://github.com/Equal-Vote/bettervoting/issues/1513) without a browser.

`add_roll_repro.mjs` transcribes three things **verbatim** from
`packages/frontend/src/components/Election/Admin/AddElectionRoll.tsx` at
`Equal-Vote/bettervoting` `main` @ `7bc75a82` — the row-building loop out of `onSubmit` (`:55`–`:89`),
`duplicatesExist` (`:173`) and `removeDuplicates` (`:158`). Only the React edges are stubbed
(`setSnack`, `confirm`, `postRoll`); `confirm()` is answered by the caller so both the YES and NO
branches can be exercised.

```bash
node add_roll_repro.mjs
```

Recorded output: [`run.out`](run.out). It shows that in admin-managed-voter-ID mode any submission of
2+ rows prompts, YES posts only the first row, and NO posts nothing — while the email mode it was
written for behaves correctly. The last block replays the reporter's session and lands on the roll
counts visible in their screen recording: **2 → 3 → 4 → 5** for submissions of 3, 2 and 1 rows.

**What this does not prove:** that the component calls these functions the way the file reads. That
wiring is still source-read — see [`../../issues/add-voters-duplicate-check-keys-on-email.md`](../../issues/add-voters-duplicate-check-keys-on-email.md)
and the click-through cases
[`BV250a`](../../test_cases/BV250a-voter-id-list-flagged-as-duplicate-emails.md) /
[`BV250b`](../../test_cases/BV250b-duplicate-removal-discards-rows.md).

Method notes: [`../../reference/automation-gotchas.md`](../../reference/automation-gotchas.md) §6.
