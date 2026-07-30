# Summary — resolved 2026-07-29

**Verdict: NOT REPRODUCIBLE on current production. BV230 is fixed.**

Retested as **BV230-r1** (<https://bettervoting.com/yyvwrj>) on 2026-07-29. An administrator can now activate "Show Preliminary Results" after finalizing an election, the setting persists, and voters can reach the results. Posted to the issue: [#1043 comment](https://github.com/Equal-Vote/bettervoting/issues/1043#issuecomment-5125655744).

## What the original test found

Recorded 2025-10-28 ([video](https://youtu.be/X3qxRpC8Teg), error visible at 0:46). Back then "Show Preliminary Results" was a checkbox inside the full **Election Settings** modal with `CANCEL`/`SAVE`. Saving that modal wrote the *entire election* through `POST /Election/:id/edit` — the one endpoint that refuses edits once an election leaves draft. So the click failed with:

> Error making request: **400: Election is not editable** (150259b3)

The complaint was legitimate on two counts: the action failed, and the help text at the time promised *"(Administrators can make results public at any time.)"*

## What changed since

All three resolutions proposed in the 2025 thread shipped — independently, none as ticket work, which is why the issue stayed open for nine months.

| Proposed in #1043 | What landed |
|---|---|
| Fix the bug so the setting can be changed at any time | **`da5122f2`** (2026-04-20) — the toggle was pulled out of the settings modal onto its own `setPublicResults` endpoint, which never checks election state. The guard that produced the 400 is no longer on the path. |
| Or change the misleading UI text | The sentence *"(Administrators can make results public at any time.)"* was removed from the tooltip entirely. |
| @JonBlauvelt — disable the settings once finalized, rather than offering an edit the backend rejects | Landed as `FormControl disabled` when state ≠ draft. On a finalized election every other control on the Settings page is greyed out. |

A *later* bug on the new path — the write succeeded but the page kept the old value, so the switch appeared to revert when you navigated away and back — was fixed by **`7cbc6079`** (2026-07-27). Production has it.

## Retest evidence

| Step | Result |
|---|---|
| Created with Show Preliminary Results **OFF**, STAR, 3 candidates, unrestricted, no scheduled start/end | — |
| Voter view before finalizing the change: landing page, ballot, submit dialog, thank-you page | No results link on any surface |
| Finalized | — |
| Settings → flipped Show Preliminary Results **ON** | **Worked. No error.** |
| Navigated away and back | Value persisted — so `7cbc6079` is deployed |
| Incognito, not signed in, landing page | **`OR VIEW RESULTS`** now present |
| Admin → LIVE RESULTS | Tally visible (A wins, 1 voter) |

The single most useful screenshot is the **finalized Settings page**: support email, the Poll/Election radio, Randomize Candidate Order, Allow Voters To Edit Vote, Confirm That Voter Read Instructions, Use Draggable Ballots for RCV and the rankings selector are **all greyed out**, and `Show Preliminary Results` is the only control still live. One setting editable by design, the rest locked by design — exactly the outcome this thread argued for.

## The second problem reported in the thread

"Make Election Publicly Searchable" threw the same `400`. That is now **unreachable rather than fixed** — `is_public` has no UI control anywhere in the frontend; it appears only where the creation wizard sets it to `false`. Its strings are orphaned (`tips.is_public`, `election_settings.is_public`). Whether the control should come back is a separate question, raised in the issue comment.

## Side findings from the retest

Neither belongs to BV230; recording them so they aren't lost.

- **`1 voters`** on the results page — pluralization bug. Trivial, real, worth its own issue.
- With the flag **off**, the results page shows a deliberate placeholder — *"The election admins have not released the results yet. Feel free to swing back later 😊"* — and **the admin can't see the tally either**. That's a good privacy property, worth stating positively: the results gate refuses the owner too, not just voters. The message is a hardcoded English string, so it isn't translated.

## Disposition

- **BV230** — keep the row and the 2025 video as the historical record; set Status to superseded by BV230-r1.
- **BV230-r1** — Passed, `2026_07`, election `yyvwrj`.
- **#1043** — recommended for closing in the posted comment. Left open pending a view on the `is_public` half.
