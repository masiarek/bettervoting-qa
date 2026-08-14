# BV230 / BV230-r1 - Show Preliminary Results, change back and forth

- [BetterVoting - test cases](https://docs.google.com/spreadsheets/d/1EXQsABY2qEu8kKQJGQdyQHn-C89hbCnNqZoGxKXZJNE/edit?gid=0#gid=0)
- [BetterVoting BPML - Use Case List](https://docs.google.com/spreadsheets/d/1liOfuP3iE4Y5saNRTwB-j5JF42yO7sp9-1owNN4CCtg/edit)
- [Original test-case doc (Google Doc)](https://docs.google.com/document/d/1h4DB3damYBZTE0b7iqUsW9ddxhVQ-9RPlNdfSxbsoP8/edit)
- [Show Preliminary Results - BPML](https://docs.google.com/document/d/1z8iFrGQw-iDQW7aAZYvXb8_BTMy7NvbODtqspqD9Y5g/edit)
- [BV240 index](BV240-index.md) — the disclaimer test set on the same setting

video: <https://youtu.be/X3qxRpC8Teg> (1:02, recorded 2026-10-28 — the error is legible at 0:46)
second video: <https://youtu.be/hRNzGMDr5pc> (the "Make Election Publicly Searchable" variant)
issue: <https://github.com/Equal-Vote/bettervoting/issues/1043>
status: **BV230 — reproduced 2025-10-28. BV230-r1 — PASSED 2026-07-29, not reproducible. Recommended for close.**

# Purpose

Whether an administrator can turn **Show Preliminary Results** on *after* finalizing an election.

It matters because the answer determines what the setting means. If it can only be set before finalizing, then "will this election publish a live tally?" is a decision locked at creation — and the creation wizard makes that decision *for* you, silently, defaulting it on. If it can be changed at any time, the setting is a live control and needs an audit trail. Both readings have been in the product's own help text at different times.

This case is also the origin of two other threads: the [BV240 disclaimer set](BV240-index.md) (what the voter should be told) and issue #1353 (whether changes should be logged or forbidden).

# History

## The original test — 2025-10-28

Configuration: an election created with **Show Preliminary Results inactive**, then finalized, then an attempt to activate the setting.

At the time, the setting lived as a **checkbox inside the full Election Settings modal**, with `CANCEL` / `SAVE` buttons. Saving that modal wrote the *entire election* through `POST /Election/:id/edit`.

**Result — failed:**

```
Error making request: 400: Election is not editable (150259b3)
```

Visible in the video at **0:46**. The frame also shows, in the same modal: `Enable Random Tie-Breakers`, `Enable Voter Groups` and `Customize Emails To Voters` greyed out, while `Show Preliminary Results` was checked and *not* greyed — i.e. the UI offered an edit the backend then refused.

The report was legitimate on two counts: the action failed, and the tooltip at the time promised *"(Administrators can make results public at any time.)"*

Adam also tried **Make Election Publicly Searchable** and got the same error with a different request id (`c34873db`) — recorded in the issue thread and the second video.

The original doc also carried a copy proposal for the same tooltip, which later became part of #1350:

- **As-Is:** "Allows voters to see the results of the election. If enabled while voting is open then voters will be shown to the preliminary results after completing their ballot. High profile elections will usually keep the results hidden, and then reveal them after the election is closed."
- **Should-be:** "Controls whether voters can see election results. When enabled during an open election, voters will see preliminary results after submitting their ballot. High-profile elections typically keep results hidden until the election closes."

## Jon Blauvelt's replies — 2025-10-31

Two corrections that shaped the fix:

1. *"'make publicly searchable' and 'make results public' are two separate options. 'make results public' has its own button below the settings form/modal."* — so there were two different controls, and the one Adam clicked was the one wired to the doomed code path.
2. *"I think the best fix here is to disable the pencil icon for the settings modal like we have for the title/time box once the election is finalized/closed/archived so that it is clear that the settings can no longer be edited instead of just allowing it in the UI and surfacing a backend error."*

## What changed, 2026

Nothing was done as ticket work on #1043. Three separate changes resolved it anyway.

| Change | Effect |
|---|---|
| **`da5122f2`** (2026-04-20) "Use dedicated API hook for public_results toggle and remove open state UI" | The toggle was pulled out of the settings modal onto its own `setPublicResults` endpoint, which never reads `election.state`. The guard that produced the 400 is no longer on the path. |
| `FormControl disabled={election.state !== 'draft'}` in `ElectionSettings.tsx` | Jon's suggestion, landed. On a finalized election every *other* control on the page is greyed out — so the UI no longer offers edits the backend will reject. |
| The tooltip sentence removed | *"(Administrators can make results public at any time.)"* is no longer in any locale file, so the documented contradiction is gone. |
| **`7cbc6079`** (2026-07-27) "Refresh election after setPublicResults / setOpenState" | Fixed a *later* bug on the new path: the write succeeded but the page kept the pre-write value, so the switch appeared to revert when you navigated away and came back. |

The net design is deliberate rather than accidental: `public_results` is the one setting that stays editable after finalize, and the code says so out loud —

```
/* Note: this can't use ElectionSwitchSetting because we need to use the
   results from makePublicResultsRequest as the source of truth */
```

# BV230-r1 — the retest

**2026-07-29 · election [`yyvwrj`](https://bettervoting.com/yyvwrj) · production · PASSED**

## Master data

| Field | Value |
|---|---|
| Method | STAR, 1 race, 3 candidates (A, B, C) |
| Winners | 1 |
| Who can vote | Unrestricted / open link |
| **Show Preliminary Results** | **OFF at creation** — the condition BV230 specifies |
| Allow Voters To Edit Vote | OFF |
| Randomize Candidate Order | ON |
| Start / end time | **none** — deliberately unscheduled |
| Ballots cast | 1 (A=4, B=2, C=3) |

Leaving it unscheduled was deliberate: a future `start_time` is the one configuration that makes an optimistic-concurrency conflict deterministic, so scheduling would have muddied the diagnosis.

## Steps and results

| # | Step | Result |
|---|---|---|
| 1 | Create with the flag OFF | Note the wizard defaults it **ON** — it had to be switched off |
| 2 | Voter view before any change: landing page (admin + incognito), ballot, submit dialog, thank-you page | No results affordance on any surface |
| 3 | Admin → LIVE RESULTS with flag OFF | Placeholder: *"The election admins have not released the results yet. Feel free to swing back later"* — **no tally, not even for the owner** |
| 4 | Finalize | Auto-promoted straight past `finalized` to `open`; sidebar changed `PREVIEW BALLOT` → `LIVE BALLOT` |
| 5 | Settings → flip **Show Preliminary Results** ON | **Worked. No error.** Every other control on the page greyed out |
| 6 | Navigate away and back | Value persisted → `7cbc6079` is deployed |
| 7 | Incognito, not signed in, landing page | **`OR VIEW RESULTS`** now present |
| 8 | Admin → LIVE RESULTS | Tally visible — "A wins", 1 voter, scoring round A=4 C=3 |
| 9 | Anonymous API check | `election.settings.public_results` = `true` |

## The decisive screenshot

The **finalized Settings page**. Support email, the Poll/Election radio, Randomize Candidate Order, Allow Voters To Edit Vote, Confirm That Voter Read Instructions, Use Draggable Ballots for RCV and the rankings selector are **all greyed out** — and `Show Preliminary Results` is the only control still live, toggled on.

One setting editable by design, the rest locked by design. That single frame shows both 2025 proposals implemented, and it means the differential check ("does Randomize Candidate Order still 400?") needs no click — the UI won't offer it.

## Server-side confirmation

```
curl -s https://bettervoting.com/API/Election/yyvwrj | jq '.election.settings'
```

```json
{
  "voter_access": "open",
  "ballot_updates": false,
  "public_results": true,
  "random_candidate_order": true,
  "term_type": "election",
  "max_rankings": 6
}
```

`create_date` `2026-07-30T02:14:33Z`, `update_date` `2026-07-30T02:31:09Z` — 17 minutes apart, the later being the flag flip. Caveat: `update_date` is the last write of *any* kind, not a per-setting timestamp; it happens to be the flip here because the flip was the last write.

# The second problem in the thread

`Make Election Publicly Searchable` threw the same 400 in 2025. It is now **unreachable rather than fixed** — `is_public` has no UI control anywhere in the frontend; it appears only where the creation wizard sets it to `false`. So the edit can't be attempted.

Its strings are orphaned: `tips.is_public` and `election_settings.is_public` have no consumer. Whether the control should return is a separate question, raised in the closing comment and not yet answered.

# Side findings

Neither belongs to BV230. Recorded so they aren't lost.

- **`1 voters`** on the results page — pluralization bug. Trivial, real, unrelated to this case. Deserves its own issue.
- **With the flag off, the results gate refuses the owner too.** The check runs *before* any permission check, so the admin sees the placeholder rather than the tally. This is a good privacy property and worth stating positively rather than as an absence — it's now expected result 6 in [BV240b](BV240b-no-notice-when-flag-off.md). It also refuted a prediction: I had guessed the admin's `LIVE RESULTS` nav item might error in that state and flagged it as a possible UX bug. It doesn't; it's handled deliberately.
- That placeholder is a **hardcoded English string**, not routed through i18n, so it can't fall back correctly for a non-English admin. Same class as [BV240o](BV240o-non-english-fallback.md).
- Minor, not worth filing: the flag-OFF results page still renders the heading "PRELIMINARY RESULTS" above a message saying there aren't any.
- **The toggle is fully bidirectional after finalize** — there is no state guard, so results can be turned on, viewed, and turned back off. That's the "peek then hide" direction, and it's the substance of #1353 and [BV240p](BV240p-flag-flipped-mid-election.md).

# Disposition

- **BV230** — keep the row and the 2025 video as the historical record; set Status to superseded by BV230-r1.
- **BV230-r1** — Passed, `2026_07`, election `yyvwrj`.
- **#1043** — [closing comment posted](https://github.com/Equal-Vote/bettervoting/issues/1043#issuecomment-5125655744). Left open pending a view on the `is_public` half.

# What this case taught the BV240 set

Three things carried forward:

1. **Check the server, not the switch.** The UI and the database disagreed for three months. Every BV240 gate case now includes an anonymous export check.
2. **Navigate away and come back.** The original test couldn't have caught `7cbc6079`'s bug, because looking at the toggle immediately after clicking cannot distinguish a working write from a stale render.
3. **The error string is the whole diagnosis.** `400 Election is not editable` / `409 Concurrent write detected` / `401 permission` each point at a different fix. The frontend surfaces status and detail verbatim in the snackbar, so a screenshot is enough. Table in [`../reference/bv-api-checks.md`](../reference/bv-api-checks.md).
